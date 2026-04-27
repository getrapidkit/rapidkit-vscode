import type {
  IncidentProjectSelection,
  IncidentWorkspaceGraphSnapshot,
} from './incidentStudioPayload';

export function getConversationIdToCloseOnBootstrap(
  currentConversationId: string | null,
  nextConversationId: string
): string | null {
  if (!currentConversationId || currentConversationId === nextConversationId) {
    return null;
  }

  return currentConversationId;
}

export function getConversationIdToCloseOnViewExit(
  activeView: 'dashboard' | 'incident-studio',
  conversationId: string | null
): string | null {
  if (activeView === 'incident-studio' || !conversationId) {
    return null;
  }

  return conversationId;
}

type IncidentStudioSyncPayload = {
  workspacePath?: string | null;
  selectedProjectPath?: string | null;
  graph?: IncidentWorkspaceGraphSnapshot | null;
};

export function reconcileIncidentStudioSyncSelection(
  activeWorkspacePath: string | null,
  currentProjectPath: string | null,
  payload: IncidentStudioSyncPayload
): {
  shouldApply: boolean;
  selectionChanged: boolean;
  projectSelection: IncidentProjectSelection | null;
} {
  if (
    !activeWorkspacePath ||
    !payload.workspacePath ||
    payload.workspacePath !== activeWorkspacePath
  ) {
    return {
      shouldApply: false,
      selectionChanged: false,
      projectSelection: null,
    };
  }

  const snapshotProject = payload.graph?.project?.selectedProject ?? null;
  const normalizedProjectPath =
    typeof payload.selectedProjectPath === 'string' && payload.selectedProjectPath.trim().length > 0
      ? payload.selectedProjectPath.trim()
      : snapshotProject?.path || null;

  const projectSelection = normalizedProjectPath
    ? {
        path: normalizedProjectPath,
        name: snapshotProject?.name,
        type: snapshotProject?.type,
      }
    : null;

  return {
    shouldApply: true,
    selectionChanged: currentProjectPath !== (projectSelection?.path ?? null),
    projectSelection,
  };
}
