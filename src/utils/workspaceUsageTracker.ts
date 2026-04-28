/**
 * Workspace Usage Tracker
 * Tracks VS Code Extension interaction with workspaces
 */

import * as vscode from 'vscode';
import { Logger } from './logger';
import {
  readWorkspaceMarker,
  updateWorkspaceMetadata,
  writeWorkspaceMarker,
} from './workspaceMarker';
import { getExtensionVersion } from './constants';

export interface CommandTelemetrySummary {
  workspacePath: string;
  timeWindow: CommandTelemetryTimeWindow;
  windowStartAt: string | null;
  windowEndAt: string;
  totalEvents: number;
  lastCommand: string | null;
  lastCommandAt: string | null;
  lastCommandProps: Record<string, string | number | boolean>;
  commandUsage: Array<{ command: string; count: number }>;
  surfaceBreakdown: CommandTelemetrySurfaceBreakdown;
}

export interface CommandTelemetrySurfaceBreakdown {
  actionEvents: number;
  askEvents: number;
  actionVsAskShare: number | null;
  bySurface: Array<{
    surface: 'action' | 'chat' | 'aimodal' | 'onboarding' | 'other';
    count: number;
    share: number;
  }>;
}

export interface OnboardingExperimentVariantStats {
  variant: string;
  shown: number;
  clicked: number;
  dismissed: number;
  clickThroughRate: number;
}

export interface OnboardingExperimentStats {
  workspacePath: string;
  timeWindow: CommandTelemetryTimeWindow;
  windowStartAt: string | null;
  windowEndAt: string;
  primaryShown: number;
  primaryActionCounts: Array<{ action: string; count: number }>;
  followupShown: number;
  followupClicked: number;
  followupDismissed: number;
  overallFollowupClickThroughRate: number;
  variants: OnboardingExperimentVariantStats[];
}

export interface StudioCtaVariantStats {
  variant: string;
  loopStarted: number;
  nextActionClicked: number;
  actionExecuted: number;
  verifyPassed: number;
  verifyFailed: number;
  verifyCompletionRate: number | null;
  actionVsAskShare: number | null;
  loopCompleted: number;
  abandoned: number;
}

export interface StudioCtaVariantBreakdown {
  workspacePath: string;
  timeWindow: CommandTelemetryTimeWindow;
  windowStartAt: string | null;
  windowEndAt: string;
  variants: StudioCtaVariantStats[];
}

export interface StudioHardGateThresholds {
  verifyPhaseReachMin: number;
  bridgeRouteCompletionMin: number;
}

export interface StudioHardGateStatus {
  workspacePath: string;
  timeWindow: CommandTelemetryTimeWindow;
  windowStartAt: string | null;
  windowEndAt: string;
  thresholds: StudioHardGateThresholds;
  metrics: {
    loopStarted: number;
    nextActionClicked: number;
    actionExecuted: number;
    verifyOutcomes: number;
    verifyPhaseReach: number | null;
    bridgeRouteCompletionRate: number | null;
  };
  gates: {
    verifyPhaseReachPass: boolean;
    bridgeRouteCompletionPass: boolean;
    telemetryEvidencePass: boolean;
    overallPass: boolean;
  };
}

export interface StudioPredictionKpiThresholds {
  predictivePrecisionMin: number;
  falseAlarmRateMax: number;
  preventedIncidentRateMin: number;
}

export interface StudioPredictionKpiStatus {
  workspacePath: string;
  timeWindow: CommandTelemetryTimeWindow;
  windowStartAt: string | null;
  windowEndAt: string;
  thresholds: StudioPredictionKpiThresholds;
  metrics: {
    predictionShown: number;
    predictionAccepted: number;
    predictionVerified: number;
    predictionFalsified: number;
    predictionIgnored: number;
    predictivePrecision: number | null;
    falseAlarmRate: number | null;
    preventedIncidentRate: number | null;
    acceptanceRate: number | null;
    verificationCoverage: number | null;
  };
  gates: {
    telemetryEvidencePass: boolean;
    predictivePrecisionPass: boolean;
    falseAlarmRatePass: boolean;
    preventedIncidentRatePass: boolean;
    overallPass: boolean;
  };
}

export type CommandTelemetryTimeWindow = 'all' | 'last24h' | 'last7d';

type TelemetrySurface = 'action' | 'chat' | 'aimodal' | 'onboarding' | 'other';

interface TelemetryCommandEvent {
  command: string;
  at: string;
  props?: Record<string, string | number | boolean>;
}

interface TelemetryHourlyUsageBucket {
  hour: string;
  usage: Record<string, number>;
}

interface OnboardingTelemetryAggregate {
  primaryShown: number;
  primaryActionUsage: Record<string, number>;
  followupShownByVariant: Record<string, number>;
  followupClickedByVariant: Record<string, number>;
  followupDismissedByVariant: Record<string, number>;
}

interface OnboardingTelemetryHourlyUsageBucket {
  hour: string;
  aggregate: OnboardingTelemetryAggregate;
}

interface TelemetrySurfaceAllowlistRule {
  surface: Exclude<TelemetrySurface, 'other'>;
  pattern: RegExp;
}

const MAX_RECENT_COMMAND_EVENTS = 500;
const MAX_HOURLY_USAGE_BUCKETS = 24 * 14;

const TELEMETRY_SURFACE_ORDER: TelemetrySurface[] = [
  'action',
  'chat',
  'aimodal',
  'onboarding',
  'other',
];

const TELEMETRY_SURFACE_ALLOWLIST: TelemetrySurfaceAllowlistRule[] = [
  {
    surface: 'action',
    pattern:
      /^workspai\.ai(Orchestrate|QuickActions|FixPreviewLite|ChangeImpactLite|TerminalBridge|WorkspaceMemoryWizard|RecipePacks|ForWorkspace|ForProject|ForModule|CreateProject)$/,
  },
  {
    surface: 'chat',
    pattern: /^workspai\.chat\.(ask|debug)$/,
  },
  {
    surface: 'aimodal',
    pattern: /^workspai\.aimodal\.(ask|debug)$/,
  },
  {
    surface: 'onboarding',
    pattern:
      /^workspai\.onboarding\.(primary\.shown|primary\.action|followup\.shown|followup\.action)$/,
  },
  {
    surface: 'action',
    pattern:
      /^workspai\.studio\.(loop_started|next_action_clicked|action_executed|verify_passed|verify_failed|loop_completed|abandoned|prediction_shown|prediction_accepted|prediction_verified|prediction_falsified)$/,
  },
];

