export type IncidentProjectSelection = {
  path: string;
  name?: string;
  type?: string;
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
  return withProjectSelection(
    {
      conversationId: input.conversationId,
      actionId: input.actionId,
      actionType: input.actionType,
      workspacePath: input.workspacePath,
      modelId: input.modelId,
      requestId: input.requestId,
    },
    input.projectSelection
  );
}
