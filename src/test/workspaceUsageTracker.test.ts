import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

vi.mock('vscode', () => ({
  window: {
    activeTextEditor: undefined,
    createOutputChannel: () => ({
      appendLine: () => undefined,
      show: () => undefined,
      hide: () => undefined,
      clear: () => undefined,
      dispose: () => undefined,
    }),
  },
  workspace: {
    workspaceFolders: undefined,
    getWorkspaceFolder: () => undefined,
  },
}));

import { WorkspaceUsageTracker } from '../utils/workspaceUsageTracker';
import { readWorkspaceMarker } from '../utils/workspaceMarker';

function createWorkspaceMarker(
  workspacePath: string,
  customTelemetry?: Record<string, unknown>
): void {
  fs.mkdirSync(workspacePath, { recursive: true });
  fs.writeFileSync(
    path.join(workspacePath, '.rapidkit-workspace'),
    JSON.stringify(
      {
        signature: 'RAPIDKIT_WORKSPACE',
        createdBy: 'rapidkit-vscode',
        version: '0.20.0',
        createdAt: '2026-04-20T00:00:00.000Z',
        name: path.basename(workspacePath),
        metadata: {
          custom: customTelemetry ? { workspaiTelemetry: customTelemetry } : {},
        },
      },
      null,
      2
    )
  );
}