export class WorkspaceUsageTracker {
  private static instance: WorkspaceUsageTracker;
  private logger: Logger;
  private trackedWorkspaces = new Set<string>();
  private commandTelemetryWriteQueue = new Map<string, Promise<void>>();
  private unknownTelemetrySurfaceCommands = new Set<string>();

  private constructor() {
    this.logger = Logger.getInstance();
  }

  static getInstance(): WorkspaceUsageTracker {
    if (!WorkspaceUsageTracker.instance) {
      WorkspaceUsageTracker.instance = new WorkspaceUsageTracker();
    }
    return WorkspaceUsageTracker.instance;
  }

  private sanitizeTelemetryProps(
    properties: Record<string, unknown> | undefined
  ): Record<string, string | number | boolean> {
    if (!properties) {
      return {};
    }

    const sanitized: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(properties)) {
      if (value === null || value === undefined) {
        continue;
      }
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private resolveWorkspacePath(preferredWorkspacePath?: string): string | null {
    if (preferredWorkspacePath) {
      return preferredWorkspacePath;
    }

    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      const folder = vscode.workspace.getWorkspaceFolder(activeEditor.document.uri);
      if (folder) {
        return folder.uri.fsPath;
      }
    }

    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
  }

  private parseRecentEvents(value: unknown): TelemetryCommandEvent[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return null;
        }
        const record = item as Record<string, unknown>;
        const command = typeof record.command === 'string' ? record.command : '';
        const at = typeof record.at === 'string' ? record.at : '';
        if (!command || !at || Number.isNaN(Date.parse(at))) {
          return null;
        }

        const propsRaw = record.props;
        const sanitizedProps =
          propsRaw && typeof propsRaw === 'object'
            ? this.sanitizeTelemetryProps(propsRaw as Record<string, unknown>)
            : undefined;

