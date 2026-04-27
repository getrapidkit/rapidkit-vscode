export type IncidentProjectSelection = {
  path: string;
  name?: string;
  type?: string;
};

export type IncidentActionRiskClass =
  | 'informational'
  | 'non-mutating-executable'
  | 'guarded-mutating'
  | 'high-risk-mutating';

export type IncidentActionRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type IncidentActionExecutionMetadata = {
  riskClass: IncidentActionRiskClass;
  riskLevel: IncidentActionRiskLevel;
  requiresImpactReview: boolean;
  requiresVerifyPath: boolean;
  allowCompletionClaimWithoutVerify: boolean;
};

export type NormalizedIncidentProtocolMeta = {
  requestId: string | null;
  version: string | null;
};

export type IncidentPartialFailurePayload = {
  code: string;
  message: string;
  retryable: boolean;
};

export type IncidentWorkspaceGraphSnapshot = {
  snapshotVersion: string;
  workspace: {
    path?: string;
    name?: string;
  };
  project: {
    framework: string;
    kit: string;
    selectedProject: {
      path: string;
      name?: string;
      type?: string;
    } | null;
  };
  topology: {
    modulesCount: number;
    topModules: string[];
  };
  doctor: {
    hasEvidence: boolean;
    generatedAt?: string;
    health?: {
      passed: number;
      warnings: number;
      errors: number;
      total: number;
      percent: number;
    };
  };
  git: {
    diffStat: string;
    hasDiffContext: boolean;
  };
  memory: {
    context?: string;
    conventionsCount: number;
    decisionsCount: number;
    hasMemory: boolean;
  };
  telemetry: {
    totalEvents: number;
    lastCommand: string | null;
    onboardingFollowupClickThroughRate: number;
  };
  evidence: {
    hasDoctorEvidence: boolean;
    hasGitDiff: boolean;
    hasWorkspaceMemory: boolean;
    projectScoped: boolean;
  };
  completeness: 'fresh' | 'cached' | 'partial' | 'degraded';
  lastUpdatedAt: number;
};

export type NormalizedIncidentStudioOpen = {
  workspacePath: string;
  workspaceName: string;
  initialQuery?: string;
  projectSelection: IncidentProjectSelection | null;
};

function cleanText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === 'string');
}