describe('workspaceUsageTracker telemetry stability', () => {
  let tempRoot: string;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'workspai-usage-tracker-'));
    (WorkspaceUsageTracker as any).instance = undefined;
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-22T12:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('uses hourly buckets for last24h instead of being capped by recentEvents length', async () => {
    const workspacePath = path.join(tempRoot, 'ws-hourly');
    const hourBucket = '2026-04-22T12:00:00.000Z';

    createWorkspaceMarker(workspacePath, {
      commandUsage: {
        'workspai.aiQuickActions': 520,
      },
      recentEvents: Array.from({ length: 500 }, () => ({
        command: 'workspai.aiQuickActions',
        at: '2026-04-22T12:15:00.000Z',
      })),
      hourlyUsage: [
        {
          hour: hourBucket,
          usage: {
            'workspai.aiQuickActions': 520,
          },
        },
      ],
      lastCommand: 'workspai.aiQuickActions',
      lastCommandAt: '2026-04-22T12:15:00.000Z',
    });

    const summary = await WorkspaceUsageTracker.getInstance().getCommandTelemetrySummary(
      workspacePath,
      'last24h'
    );

    expect(summary).not.toBeNull();
    expect(summary?.totalEvents).toBe(520);
    expect(summary?.commandUsage[0]).toEqual({ command: 'workspai.aiQuickActions', count: 520 });
    expect(summary?.surfaceBreakdown.actionEvents).toBe(520);
  });

  it('serializes telemetry writes to avoid concurrent event loss', async () => {
    const workspacePath = path.join(tempRoot, 'ws-queue');
    createWorkspaceMarker(workspacePath);

    await Promise.all(
      Array.from({ length: 30 }, () =>
        WorkspaceUsageTracker.getInstance().trackCommandEvent(
          'workspai.aiQuickActions',
          workspacePath
        )
      )
    );

    const summary = await WorkspaceUsageTracker.getInstance().getCommandTelemetrySummary(
      workspacePath,
      'all'
    );

    expect(summary).not.toBeNull();
    expect(summary?.totalEvents).toBe(30);
    expect(summary?.commandUsage).toEqual([{ command: 'workspai.aiQuickActions', count: 30 }]);

    const marker = await readWorkspaceMarker(workspacePath);
    const telemetry = marker?.metadata?.custom?.workspaiTelemetry as
      | { recentEvents?: unknown[]; hourlyUsage?: unknown[] }
      | undefined;

    expect(Array.isArray(telemetry?.recentEvents)).toBe(true);
    expect((telemetry?.recentEvents ?? []).length).toBe(30);
    expect(Array.isArray(telemetry?.hourlyUsage)).toBe(true);
    expect((telemetry?.hourlyUsage ?? []).length).toBe(1);
  });

  it('calculates stable action-vs-ask surface breakdown', async () => {
    const workspacePath = path.join(tempRoot, 'ws-breakdown');

    createWorkspaceMarker(workspacePath, {
      commandUsage: {
        'workspai.aiQuickActions': 6,
        'workspai.chat.ask': 3,
        'workspai.aimodal.ask': 1,
        'workspai.onboarding.primary.shown': 2,
      },
      recentEvents: [
        { command: 'workspai.aiQuickActions', at: '2026-04-22T12:10:00.000Z' },
        { command: 'workspai.chat.ask', at: '2026-04-22T12:11:00.000Z' },
      ],
      lastCommand: 'workspai.chat.ask',
      lastCommandAt: '2026-04-22T12:11:00.000Z',
    });

    const summary = await WorkspaceUsageTracker.getInstance().getCommandTelemetrySummary(
      workspacePath,
      'all'
    );

    expect(summary).not.toBeNull();
    expect(summary?.surfaceBreakdown.actionEvents).toBe(6);
    expect(summary?.surfaceBreakdown.askEvents).toBe(4);
    expect(summary?.surfaceBreakdown.actionVsAskShare).toBe(60);

    const bySurface = summary?.surfaceBreakdown.bySurface ?? [];
    expect(bySurface.find((entry) => entry.surface === 'action')?.count).toBe(6);
    expect(bySurface.find((entry) => entry.surface === 'chat')?.count).toBe(3);
    expect(bySurface.find((entry) => entry.surface === 'aimodal')?.count).toBe(1);
    expect(bySurface.find((entry) => entry.surface === 'onboarding')?.count).toBe(2);
  });

  it('treats non-allowlisted ai commands as other surface to prevent drift', async () => {
    const workspacePath = path.join(tempRoot, 'ws-allowlist');

    createWorkspaceMarker(workspacePath, {
      commandUsage: {
        'workspai.aiQuickActions': 6,
        'workspai.aiFutureMagic': 4,
        'workspai.chat.ask': 2,
      },
      recentEvents: [
        { command: 'workspai.aiFutureMagic', at: '2026-04-22T12:20:00.000Z' },
        { command: 'workspai.chat.ask', at: '2026-04-22T12:21:00.000Z' },
      ],
      lastCommand: 'workspai.aiFutureMagic',
      lastCommandAt: '2026-04-22T12:20:00.000Z',
    });

    const summary = await WorkspaceUsageTracker.getInstance().getCommandTelemetrySummary(
      workspacePath,
      'all'
    );

    expect(summary).not.toBeNull();
    expect(summary?.surfaceBreakdown.actionEvents).toBe(6);
    expect(summary?.surfaceBreakdown.askEvents).toBe(2);

    const bySurface = summary?.surfaceBreakdown.bySurface ?? [];
    expect(bySurface.find((entry) => entry.surface === 'other')?.count).toBe(4);
  });

  it('uses onboarding hourly buckets for last24h stats instead of recentEvents cap', async () => {
    const workspacePath = path.join(tempRoot, 'ws-onboarding-hourly');

    createWorkspaceMarker(workspacePath, {
      recentEvents: Array.from({ length: 500 }, () => ({
        command: 'workspai.onboarding.followup.shown',
        at: '2026-04-22T12:15:00.000Z',
        props: { variant: 'control' },
      })),
      onboardingHourlyUsage: [
        {
          hour: '2026-04-22T12:00:00.000Z',
          aggregate: {
            primaryShown: 520,
            primaryActionUsage: {
              'open-ai-flows': 300,
              'open-telemetry': 220,
            },
            followupShownByVariant: {
              control: 300,
              compact: 220,
            },
            followupClickedByVariant: {
              control: 120,
              compact: 140,
            },
            followupDismissedByVariant: {
              control: 80,
              compact: 50,
            },
          },
        },
      ],
    });

    const stats = await WorkspaceUsageTracker.getInstance().getOnboardingExperimentStats(
      workspacePath,
      'last24h'
    );

    expect(stats).not.toBeNull();
    expect(stats?.primaryShown).toBe(520);
    expect(stats?.primaryActionCounts).toEqual([
      { action: 'open-ai-flows', count: 300 },
      { action: 'open-telemetry', count: 220 },
    ]);
    expect(stats?.followupShown).toBe(520);
    expect(stats?.followupClicked).toBe(260);
    expect(stats?.followupDismissed).toBe(130);
    expect(stats?.overallFollowupClickThroughRate).toBe(50);
    expect(stats?.variants).toEqual([
      {
        variant: 'control',
        shown: 300,
        clicked: 120,
        dismissed: 80,
        clickThroughRate: 40,
      },
      {
        variant: 'compact',
        shown: 220,
        clicked: 140,
        dismissed: 50,
        clickThroughRate: 63.64,
      },
    ]);
  });

  it('uses onboarding all-time aggregate for all window stats', async () => {
    const workspacePath = path.join(tempRoot, 'ws-onboarding-all');

    createWorkspaceMarker(workspacePath, {
      recentEvents: Array.from({ length: 500 }, () => ({
        command: 'workspai.onboarding.primary.shown',
        at: '2026-04-22T12:10:00.000Z',
      })),
      onboardingAggregate: {
        primaryShown: 900,
        primaryActionUsage: {
          'open-ai-flows': 500,
          'open-dashboard': 400,
        },
        followupShownByVariant: {
          control: 450,
          compact: 450,
        },
        followupClickedByVariant: {
          control: 180,
          compact: 240,
        },
        followupDismissedByVariant: {
          control: 120,
          compact: 140,
        },
      },
    });

    const stats = await WorkspaceUsageTracker.getInstance().getOnboardingExperimentStats(
      workspacePath,
      'all'
    );

    expect(stats).not.toBeNull();
    expect(stats?.primaryShown).toBe(900);
    expect(stats?.primaryActionCounts).toEqual([
      { action: 'open-ai-flows', count: 500 },
      { action: 'open-dashboard', count: 400 },
    ]);
    expect(stats?.followupShown).toBe(900);
    expect(stats?.followupClicked).toBe(420);
    expect(stats?.followupDismissed).toBe(260);
    expect(stats?.overallFollowupClickThroughRate).toBe(46.67);
  });
});