        return {
          command,
          at,
          ...(sanitizedProps && Object.keys(sanitizedProps).length > 0
            ? { props: sanitizedProps }
            : {}),
        } satisfies TelemetryCommandEvent;
      })
      .filter((entry): entry is TelemetryCommandEvent => entry !== null)
      .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  }

  private getWindowStartMs(timeWindow: CommandTelemetryTimeWindow, nowMs: number): number | null {
    if (timeWindow === 'last24h') {
      return nowMs - 24 * 60 * 60 * 1000;
    }
    if (timeWindow === 'last7d') {
      return nowMs - 7 * 24 * 60 * 60 * 1000;
    }
    return null;
  }

  private toHourBucketIso(timeMs: number): string {
    const date = new Date(timeMs);
    date.setUTCMinutes(0, 0, 0);
    return date.toISOString();
  }

  private parseHourlyUsage(value: unknown): TelemetryHourlyUsageBucket[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return null;
        }

        const record = item as Record<string, unknown>;
        const hour = typeof record.hour === 'string' ? record.hour : '';
        if (!hour || Number.isNaN(Date.parse(hour))) {
          return null;
        }

        const usageRaw = record.usage;
        if (!usageRaw || typeof usageRaw !== 'object') {
          return null;
        }

        const usageEntries = Object.entries(usageRaw as Record<string, unknown>)
          .map(([command, count]) => ({
            command,
            count: typeof count === 'number' && Number.isFinite(count) ? count : 0,
          }))
          .filter((entry) => entry.command.length > 0 && entry.count > 0);

        if (usageEntries.length === 0) {
          return null;
        }

        const usage: Record<string, number> = {};
        for (const entry of usageEntries) {
          usage[entry.command] = entry.count;
        }

        return { hour, usage } satisfies TelemetryHourlyUsageBucket;
      })
      .filter((entry): entry is TelemetryHourlyUsageBucket => entry !== null)
      .sort((a, b) => Date.parse(a.hour) - Date.parse(b.hour));
  }

  private toPositiveInteger(value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      return 0;
    }
    return Math.floor(value);
  }

  private sanitizeCountMap(value: unknown): Record<string, number> {
    if (!value || typeof value !== 'object') {
      return {};
    }

    const sanitized: Record<string, number> = {};
    for (const [rawKey, rawCount] of Object.entries(value as Record<string, unknown>)) {
      const key = rawKey.trim();
      const count = this.toPositiveInteger(rawCount);
      if (!key || count <= 0) {
        continue;
      }
      sanitized[key] = count;
    }

    return sanitized;
  }

  private createEmptyOnboardingTelemetryAggregate(): OnboardingTelemetryAggregate {
    return {
      primaryShown: 0,
      primaryActionUsage: {},
      followupShownByVariant: {},
      followupClickedByVariant: {},
      followupDismissedByVariant: {},
    };
  }

  private parseOnboardingTelemetryAggregate(value: unknown): OnboardingTelemetryAggregate {
    if (!value || typeof value !== 'object') {
      return this.createEmptyOnboardingTelemetryAggregate();
    }

    const record = value as Record<string, unknown>;
    return {
      primaryShown: this.toPositiveInteger(record.primaryShown),
      primaryActionUsage: this.sanitizeCountMap(record.primaryActionUsage),
      followupShownByVariant: this.sanitizeCountMap(record.followupShownByVariant),
      followupClickedByVariant: this.sanitizeCountMap(record.followupClickedByVariant),
      followupDismissedByVariant: this.sanitizeCountMap(record.followupDismissedByVariant),
    };
  }

  private hasOnboardingTelemetryData(aggregate: OnboardingTelemetryAggregate): boolean {
    return (
      aggregate.primaryShown > 0 ||
      Object.keys(aggregate.primaryActionUsage).length > 0 ||
      Object.keys(aggregate.followupShownByVariant).length > 0 ||
      Object.keys(aggregate.followupClickedByVariant).length > 0 ||
      Object.keys(aggregate.followupDismissedByVariant).length > 0
    );
  }

  private mergeCountMaps(
    base: Record<string, number>,
    delta: Record<string, number>
  ): Record<string, number> {
    const merged = { ...base };
    for (const [key, count] of Object.entries(delta)) {
      merged[key] = (merged[key] ?? 0) + count;
    }
    return merged;
  }

  private mergeOnboardingTelemetryAggregates(
    base: OnboardingTelemetryAggregate,
    delta: OnboardingTelemetryAggregate
  ): OnboardingTelemetryAggregate {
    return {
      primaryShown: base.primaryShown + delta.primaryShown,
      primaryActionUsage: this.mergeCountMaps(base.primaryActionUsage, delta.primaryActionUsage),
      followupShownByVariant: this.mergeCountMaps(
        base.followupShownByVariant,
        delta.followupShownByVariant
      ),
      followupClickedByVariant: this.mergeCountMaps(
        base.followupClickedByVariant,
        delta.followupClickedByVariant
      ),
      followupDismissedByVariant: this.mergeCountMaps(
        base.followupDismissedByVariant,
        delta.followupDismissedByVariant
      ),
    };
  }

  private parseOnboardingHourlyUsage(value: unknown): OnboardingTelemetryHourlyUsageBucket[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return null;
        }

        const record = item as Record<string, unknown>;
        const hour = typeof record.hour === 'string' ? record.hour : '';
        if (!hour || Number.isNaN(Date.parse(hour))) {
          return null;
        }

        const aggregate = this.parseOnboardingTelemetryAggregate(record.aggregate);
        if (!this.hasOnboardingTelemetryData(aggregate)) {
          return null;
        }

        return {
          hour,
          aggregate,
        } satisfies OnboardingTelemetryHourlyUsageBucket;
      })
      .filter((entry): entry is OnboardingTelemetryHourlyUsageBucket => entry !== null)
      .sort((a, b) => Date.parse(a.hour) - Date.parse(b.hour));
  }

  private extractOnboardingTelemetryDelta(
    command: string,
    props: Record<string, string | number | boolean>
  ): OnboardingTelemetryAggregate | null {
    const delta = this.createEmptyOnboardingTelemetryAggregate();

    if (command === 'workspai.onboarding.primary.shown') {
      delta.primaryShown = 1;
      return delta;
    }

    if (command === 'workspai.onboarding.primary.action') {
      const action =
        typeof props.action === 'string' && props.action.trim().length > 0
          ? props.action.trim()
          : 'unknown';
      delta.primaryActionUsage[action] = 1;
      return delta;
    }

    if (command === 'workspai.onboarding.followup.shown') {
      const variant =
        typeof props.variant === 'string' && props.variant.trim().length > 0
          ? props.variant.trim()
          : 'unknown';
      delta.followupShownByVariant[variant] = 1;
      return delta;
    }

    if (command === 'workspai.onboarding.followup.action') {
      const action =
        typeof props.action === 'string' && props.action.trim().length > 0
          ? props.action.trim()
          : 'unknown';
      const variant =
        typeof props.variant === 'string' && props.variant.trim().length > 0
          ? props.variant.trim()
          : 'unknown';

      if (action === 'open-ai-flows') {
        delta.followupClickedByVariant[variant] = 1;
      } else if (action === 'dismissed') {
        delta.followupDismissedByVariant[variant] = 1;
      }

      return this.hasOnboardingTelemetryData(delta) ? delta : null;
    }

    return null;
  }

  private mergeOnboardingHourlyUsage(
    existingBuckets: OnboardingTelemetryHourlyUsageBucket[],
    delta: OnboardingTelemetryAggregate,
    atIso: string
  ): OnboardingTelemetryHourlyUsageBucket[] {
    const hourIso = this.toHourBucketIso(Date.parse(atIso));
    const buckets = existingBuckets.map((bucket) => ({
      hour: bucket.hour,
      aggregate: this.parseOnboardingTelemetryAggregate(bucket.aggregate),
    }));

    const existingBucket = buckets.find((bucket) => bucket.hour === hourIso);
    if (existingBucket) {
      existingBucket.aggregate = this.mergeOnboardingTelemetryAggregates(
        existingBucket.aggregate,
        delta
      );
    } else {
      buckets.push({ hour: hourIso, aggregate: delta });
    }

    buckets.sort((a, b) => Date.parse(a.hour) - Date.parse(b.hour));
    return buckets.slice(-MAX_HOURLY_USAGE_BUCKETS);
  }

  private buildOnboardingAggregateFromHourlyBuckets(
    hourlyBuckets: OnboardingTelemetryHourlyUsageBucket[],
    windowStartMs: number,
    windowEndMs: number
  ): OnboardingTelemetryAggregate {
    let aggregate = this.createEmptyOnboardingTelemetryAggregate();

    for (const bucket of hourlyBuckets) {
      const hourMs = Date.parse(bucket.hour);
      if (Number.isNaN(hourMs) || hourMs < windowStartMs || hourMs > windowEndMs) {
        continue;
      }

      aggregate = this.mergeOnboardingTelemetryAggregates(aggregate, bucket.aggregate);
    }

    return aggregate;
  }

  private buildOnboardingAggregateFromEvents(
    events: TelemetryCommandEvent[]
  ): OnboardingTelemetryAggregate {
    let aggregate = this.createEmptyOnboardingTelemetryAggregate();

    for (const event of events) {
      const delta = this.extractOnboardingTelemetryDelta(event.command, event.props ?? {});
      if (!delta) {
        continue;
      }

      aggregate = this.mergeOnboardingTelemetryAggregates(aggregate, delta);
    }

    return aggregate;
  }

  private buildOnboardingVariantStats(
    aggregate: OnboardingTelemetryAggregate
  ): OnboardingExperimentVariantStats[] {
    const variantSet = new Set<string>([
      ...Object.keys(aggregate.followupShownByVariant),
      ...Object.keys(aggregate.followupClickedByVariant),
      ...Object.keys(aggregate.followupDismissedByVariant),
    ]);

    const preferredVariantOrder = new Map<string, number>([
      ['control', 0],
      ['compact', 1],
    ]);

    return [...variantSet]
      .map((variant) => {
        const shown = aggregate.followupShownByVariant[variant] ?? 0;
        const clicked = aggregate.followupClickedByVariant[variant] ?? 0;
        const dismissed = aggregate.followupDismissedByVariant[variant] ?? 0;
        return {
          variant,
          shown,
          clicked,
          dismissed,
          clickThroughRate: shown > 0 ? Number(((clicked / shown) * 100).toFixed(2)) : 0,
        };
      })
      .sort((a, b) => {
        const aOrder = preferredVariantOrder.get(a.variant) ?? 100;
        const bOrder = preferredVariantOrder.get(b.variant) ?? 100;
        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }
        return a.variant.localeCompare(b.variant);
      });
  }

  private mergeHourlyUsage(
    existingBuckets: TelemetryHourlyUsageBucket[],
    command: string,
    atIso: string
  ): TelemetryHourlyUsageBucket[] {
    const hourIso = this.toHourBucketIso(Date.parse(atIso));
    const buckets = existingBuckets.map((bucket) => ({
      hour: bucket.hour,
      usage: { ...bucket.usage },
    }));

    const existingBucket = buckets.find((bucket) => bucket.hour === hourIso);
    if (existingBucket) {
      existingBucket.usage[command] = (existingBucket.usage[command] ?? 0) + 1;
    } else {
      buckets.push({ hour: hourIso, usage: { [command]: 1 } });
    }

    buckets.sort((a, b) => Date.parse(a.hour) - Date.parse(b.hour));
    return buckets.slice(-MAX_HOURLY_USAGE_BUCKETS);
  }

  private buildUsageFromHourlyBuckets(
    hourlyBuckets: TelemetryHourlyUsageBucket[],
    windowStartMs: number,
    windowEndMs: number
  ): Map<string, number> {
    const usageMap = new Map<string, number>();

    for (const bucket of hourlyBuckets) {
      const hourMs = Date.parse(bucket.hour);
      if (Number.isNaN(hourMs) || hourMs < windowStartMs || hourMs > windowEndMs) {
        continue;
      }

      for (const [command, count] of Object.entries(bucket.usage)) {
        usageMap.set(command, (usageMap.get(command) ?? 0) + count);
      }
    }

    return usageMap;
  }

  private async enqueueCommandTelemetryWrite(
    workspacePath: string,
    writeTask: () => Promise<void>
  ): Promise<void> {
    const previous = this.commandTelemetryWriteQueue.get(workspacePath) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(writeTask);
    this.commandTelemetryWriteQueue.set(workspacePath, next);

    try {
      await next;
    } finally {
      if (this.commandTelemetryWriteQueue.get(workspacePath) === next) {
        this.commandTelemetryWriteQueue.delete(workspacePath);
      }
    }
  }

  private getTelemetrySurface(command: string): TelemetrySurface {
    for (const rule of TELEMETRY_SURFACE_ALLOWLIST) {
      if (rule.pattern.test(command)) {
        return rule.surface;
      }
    }

    // Controlled fallback for known families while action stays strict allowlist-based.
    if (command.startsWith('workspai.chat.')) {
      return 'chat';
    }
    if (command.startsWith('workspai.aimodal.')) {
      return 'aimodal';
    }
    if (command.startsWith('workspai.onboarding.')) {
      return 'onboarding';
    }

    if (command.startsWith('workspai.ai') && !this.unknownTelemetrySurfaceCommands.has(command)) {
      this.unknownTelemetrySurfaceCommands.add(command);
      this.logger.debug(`Unclassified AI telemetry command treated as other surface: ${command}`);
    }

    return 'other';
  }

  private buildSurfaceBreakdown(
    commandUsage: Array<{ command: string; count: number }>,
    totalEvents: number
  ): CommandTelemetrySurfaceBreakdown {
    const countsBySurface = new Map<TelemetrySurface, number>();

    for (const surface of TELEMETRY_SURFACE_ORDER) {
      countsBySurface.set(surface, 0);
    }

    for (const entry of commandUsage) {
      const surface = this.getTelemetrySurface(entry.command);
      countsBySurface.set(surface, (countsBySurface.get(surface) ?? 0) + entry.count);
    }

    const actionEvents = countsBySurface.get('action') ?? 0;
    const askEvents = (countsBySurface.get('chat') ?? 0) + (countsBySurface.get('aimodal') ?? 0);
    const actionVsAskBase = actionEvents + askEvents;

    const bySurface = TELEMETRY_SURFACE_ORDER.map((surface) => {
      const count = countsBySurface.get(surface) ?? 0;
      return {
        surface,
        count,
        share: totalEvents > 0 ? Number(((count / totalEvents) * 100).toFixed(2)) : 0,
      };
    });

    return {
      actionEvents,
      askEvents,
      actionVsAskShare:
        actionVsAskBase > 0 ? Number(((actionEvents / actionVsAskBase) * 100).toFixed(2)) : null,
      bySurface,
    };
  }

  /**
   * Lightweight command telemetry persisted in workspace marker metadata.
   * This is local usage telemetry used for feature adoption insight.
   */
  async trackCommandEvent(
    command: string,
    preferredWorkspacePath?: string,
    properties?: Record<string, unknown>
  ): Promise<void> {
    const workspacePath = this.resolveWorkspacePath(preferredWorkspacePath);
    if (!workspacePath) {
      return;
    }

    try {
      await this.enqueueCommandTelemetryWrite(workspacePath, async () => {
        const marker = await readWorkspaceMarker(workspacePath);
        if (!marker) {
          return;
        }

        const custom = marker.metadata?.custom ?? {};
        const existingTelemetryRaw = custom.workspaiTelemetry;
        const existingTelemetry =
          existingTelemetryRaw && typeof existingTelemetryRaw === 'object'
            ? (existingTelemetryRaw as Record<string, unknown>)
            : {};

        const usageRaw = existingTelemetry.commandUsage;
        const usage =
          usageRaw && typeof usageRaw === 'object'
            ? { ...(usageRaw as Record<string, unknown>) }
            : {};

        const currentCount = typeof usage[command] === 'number' ? (usage[command] as number) : 0;
        usage[command] = currentCount + 1;

        const recentEvents = this.parseRecentEvents(existingTelemetry.recentEvents);
        const hourlyUsage = this.parseHourlyUsage(existingTelemetry.hourlyUsage);
        const onboardingAggregate = this.parseOnboardingTelemetryAggregate(
          existingTelemetry.onboardingAggregate
        );
        const onboardingHourlyUsage = this.parseOnboardingHourlyUsage(
          existingTelemetry.onboardingHourlyUsage
        );
        const sanitizedProps = this.sanitizeTelemetryProps(properties);
        const onboardingDelta = this.extractOnboardingTelemetryDelta(command, sanitizedProps);

        const now = new Date().toISOString();
        const nextEvent: TelemetryCommandEvent = {
          command,
          at: now,
          ...(Object.keys(sanitizedProps).length > 0 ? { props: sanitizedProps } : {}),
        };
        const nextRecentEvents = [...recentEvents, nextEvent].slice(-MAX_RECENT_COMMAND_EVENTS);
        const nextHourlyUsage = this.mergeHourlyUsage(hourlyUsage, command, now);
        const nextOnboardingAggregate = onboardingDelta
          ? this.mergeOnboardingTelemetryAggregates(onboardingAggregate, onboardingDelta)
          : onboardingAggregate;
        const nextOnboardingHourlyUsage = onboardingDelta
          ? this.mergeOnboardingHourlyUsage(onboardingHourlyUsage, onboardingDelta, now)
          : onboardingHourlyUsage;

        const nextTelemetry: Record<string, unknown> = {
          ...existingTelemetry,
          commandUsage: usage,
          recentEvents: nextRecentEvents,
          hourlyUsage: nextHourlyUsage,
          ...(this.hasOnboardingTelemetryData(nextOnboardingAggregate)
            ? { onboardingAggregate: nextOnboardingAggregate }
            : {}),
          ...(nextOnboardingHourlyUsage.length > 0
            ? { onboardingHourlyUsage: nextOnboardingHourlyUsage }
            : {}),
          lastCommand: command,
          lastCommandAt: now,
          lastCommandProps: sanitizedProps,
        };

        await updateWorkspaceMetadata(workspacePath, {
          custom: {
            ...custom,
            workspaiTelemetry: nextTelemetry,
          },
        });

        this.logger.debug(
          `Tracked command event: ${command} (count: ${currentCount + 1}) in ${workspacePath}`
        );
      });
    } catch (error) {
      this.logger.debug(`Failed to track command event (${command}): ${error}`);
    }
  }

  /**
   * Returns local command telemetry summary for developer inspection.
   * Reads from workspace marker metadata.custom.workspaiTelemetry.
   */
  async getCommandTelemetrySummary(
    preferredWorkspacePath?: string,
    timeWindow: CommandTelemetryTimeWindow = 'all'
  ): Promise<CommandTelemetrySummary | null> {
    const workspacePath = this.resolveWorkspacePath(preferredWorkspacePath);
    if (!workspacePath) {
      return null;
    }

    try {
      const marker = await readWorkspaceMarker(workspacePath);
      if (!marker) {
        return null;
      }

      const telemetryRaw = marker.metadata?.custom?.workspaiTelemetry;
      const telemetry =
        telemetryRaw && typeof telemetryRaw === 'object'
          ? (telemetryRaw as Record<string, unknown>)
          : {};

      const recentEvents = this.parseRecentEvents(telemetry.recentEvents);
      const hourlyUsage = this.parseHourlyUsage(telemetry.hourlyUsage);
      const nowMs = Date.now();
      const windowStartMs = this.getWindowStartMs(timeWindow, nowMs);

      const filteredRecentEvents =
        windowStartMs === null
          ? recentEvents
          : recentEvents.filter((entry) => Date.parse(entry.at) >= windowStartMs);

      const usageRaw = telemetry.commandUsage;
      const usageEntries =
        usageRaw && typeof usageRaw === 'object'
          ? Object.entries(usageRaw as Record<string, unknown>)
          : [];

      const allTimeUsage = usageEntries
        .map(([command, count]) => ({
          command,
          count: typeof count === 'number' && Number.isFinite(count) ? count : 0,
        }))
        .filter((entry) => entry.count > 0)
        .sort((a, b) => b.count - a.count || a.command.localeCompare(b.command));

      const filteredUsageMap = new Map<string, number>();
      if (windowStartMs !== null && hourlyUsage.length > 0) {
        const hourlyMap = this.buildUsageFromHourlyBuckets(hourlyUsage, windowStartMs, nowMs);
        for (const [command, count] of hourlyMap.entries()) {
          filteredUsageMap.set(command, count);
        }
      } else {
        for (const event of filteredRecentEvents) {
          const current = filteredUsageMap.get(event.command) ?? 0;
          filteredUsageMap.set(event.command, current + 1);
        }
      }

      const filteredUsage = [...filteredUsageMap.entries()]
        .map(([command, count]) => ({ command, count }))
        .sort((a, b) => b.count - a.count || a.command.localeCompare(b.command));

      const commandUsage = timeWindow === 'all' ? allTimeUsage : filteredUsage;
      const totalEvents = commandUsage.reduce((sum, entry) => sum + entry.count, 0);
      const surfaceBreakdown = this.buildSurfaceBreakdown(commandUsage, totalEvents);

      const lastEvent =
        timeWindow === 'all'
          ? recentEvents[recentEvents.length - 1]
          : filteredRecentEvents[filteredRecentEvents.length - 1];

      return {
        workspacePath,
        timeWindow,
        windowStartAt: windowStartMs === null ? null : new Date(windowStartMs).toISOString(),
        windowEndAt: new Date(nowMs).toISOString(),
        totalEvents,
        lastCommand: lastEvent?.command ?? null,
        lastCommandAt: lastEvent?.at ?? null,
        lastCommandProps: this.sanitizeTelemetryProps(
          telemetry.lastCommandProps as Record<string, unknown> | undefined
        ),
        commandUsage,
        surfaceBreakdown,
      };
    } catch (error) {
      this.logger.debug(`Failed to read command telemetry summary: ${error}`);
      return null;
    }
  }

  /**
   * Returns onboarding A/B experiment stats from aggregate/hourly telemetry with event fallback.
   */
  async getOnboardingExperimentStats(
    preferredWorkspacePath?: string,
    timeWindow: CommandTelemetryTimeWindow = 'all'
  ): Promise<OnboardingExperimentStats | null> {
    const workspacePath = this.resolveWorkspacePath(preferredWorkspacePath);
    if (!workspacePath) {
      return null;
    }

    try {
      const marker = await readWorkspaceMarker(workspacePath);
      if (!marker) {
        return null;
      }

      const telemetryRaw = marker.metadata?.custom?.workspaiTelemetry;
      const telemetry =
        telemetryRaw && typeof telemetryRaw === 'object'
          ? (telemetryRaw as Record<string, unknown>)
          : {};

      const recentEvents = this.parseRecentEvents(telemetry.recentEvents);
      const onboardingAggregate = this.parseOnboardingTelemetryAggregate(
        telemetry.onboardingAggregate
      );
      const onboardingHourlyUsage = this.parseOnboardingHourlyUsage(
        telemetry.onboardingHourlyUsage
      );
      const nowMs = Date.now();
      const windowStartMs = this.getWindowStartMs(timeWindow, nowMs);

      const filteredRecentEvents =
        windowStartMs === null
          ? recentEvents
          : recentEvents.filter((entry) => Date.parse(entry.at) >= windowStartMs);

      let selectedAggregate = this.createEmptyOnboardingTelemetryAggregate();
      if (timeWindow === 'all') {
        selectedAggregate = this.hasOnboardingTelemetryData(onboardingAggregate)
          ? onboardingAggregate
          : this.buildOnboardingAggregateFromEvents(recentEvents);
      } else if (windowStartMs !== null && onboardingHourlyUsage.length > 0) {
        selectedAggregate = this.buildOnboardingAggregateFromHourlyBuckets(
          onboardingHourlyUsage,
          windowStartMs,
          nowMs
        );

        // Fallback for old markers where buckets may not exist for this interval yet.
        if (
          !this.hasOnboardingTelemetryData(selectedAggregate) &&
          filteredRecentEvents.length > 0
        ) {
          selectedAggregate = this.buildOnboardingAggregateFromEvents(filteredRecentEvents);
        }
      } else {
        selectedAggregate = this.buildOnboardingAggregateFromEvents(filteredRecentEvents);
      }

      const variants = this.buildOnboardingVariantStats(selectedAggregate);

      const followupShown = variants.reduce((sum, item) => sum + item.shown, 0);
      const followupClicked = variants.reduce((sum, item) => sum + item.clicked, 0);
      const followupDismissed = variants.reduce((sum, item) => sum + item.dismissed, 0);

      const sortedPrimaryActions = Object.entries(selectedAggregate.primaryActionUsage)
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count || a.action.localeCompare(b.action));

      return {
        workspacePath,
        timeWindow,
        windowStartAt: windowStartMs === null ? null : new Date(windowStartMs).toISOString(),
        windowEndAt: new Date(nowMs).toISOString(),
        primaryShown: selectedAggregate.primaryShown,
        primaryActionCounts: sortedPrimaryActions,
        followupShown,
        followupClicked,
        followupDismissed,
        overallFollowupClickThroughRate:
          followupShown > 0 ? Number(((followupClicked / followupShown) * 100).toFixed(2)) : 0,
        variants,
      };
    } catch (error) {
      this.logger.debug(`Failed to read onboarding experiment stats: ${error}`);
      return null;
    }
  }

  /**
   * Returns Incident Studio KPI breakdown grouped by CTA experiment variant.
   * Uses event props.ctaVariant tracked on workspai.studio.* command events.
   */
  async getStudioCtaVariantBreakdown(
    preferredWorkspacePath?: string,
    timeWindow: CommandTelemetryTimeWindow = 'last7d'
  ): Promise<StudioCtaVariantBreakdown | null> {
    const workspacePath = this.resolveWorkspacePath(preferredWorkspacePath);
    if (!workspacePath) {
      return null;
    }

    try {
      const marker = await readWorkspaceMarker(workspacePath);
      if (!marker) {
        return null;
      }

      const telemetryRaw = marker.metadata?.custom?.workspaiTelemetry;
      const telemetry =
        telemetryRaw && typeof telemetryRaw === 'object'
          ? (telemetryRaw as Record<string, unknown>)
          : {};

      const recentEvents = this.parseRecentEvents(telemetry.recentEvents);
      const nowMs = Date.now();
      const windowStartMs = this.getWindowStartMs(timeWindow, nowMs);
      const filteredRecentEvents =
        windowStartMs === null
          ? recentEvents
          : recentEvents.filter((entry) => Date.parse(entry.at) >= windowStartMs);

      const studioEvents = filteredRecentEvents.filter((entry) =>
        entry.command.startsWith('workspai.studio.')
      );

      const aggregate = new Map<string, StudioCtaVariantStats>();
      const ensureVariant = (variant: string) => {
        const key = variant.trim() || 'unknown';
        const existing = aggregate.get(key);
        if (existing) {
          return existing;
        }
        const created: StudioCtaVariantStats = {
          variant: key,
          loopStarted: 0,
          nextActionClicked: 0,
          actionExecuted: 0,
          verifyPassed: 0,
          verifyFailed: 0,
          verifyCompletionRate: null,
          actionVsAskShare: null,
          loopCompleted: 0,
          abandoned: 0,
        };
        aggregate.set(key, created);
        return created;
      };

      for (const entry of studioEvents) {
        const variantProp = entry.props?.ctaVariant;
        const variant = typeof variantProp === 'string' ? variantProp : 'unknown';
        const bucket = ensureVariant(variant);

        if (entry.command === 'workspai.studio.loop_started') {
          bucket.loopStarted += 1;
        } else if (entry.command === 'workspai.studio.next_action_clicked') {
          bucket.nextActionClicked += 1;
        } else if (entry.command === 'workspai.studio.action_executed') {
          bucket.actionExecuted += 1;
        } else if (entry.command === 'workspai.studio.verify_passed') {
          bucket.verifyPassed += 1;
        } else if (entry.command === 'workspai.studio.verify_failed') {
          bucket.verifyFailed += 1;
        } else if (entry.command === 'workspai.studio.loop_completed') {
          bucket.loopCompleted += 1;
        } else if (entry.command === 'workspai.studio.abandoned') {
          bucket.abandoned += 1;
        }
      }

      const variants = [...aggregate.values()]
        .map((item) => {
          const verifyOutcomes = item.verifyPassed + item.verifyFailed;
          const actionAskBase = item.actionExecuted + item.nextActionClicked;
          return {
            ...item,
            verifyCompletionRate:
              item.actionExecuted > 0
                ? Number(((verifyOutcomes / item.actionExecuted) * 100).toFixed(2))
                : null,
            actionVsAskShare:
              actionAskBase > 0
                ? Number(((item.actionExecuted / actionAskBase) * 100).toFixed(2))
                : null,
          };
        })
        .sort((a, b) => {
          const order = new Map<string, number>([
            ['single', 0],
            ['multi', 1],
            ['unknown', 2],
          ]);
          const aOrder = order.get(a.variant) ?? 100;
          const bOrder = order.get(b.variant) ?? 100;
          if (aOrder !== bOrder) {
            return aOrder - bOrder;
          }
          return a.variant.localeCompare(b.variant);
        });

      return {
        workspacePath,
        timeWindow,
        windowStartAt: windowStartMs === null ? null : new Date(windowStartMs).toISOString(),
        windowEndAt: new Date(nowMs).toISOString(),
        variants,
      };
    } catch (error) {
      this.logger.debug(`Failed to read studio CTA variant breakdown: ${error}`);
      return null;
    }
  }

  async getStudioHardGateStatus(
    preferredWorkspacePath?: string,
    timeWindow: CommandTelemetryTimeWindow = 'last7d',
    thresholds: Partial<StudioHardGateThresholds> = {}
  ): Promise<StudioHardGateStatus | null> {
    const variantBreakdown = await this.getStudioCtaVariantBreakdown(
      preferredWorkspacePath,
      timeWindow
    );
    if (!variantBreakdown) {
      return null;
    }

    const resolvedThresholds: StudioHardGateThresholds = {
      verifyPhaseReachMin:
        typeof thresholds.verifyPhaseReachMin === 'number' ? thresholds.verifyPhaseReachMin : 80,
      bridgeRouteCompletionMin:
        typeof thresholds.bridgeRouteCompletionMin === 'number'
          ? thresholds.bridgeRouteCompletionMin
          : 95,
    };

    const metrics = variantBreakdown.variants.reduce(
      (acc, variant) => {
        acc.loopStarted += variant.loopStarted;
        acc.nextActionClicked += variant.nextActionClicked;
        acc.actionExecuted += variant.actionExecuted;
        acc.verifyOutcomes += variant.verifyPassed + variant.verifyFailed;
        return acc;
      },
      {
        loopStarted: 0,
        nextActionClicked: 0,
        actionExecuted: 0,
        verifyOutcomes: 0,
      }
    );

    const verifyPhaseReach =
      metrics.actionExecuted > 0
        ? Number(((metrics.verifyOutcomes / metrics.actionExecuted) * 100).toFixed(2))
        : null;

    const bridgeRouteCompletionRate =
      metrics.loopStarted > 0
        ? Number(((metrics.actionExecuted / metrics.loopStarted) * 100).toFixed(2))
        : null;

    const verifyPhaseReachPass =
      verifyPhaseReach !== null && verifyPhaseReach >= resolvedThresholds.verifyPhaseReachMin;
    const bridgeRouteCompletionPass =
      bridgeRouteCompletionRate !== null &&
      bridgeRouteCompletionRate >= resolvedThresholds.bridgeRouteCompletionMin;
    const telemetryEvidencePass = metrics.loopStarted > 0;

    return {
      workspacePath: variantBreakdown.workspacePath,
      timeWindow: variantBreakdown.timeWindow,
      windowStartAt: variantBreakdown.windowStartAt,
      windowEndAt: variantBreakdown.windowEndAt,
      thresholds: resolvedThresholds,
      metrics: {
        ...metrics,
        verifyPhaseReach,
        bridgeRouteCompletionRate,
      },
      gates: {
        verifyPhaseReachPass,
        bridgeRouteCompletionPass,
        telemetryEvidencePass,
        overallPass: verifyPhaseReachPass && bridgeRouteCompletionPass && telemetryEvidencePass,
      },
    };
  }

  async getStudioPredictionKpiStatus(
    preferredWorkspacePath?: string,
    timeWindow: CommandTelemetryTimeWindow = 'last7d',
    thresholds: Partial<StudioPredictionKpiThresholds> = {}
  ): Promise<StudioPredictionKpiStatus | null> {
    const workspacePath = this.resolveWorkspacePath(preferredWorkspacePath);
    if (!workspacePath) {
      return null;
    }

    try {
      const marker = await readWorkspaceMarker(workspacePath);
      if (!marker) {
        return null;
      }

      const telemetryRaw = marker.metadata?.custom?.workspaiTelemetry;
      const telemetry =
        telemetryRaw && typeof telemetryRaw === 'object'
          ? (telemetryRaw as Record<string, unknown>)
          : {};

      const recentEvents = this.parseRecentEvents(telemetry.recentEvents);
      const nowMs = Date.now();
      const windowStartMs = this.getWindowStartMs(timeWindow, nowMs);
      const filteredRecentEvents =
        windowStartMs === null
          ? recentEvents
          : recentEvents.filter((entry) => Date.parse(entry.at) >= windowStartMs);

      let predictionShown = 0;
      let predictionAccepted = 0;
      let predictionVerified = 0;
      let predictionFalsified = 0;

      for (const entry of filteredRecentEvents) {
        if (entry.command === 'workspai.studio.prediction_shown') {
          predictionShown += 1;
        } else if (entry.command === 'workspai.studio.prediction_accepted') {
          predictionAccepted += 1;
        } else if (entry.command === 'workspai.studio.prediction_verified') {
          predictionVerified += 1;
        } else if (entry.command === 'workspai.studio.prediction_falsified') {
          predictionFalsified += 1;
        }
      }

      const predictionIgnored = Math.max(0, predictionShown - predictionAccepted);
      const predictionOutcomes = predictionVerified + predictionFalsified;

      const predictivePrecision =
        predictionOutcomes > 0
          ? Number(((predictionVerified / predictionOutcomes) * 100).toFixed(2))
          : null;
      const falseAlarmRate =
        predictionOutcomes > 0
          ? Number(((predictionFalsified / predictionOutcomes) * 100).toFixed(2))
          : null;
      const preventedIncidentRate =
        predictionShown > 0
          ? Number(((predictionVerified / predictionShown) * 100).toFixed(2))
          : null;
      const acceptanceRate =
        predictionShown > 0
          ? Number(((predictionAccepted / predictionShown) * 100).toFixed(2))
          : null;
      const verificationCoverage =
        predictionAccepted > 0
          ? Number(((predictionOutcomes / predictionAccepted) * 100).toFixed(2))
          : null;

      const resolvedThresholds: StudioPredictionKpiThresholds = {
        predictivePrecisionMin:
          typeof thresholds.predictivePrecisionMin === 'number'
            ? thresholds.predictivePrecisionMin
            : 65,
        falseAlarmRateMax:
          typeof thresholds.falseAlarmRateMax === 'number' ? thresholds.falseAlarmRateMax : 35,
        preventedIncidentRateMin:
          typeof thresholds.preventedIncidentRateMin === 'number'
            ? thresholds.preventedIncidentRateMin
            : 20,
      };

      const telemetryEvidencePass = predictionShown > 0;
      const predictivePrecisionPass =
        predictivePrecision !== null &&
        predictivePrecision >= resolvedThresholds.predictivePrecisionMin;
      const falseAlarmRatePass =
        falseAlarmRate !== null && falseAlarmRate <= resolvedThresholds.falseAlarmRateMax;
      const preventedIncidentRatePass =
        preventedIncidentRate !== null &&
        preventedIncidentRate >= resolvedThresholds.preventedIncidentRateMin;

      return {
        workspacePath,
        timeWindow,
        windowStartAt: windowStartMs === null ? null : new Date(windowStartMs).toISOString(),
        windowEndAt: new Date(nowMs).toISOString(),
        thresholds: resolvedThresholds,
        metrics: {
          predictionShown,
          predictionAccepted,
          predictionVerified,
          predictionFalsified,
          predictionIgnored,
          predictivePrecision,
          falseAlarmRate,
          preventedIncidentRate,
          acceptanceRate,
          verificationCoverage,
        },
        gates: {
          telemetryEvidencePass,
          predictivePrecisionPass,
          falseAlarmRatePass,
          preventedIncidentRatePass,
          overallPass:
            telemetryEvidencePass &&
            predictivePrecisionPass &&
            falseAlarmRatePass &&
            preventedIncidentRatePass,
        },
      };
    } catch (error) {
      this.logger.debug(`Failed to read studio prediction KPI status: ${error}`);
      return null;
    }
  }

  /**
   * Clears command telemetry payload from workspace marker custom metadata.
   */
  async clearCommandTelemetry(preferredWorkspacePath?: string): Promise<boolean> {
    const workspacePath = this.resolveWorkspacePath(preferredWorkspacePath);
    if (!workspacePath) {
      return false;
    }

    try {
      const marker = await readWorkspaceMarker(workspacePath);
      if (!marker) {
        return false;
      }

      if (!marker.metadata?.custom) {
        return true;
      }

      const custom = { ...marker.metadata.custom };
      if (!('workspaiTelemetry' in custom)) {
        return true;
      }

      delete custom.workspaiTelemetry;

      const metadata = { ...(marker.metadata ?? {}) };
      if (Object.keys(custom).length > 0) {
        metadata.custom = custom;
      } else {
        delete metadata.custom;
      }

      await writeWorkspaceMarker(workspacePath, {
        ...marker,
        metadata,
      });

      this.logger.debug(`Cleared command telemetry in ${workspacePath}`);
      return true;
    } catch (error) {
      this.logger.debug(`Failed to clear command telemetry: ${error}`);
      return false;
    }
  }

  /**
   * Track that a workspace was opened in VS Code
   * Updates the workspace marker with VS Code metadata
   */
  async trackWorkspaceOpen(workspacePath: string): Promise<void> {
    // Only track once per session
    if (this.trackedWorkspaces.has(workspacePath)) {
      return;
    }

    try {
      const marker = await readWorkspaceMarker(workspacePath);

      if (!marker) {
        // Not a RapidKit workspace
        return;
      }

      const currentCount = marker.metadata?.vscode?.openCount || 0;
      const wasCreatedViaExtension = marker.metadata?.vscode?.createdViaExtension || false;

      await updateWorkspaceMetadata(workspacePath, {
        vscode: {
          extensionVersion: getExtensionVersion(),
          createdViaExtension: wasCreatedViaExtension,
          lastOpenedAt: new Date().toISOString(),
          openCount: currentCount + 1,
        },
      });

      this.trackedWorkspaces.add(workspacePath);
      this.logger.debug(`Tracked workspace open: ${workspacePath} (count: ${currentCount + 1})`);
    } catch (error) {
      // Silent fail - tracking is optional
      this.logger.debug(`Failed to track workspace open: ${error}`);
    }
  }

  /**
   * Initialize tracking for active workspaces
   */
  async initialize(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders) {
      return;
    }

    for (const folder of workspaceFolders) {
      await this.trackWorkspaceOpen(folder.uri.fsPath);
    }
  }
}