const INCIDENT_SECRET_ASSIGNMENT_PATTERN =
  /\b(api[_-]?key|access[_-]?token|refresh[_-]?token|token|password|passwd|secret|client[_-]?secret|authorization)\b\s*[:=]\s*(['"]?)([^\s'",;`]+)\2/gi;
const INCIDENT_AUTHORIZATION_ASSIGNMENT_PATTERN = /\bauthorization\b\s*[:=]\s*[^\n\r]+/gi;
const INCIDENT_BEARER_PATTERN = /(?:^|\s)Bearer\s+[A-Za-z0-9._~+/-]+=*/gi;
const INCIDENT_TOKEN_LITERAL_PATTERN =
  /\b(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{16,}|xox[baprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z\-_]{20,})\b/g;

function sanitizeIncidentText(value: unknown, maxLength: number): string | undefined {
  const cleaned = cleanText(value);
  if (!cleaned) {
    return undefined;
  }

  const redacted = cleaned
    .replace(INCIDENT_AUTHORIZATION_ASSIGNMENT_PATTERN, 'authorization: [REDACTED]')
    .replace(INCIDENT_SECRET_ASSIGNMENT_PATTERN, (full, key: string, quote: string) => {
      const delimiter = full.includes(':') ? ':' : '=';
      const wrapped = quote ? `${quote}[REDACTED]${quote}` : '[REDACTED]';
      return `${key}${delimiter}${wrapped}`;
    })
    .replace(INCIDENT_BEARER_PATTERN, 'Bearer [REDACTED]')
    .replace(INCIDENT_TOKEN_LITERAL_PATTERN, '[REDACTED]');

  if (redacted.length <= maxLength) {
    return redacted;
  }

  return `${redacted.slice(0, maxLength)}\n...[TRUNCATED]`;
}

export function normalizeIncidentProtocolMeta(meta: unknown): NormalizedIncidentProtocolMeta {
  const record = asRecord(meta);
  return {
    requestId: cleanText(record.requestId) || null,
    version: cleanText(record.version) || null,
  };
}

export function isIncidentDuplicateRequest(
  lastProcessedRequestId: string | null | undefined,
  nextRequestId: string | null | undefined
): boolean {
  if (!lastProcessedRequestId || !nextRequestId) {
    return false;
  }
  return lastProcessedRequestId === nextRequestId;
}

export function normalizeIncidentPartialFailurePayload(
  value: unknown
): IncidentPartialFailurePayload {
  const record = asRecord(value);
  const code = cleanText(record.code) || 'PARTIAL_FAILURE';
  const message =
    sanitizeIncidentText(record.message, 1200) ||
    'Incident Studio request completed with partial failure.';
  const retryable = typeof record.retryable === 'boolean' ? record.retryable : true;

  return {
    code,
    message,
    retryable,
  };
}

export function buildIncidentActionExecutionMetadata(
  actionType: string
): IncidentActionExecutionMetadata {
  const normalized = cleanText(actionType)?.toLowerCase() || 'unknown';

  if (normalized === 'change-impact-lite') {
    return {
      riskClass: 'informational',
      riskLevel: 'medium',
      requiresImpactReview: false,
      requiresVerifyPath: false,
      allowCompletionClaimWithoutVerify: true,
    };
  }

  if (
    normalized === 'terminal-bridge' ||
    normalized === 'fix-preview-lite' ||
    normalized === 'workspace-memory-wizard' ||
    normalized === 'recipe-pack'
  ) {
    return {
      riskClass: 'non-mutating-executable',
      riskLevel: 'low',
      requiresImpactReview: false,
      requiresVerifyPath: false,
      allowCompletionClaimWithoutVerify: true,
    };
  }

  if (normalized === 'doctor-fix') {
    return {
      riskClass: 'non-mutating-executable',
      riskLevel: 'medium',
      requiresImpactReview: false,
      requiresVerifyPath: true,
      allowCompletionClaimWithoutVerify: false,
    };
  }

  if (normalized === 'inline-command') {
    return {
      riskClass: 'guarded-mutating',
      riskLevel: 'high',
      requiresImpactReview: true,
      requiresVerifyPath: true,
      allowCompletionClaimWithoutVerify: false,
    };
  }

  return {
    riskClass: 'high-risk-mutating',
    riskLevel: 'critical',
    requiresImpactReview: true,
    requiresVerifyPath: true,
    allowCompletionClaimWithoutVerify: false,
  };
}

export function normalizeIncidentWorkspaceGraphSnapshot(
  data: unknown
): IncidentWorkspaceGraphSnapshot | null {
  const root = asRecord(data);
  const workspace = asRecord(root.workspace);
  const project = asRecord(root.project);
  const selectedProject = asRecord(project.selectedProject);
  const topology = asRecord(root.topology);
  const doctor = asRecord(root.doctor);
  const health = asRecord(doctor.health);
  const git = asRecord(root.git);
  const memory = asRecord(root.memory);
  const telemetry = asRecord(root.telemetry);
  const evidence = asRecord(root.evidence);

  const workspacePath = cleanText(workspace.path);
  if (!workspacePath) {
    return null;
  }

  const selectedProjectPath = cleanText(selectedProject.path);

  return {
    snapshotVersion: cleanText(root.snapshotVersion) || 'v1',
    workspace: {
      path: workspacePath,
      name: cleanText(workspace.name),
    },
    project: {
      framework: cleanText(project.framework) || 'unknown',
      kit: cleanText(project.kit) || 'unknown',
      selectedProject: selectedProjectPath
        ? {
            path: selectedProjectPath,
            name: cleanText(selectedProject.name),
            type: cleanText(selectedProject.type),
          }
        : null,
    },
    topology: {
      modulesCount: asNumber(topology.modulesCount, 0),
      topModules: asStringArray(topology.topModules),
    },
    doctor: {
      hasEvidence: Boolean(doctor.hasEvidence),
      generatedAt: cleanText(doctor.generatedAt),
      health: {
        passed: asNumber(health.passed, 0),
        warnings: asNumber(health.warnings, 0),
        errors: asNumber(health.errors, 0),
        total: asNumber(health.total, 0),
        percent: asNumber(health.percent, 0),
      },
    },
    git: {
      diffStat: cleanText(git.diffStat) || 'Git context unavailable',
      hasDiffContext: Boolean(git.hasDiffContext),
    },
    memory: {
      context: cleanText(memory.context),
      conventionsCount: asNumber(memory.conventionsCount, 0),
      decisionsCount: asNumber(memory.decisionsCount, 0),
      hasMemory: Boolean(memory.hasMemory),
    },
    telemetry: {
      totalEvents: asNumber(telemetry.totalEvents, 0),
      lastCommand: cleanText(telemetry.lastCommand) || null,
      onboardingFollowupClickThroughRate: asNumber(telemetry.onboardingFollowupClickThroughRate, 0),
    },
    evidence: {
      hasDoctorEvidence: Boolean(evidence.hasDoctorEvidence),
      hasGitDiff: Boolean(evidence.hasGitDiff),
      hasWorkspaceMemory: Boolean(evidence.hasWorkspaceMemory),
      projectScoped: Boolean(evidence.projectScoped),
    },
    completeness:
      root.completeness === 'cached' ||
      root.completeness === 'partial' ||
      root.completeness === 'degraded'
        ? root.completeness
        : 'fresh',
    lastUpdatedAt: asNumber(root.lastUpdatedAt, Date.now()),
  };
}

function withProjectSelection<T extends Record<string, unknown>>(
  payload: T,
  projectSelection?: IncidentProjectSelection | null
) {
  if (!projectSelection?.path) {
    return payload;
  }

  return {
    ...payload,
    projectPath: projectSelection.path,
    projectName: projectSelection.name,
    projectType: projectSelection.type,
  };
}

export function normalizeIncomingIncidentStudioOpen(
  data: unknown
): NormalizedIncidentStudioOpen | null {
  const message = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};

  const workspacePath = cleanText(message.workspacePath);
  if (!workspacePath) {
    return null;
  }

  const workspaceName = sanitizeIncidentText(message.workspaceName, 200) || workspacePath;
  const initialQuery = sanitizeIncidentText(message.initialQuery, 4000);
  const projectPath = cleanText(message.projectPath);
  const projectSelection = projectPath
    ? {
        path: projectPath,
        name: sanitizeIncidentText(message.projectName, 200),
        type: sanitizeIncidentText(message.projectType, 120),
      }
    : null;

  return {
    workspacePath,
    workspaceName,
    initialQuery,
    projectSelection,
  };
}

export function buildIncidentChatStartPayload(input: {
  workspacePath: string;
  requestId: string;
  resumeConversationId: string;
  projectSelection?: IncidentProjectSelection | null;
}) {
  return withProjectSelection(
    {
      workspacePath: input.workspacePath,
      requestId: input.requestId,
      resumeConversationId: input.resumeConversationId,
    },
    input.projectSelection
  );
}

export function buildIncidentChatQueryPayload(input: {
  conversationId: string;
  workspacePath: string;
  requestId: string;
  message: string;
  modelId?: string;
  projectSelection?: IncidentProjectSelection | null;
}) {
  const sanitizedMessage =
    sanitizeIncidentText(input.message, 4000) || 'Provide a safe analysis summary.';

  return withProjectSelection(
    {
      conversationId: input.conversationId,
      workspacePath: input.workspacePath,
      requestId: input.requestId,
      modelId: input.modelId,
      message: sanitizedMessage,
    },
    input.projectSelection
  );
}

export function buildIncidentChatExecuteActionPayload(input: {
  conversationId: string;
  actionId: string;
  actionType: string;
  workspacePath?: string;
  requestId: string;
  modelId?: string;
  projectSelection?: IncidentProjectSelection | null;
}) {
  const execution = buildIncidentActionExecutionMetadata(input.actionType);

  return withProjectSelection(
    {
      conversationId: input.conversationId,
      actionId: input.actionId,
      actionType: input.actionType,
      workspacePath: input.workspacePath,
      modelId: input.modelId,
      requestId: input.requestId,
      execution,
    },
    input.projectSelection
  );
}
