import { describe, expect, it } from 'vitest';

import {
  buildIncidentActionExecutionMetadata,
  buildIncidentChatExecuteActionPayload,
  buildIncidentChatQueryPayload,
  buildIncidentChatStartPayload,
  normalizeIncidentWorkspaceGraphSnapshot,
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
      execution: {
        riskClass: 'non-mutating-executable',
        riskLevel: 'medium',
        requiresImpactReview: false,
        requiresVerifyPath: true,
        allowCompletionClaimWithoutVerify: false,
      },
    });
  });

  it('classifies execute-action metadata for known and unknown action types', () => {
    const doctorFix = buildIncidentActionExecutionMetadata('doctor-fix');
    const unknown = buildIncidentActionExecutionMetadata('unknown-action');

    expect(doctorFix).toEqual({
      riskClass: 'non-mutating-executable',
      riskLevel: 'medium',
      requiresImpactReview: false,
      requiresVerifyPath: true,
      allowCompletionClaimWithoutVerify: false,
    });

    expect(unknown).toEqual({
      riskClass: 'high-risk-mutating',
      riskLevel: 'critical',
      requiresImpactReview: true,
      requiresVerifyPath: true,
      allowCompletionClaimWithoutVerify: false,
    });
  });

  it('normalizes canonical workspace graph snapshot for incident studio', () => {
    const graph = normalizeIncidentWorkspaceGraphSnapshot({
      snapshotVersion: 'v1',
      workspace: { path: ' /tmp/wsp ', name: ' Demo ' },
      project: {
        framework: 'springboot',
        kit: 'springboot.standard',
        selectedProject: {
          path: ' /tmp/wsp/orders-api ',
          name: ' Orders API ',
          type: ' springboot ',
        },
      },
      topology: {
        modulesCount: 4,
        topModules: ['auth', 'billing'],
      },
      doctor: {
        hasEvidence: true,
        generatedAt: '2026-04-27T12:00:00.000Z',
        health: {
          passed: 7,
          warnings: 1,
          errors: 0,
          total: 8,
          percent: 88,
        },
      },
      git: {
        diffStat: '2 files changed',
        hasDiffContext: true,
      },
      memory: {
        context: 'Monorepo with strict module boundaries.',
        conventionsCount: 2,
        decisionsCount: 1,
        hasMemory: true,
      },
      telemetry: {
        totalEvents: 32,
        lastCommand: 'workspai.studio.loop_started',
        onboardingFollowupClickThroughRate: 41,
      },
      evidence: {
        hasDoctorEvidence: true,
        hasGitDiff: true,
        hasWorkspaceMemory: true,
        projectScoped: true,
      },
      completeness: 'fresh',
      lastUpdatedAt: 123,
    });

    expect(graph).toMatchObject({
      snapshotVersion: 'v1',
      workspace: { path: '/tmp/wsp', name: 'Demo' },
      project: {
        framework: 'springboot',
        kit: 'springboot.standard',
        selectedProject: {
          path: '/tmp/wsp/orders-api',
          name: 'Orders API',
          type: 'springboot',
        },
      },
      evidence: {
        hasDoctorEvidence: true,
        hasGitDiff: true,
        hasWorkspaceMemory: true,
        projectScoped: true,
      },
      completeness: 'fresh',
    });
  });

  it('returns null when workspace path is missing in workspace graph snapshot', () => {
    expect(
      normalizeIncidentWorkspaceGraphSnapshot({
        workspace: { path: '   ' },
      })
    ).toBeNull();
  });
});
