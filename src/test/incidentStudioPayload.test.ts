import { describe, expect, it } from 'vitest';

import {
  buildIncidentChatExecuteActionPayload,
  buildIncidentChatQueryPayload,
  buildIncidentChatStartPayload,
  normalizeIncomingIncidentStudioOpen,
} from '../../webview-ui/src/lib/incidentStudioPayload';

describe('incidentStudioPayload', () => {
  it('normalizes openIncidentStudio message with trimmed project-scoped fields', () => {
    const normalized = normalizeIncomingIncidentStudioOpen({
      workspacePath: ' /tmp/wsp ',
      workspaceName: ' Demo Workspace ',
      projectPath: ' /tmp/wsp/orders-api ',
      projectName: ' Orders API ',
      projectType: ' springboot ',
      initialQuery: ' analyze launch blockers ',
    });

    expect(normalized).toEqual({
      workspacePath: '/tmp/wsp',
      workspaceName: 'Demo Workspace',
      initialQuery: 'analyze launch blockers',
      projectSelection: {
        path: '/tmp/wsp/orders-api',
        name: 'Orders API',
        type: 'springboot',
      },
    });
  });

  it('falls back workspaceName and removes project scope when project path is missing', () => {
    const normalized = normalizeIncomingIncidentStudioOpen({
      workspacePath: '/tmp/wsp',
      workspaceName: '   ',
      projectPath: '   ',
      projectName: 'Ignored',
      projectType: 'Ignored',
    });

    expect(normalized).toEqual({
      workspacePath: '/tmp/wsp',
      workspaceName: '/tmp/wsp',
      initialQuery: undefined,
      projectSelection: null,
    });
  });

  it('returns null when workspacePath is missing', () => {
    expect(normalizeIncomingIncidentStudioOpen({ workspacePath: '   ' })).toBeNull();
    expect(normalizeIncomingIncidentStudioOpen(null)).toBeNull();
  });

  it('builds aiChatStart payload with project fields when project selection exists', () => {
    const payload = buildIncidentChatStartPayload({
      workspacePath: '/tmp/wsp',
      requestId: 'cb-1',
      resumeConversationId: 'conv-1',
      projectSelection: {
        path: '/tmp/wsp/orders-api',
        name: 'orders-api',
        type: 'springboot',
      },
    });

    expect(payload).toMatchObject({
      workspacePath: '/tmp/wsp',
      requestId: 'cb-1',
      resumeConversationId: 'conv-1',
      projectPath: '/tmp/wsp/orders-api',
      projectName: 'orders-api',
      projectType: 'springboot',
    });
  });

  it('builds aiChatQuery payload without project fields when project selection is absent', () => {
    const payload = buildIncidentChatQueryPayload({
      conversationId: 'conv-1',
      workspacePath: '/tmp/wsp',
      requestId: 'cbq-1',
      message: 'show launch blockers',
    });

    expect(payload).toEqual({
      conversationId: 'conv-1',
      workspacePath: '/tmp/wsp',
      requestId: 'cbq-1',
      modelId: undefined,
      message: 'show launch blockers',
    });
  });

  it('builds aiChatExecuteAction payload with project fields for project-scoped actions', () => {
    const payload = buildIncidentChatExecuteActionPayload({
      conversationId: 'conv-1',
      actionId: 'action-1',
      actionType: 'doctor-fix',
      workspacePath: '/tmp/wsp',
      requestId: 'cba-1',
      modelId: 'gpt-4o',
      projectSelection: {
        path: '/tmp/wsp/orders-api',
        name: 'orders-api',
        type: 'springboot',
      },
    });

    expect(payload).toMatchObject({
      conversationId: 'conv-1',
      actionId: 'action-1',
      actionType: 'doctor-fix',
      workspacePath: '/tmp/wsp',
      requestId: 'cba-1',
      modelId: 'gpt-4o',
      projectPath: '/tmp/wsp/orders-api',
      projectName: 'orders-api',
      projectType: 'springboot',
    });
  });
});
