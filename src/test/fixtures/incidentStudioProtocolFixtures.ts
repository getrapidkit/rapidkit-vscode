export const INCIDENT_PROTOCOL_FIXTURES = {
  start: {
    command: 'aiChatStart',
    payload: {
      workspacePath: '/tmp/workspaces/demo',
      requestId: 'cb-start-1',
      resumeConversationId: 'conv-123',
      projectPath: '/tmp/workspaces/demo/orders-api',
      projectName: 'orders-api',
      projectType: 'springboot',
    },
  },
  sync: {
    command: 'aiChatSyncWorkspace',
    payload: {
      workspacePath: '/tmp/workspaces/demo',
      requestId: 'cb-sync-1',
      forceRefresh: false,
    },
  },
  query: {
    command: 'aiChatQuery',
    payload: {
      conversationId: 'conv-123',
      workspacePath: '/tmp/workspaces/demo',
      requestId: 'cb-query-1',
      message: 'Analyze current blockers',
      modelId: 'gpt-4o',
      projectPath: '/tmp/workspaces/demo/orders-api',
      projectName: 'orders-api',
      projectType: 'springboot',
    },
  },
  execute: {
    command: 'aiChatExecuteAction',
    payload: {
      conversationId: 'conv-123',
      actionId: 'action-1',
      actionType: 'doctor-fix',
      workspacePath: '/tmp/workspaces/demo',
      requestId: 'cb-exec-1',
      modelId: 'gpt-4o',
      projectPath: '/tmp/workspaces/demo/orders-api',
      projectName: 'orders-api',
      projectType: 'springboot',
    },
  },
} as const;
