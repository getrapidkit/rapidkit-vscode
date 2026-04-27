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

  const workspaceName = cleanText(message.workspaceName) || workspacePath;
  const initialQuery = cleanText(message.initialQuery);
  const projectPath = cleanText(message.projectPath);
  const projectSelection = projectPath
    ? {
        path: projectPath,
        name: cleanText(message.projectName),
        type: cleanText(message.projectType),
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
  return withProjectSelection(
    {
      conversationId: input.conversationId,
      workspacePath: input.workspacePath,
      requestId: input.requestId,
      modelId: input.modelId,
      message: input.message,
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
