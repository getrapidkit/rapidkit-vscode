import { describe, expect, it } from 'vitest';

import {
  buildIncidentActionExecutionMetadata,
  buildIncidentChatExecuteActionPayload,
  buildIncidentChatQueryPayload,
  buildIncidentChatStartPayload,
  isIncidentDuplicateRequest,
  normalizeIncidentPartialFailurePayload,
  normalizeIncidentProtocolMeta,
  normalizeIncidentWorkspaceGraphSnapshot,
  normalizeIncomingIncidentStudioOpen,
} from '../../webview-ui/src/lib/incidentStudioPayload';
import { classifyIncidentActionPolicy } from '../ui/panels/incidentStudioPromptPolicy';
import {
  buildIncidentWorkspaceGraphFixture,
  INCIDENT_STUDIO_SUPPORTED_KIT_FIXTURES,
} from './fixtures/incidentStudioGraphFixtures';
import { INCIDENT_PROTOCOL_FIXTURES } from './fixtures/incidentStudioProtocolFixtures';

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

  it('keeps execute payload metadata in parity with host-side incident action policy', () => {
    const actionTypes = [
      'change-impact-lite',
      'terminal-bridge',
      'fix-preview-lite',
      'workspace-memory-wizard',
      'doctor-fix',
      'recipe-pack',
      'inline-command',
      'custom-mutate-action',
    ];

    for (const actionType of actionTypes) {
      const {
        riskClass,
        riskLevel,
        requiresImpactReview,
        requiresVerifyPath,
        allowCompletionClaimWithoutVerify,
      } = classifyIncidentActionPolicy(actionType);

      expect(buildIncidentActionExecutionMetadata(actionType)).toEqual(
        expect.objectContaining({
          riskClass,
          riskLevel,
          requiresImpactReview,
          requiresVerifyPath,
          allowCompletionClaimWithoutVerify,
        })
      );
    }
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

  it('keeps graph evidence complete across supported workspace kit fixtures', () => {
    for (const fixture of INCIDENT_STUDIO_SUPPORTED_KIT_FIXTURES) {
      const graph = normalizeIncidentWorkspaceGraphSnapshot(
        buildIncidentWorkspaceGraphFixture(fixture)
      );

      expect(graph).toMatchObject({
        workspace: {
          path: fixture.workspacePath,
          name: fixture.workspaceName,
        },
        project: {
          framework: fixture.framework,
          kit: fixture.kit,
          selectedProject: {
            path: fixture.projectPath,
            name: fixture.projectName,
            type: fixture.projectType,
          },
        },
        topology: {
          modulesCount: fixture.modules.length,
          topModules: fixture.modules,
        },
        doctor: {
          hasEvidence: true,
        },
        git: {
          hasDiffContext: true,
        },
        memory: {
          hasMemory: true,
          conventionsCount: 2,
          decisionsCount: 1,
        },
        evidence: {
          hasDoctorEvidence: true,
          hasGitDiff: true,
          hasWorkspaceMemory: true,
          projectScoped: true,
        },
        completeness: 'fresh',
      });
    }
  });

  it('returns null when workspace path is missing in workspace graph snapshot', () => {
    expect(
      normalizeIncidentWorkspaceGraphSnapshot({
        workspace: { path: '   ' },
      })
    ).toBeNull();
  });

  it('keeps protocol fixture contracts stable for start/query/execute', () => {
    const start = buildIncidentChatStartPayload({
      workspacePath: INCIDENT_PROTOCOL_FIXTURES.start.payload.workspacePath,
      requestId: INCIDENT_PROTOCOL_FIXTURES.start.payload.requestId,
      resumeConversationId: INCIDENT_PROTOCOL_FIXTURES.start.payload.resumeConversationId,
      projectSelection: {
        path: INCIDENT_PROTOCOL_FIXTURES.start.payload.projectPath,
        name: INCIDENT_PROTOCOL_FIXTURES.start.payload.projectName,
        type: INCIDENT_PROTOCOL_FIXTURES.start.payload.projectType,
      },
    });

    const query = buildIncidentChatQueryPayload({
      conversationId: INCIDENT_PROTOCOL_FIXTURES.query.payload.conversationId,
      workspacePath: INCIDENT_PROTOCOL_FIXTURES.query.payload.workspacePath,
      requestId: INCIDENT_PROTOCOL_FIXTURES.query.payload.requestId,
      message: INCIDENT_PROTOCOL_FIXTURES.query.payload.message,
      modelId: INCIDENT_PROTOCOL_FIXTURES.query.payload.modelId,
      projectSelection: {
        path: INCIDENT_PROTOCOL_FIXTURES.query.payload.projectPath,
        name: INCIDENT_PROTOCOL_FIXTURES.query.payload.projectName,
        type: INCIDENT_PROTOCOL_FIXTURES.query.payload.projectType,
      },
    });

    const execute = buildIncidentChatExecuteActionPayload({
      conversationId: INCIDENT_PROTOCOL_FIXTURES.execute.payload.conversationId,
      actionId: INCIDENT_PROTOCOL_FIXTURES.execute.payload.actionId,
      actionType: INCIDENT_PROTOCOL_FIXTURES.execute.payload.actionType,
      workspacePath: INCIDENT_PROTOCOL_FIXTURES.execute.payload.workspacePath,
      requestId: INCIDENT_PROTOCOL_FIXTURES.execute.payload.requestId,
      modelId: INCIDENT_PROTOCOL_FIXTURES.execute.payload.modelId,
      projectSelection: {
        path: INCIDENT_PROTOCOL_FIXTURES.execute.payload.projectPath,
        name: INCIDENT_PROTOCOL_FIXTURES.execute.payload.projectName,
        type: INCIDENT_PROTOCOL_FIXTURES.execute.payload.projectType,
      },
    });

    expect(start.requestId).toBe(INCIDENT_PROTOCOL_FIXTURES.start.payload.requestId);
    expect(start.resumeConversationId).toBe(
      INCIDENT_PROTOCOL_FIXTURES.start.payload.resumeConversationId
    );

    expect(query).toMatchObject({
      conversationId: INCIDENT_PROTOCOL_FIXTURES.query.payload.conversationId,
      requestId: INCIDENT_PROTOCOL_FIXTURES.query.payload.requestId,
      modelId: INCIDENT_PROTOCOL_FIXTURES.query.payload.modelId,
    });

    expect(execute).toMatchObject({
      conversationId: INCIDENT_PROTOCOL_FIXTURES.execute.payload.conversationId,
      requestId: INCIDENT_PROTOCOL_FIXTURES.execute.payload.requestId,
      actionType: INCIDENT_PROTOCOL_FIXTURES.execute.payload.actionType,
    });
  });

  it('detects duplicate request ids and normalizes request metadata', () => {
    const meta = normalizeIncidentProtocolMeta({
      requestId: ' cb-query-1 ',
      version: ' v1 ',
    });

    expect(meta).toEqual({
      requestId: 'cb-query-1',
      version: 'v1',
    });

    expect(isIncidentDuplicateRequest('cb-query-1', meta.requestId)).toBe(true);
    expect(isIncidentDuplicateRequest('cb-query-1', 'cb-query-2')).toBe(false);
    expect(isIncidentDuplicateRequest(null, 'cb-query-1')).toBe(false);
  });

  it('normalizes partial-failure payload with safe defaults', () => {
    expect(
      normalizeIncidentPartialFailurePayload({
        code: ' PARTIAL_FAILURE ',
        message: ' Stream interrupted ',
        retryable: false,
      })
    ).toEqual({
      code: 'PARTIAL_FAILURE',
      message: 'Stream interrupted',
      retryable: false,
    });

    expect(normalizeIncidentPartialFailurePayload({})).toEqual({
      code: 'PARTIAL_FAILURE',
      message: 'Incident Studio request completed with partial failure.',
      retryable: true,
    });
  });

  it('preserves timeout-specific retry semantics in partial-failure payloads', () => {
    expect(
      normalizeIncidentPartialFailurePayload({
        code: ' TIMEOUT ',
        message: ' Request exceeded response budget ',
        retryable: true,
      })
    ).toEqual({
      code: 'TIMEOUT',
      message: 'Request exceeded response budget',
      retryable: true,
    });
  });

  it('redacts secrets from incoming query and partial failure payload text fields', () => {
    const normalizedOpen = normalizeIncomingIncidentStudioOpen({
      workspacePath: '/tmp/wsp',
      workspaceName: 'Demo',
      initialQuery: 'authorization: Bearer super-secret-token',
      projectPath: '/tmp/wsp/orders-api',
      projectName: 'api_key=prod-123',
      projectType: 'springboot',
    });

    expect(normalizedOpen?.initialQuery).toContain('[REDACTED]');
    expect(normalizedOpen?.projectSelection?.name).toContain('[REDACTED]');
    expect(normalizedOpen?.initialQuery).not.toContain('super-secret-token');

    const queryPayload = buildIncidentChatQueryPayload({
      conversationId: 'conv-1',
      workspacePath: '/tmp/wsp',
      requestId: 'cbq-redact',
      message: 'token=abc123',
    });
    expect(queryPayload.message).toContain('[REDACTED]');
    expect(queryPayload.message).not.toContain('abc123');

    const partial = normalizeIncidentPartialFailurePayload({
      message: 'password: hello123',
    });
    expect(partial.message).toContain('[REDACTED]');
    expect(partial.message).not.toContain('hello123');
  });
});
