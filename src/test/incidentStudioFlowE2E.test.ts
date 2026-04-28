import { describe, expect, it } from 'vitest';

import {
  buildIncidentChatExecuteActionPayload,
  buildIncidentChatQueryPayload,
  normalizeIncidentImpactAssessmentPayload,
  normalizeIncidentPredictiveWarningPayload,
  normalizeIncidentReleaseGateEvidencePayload,
  normalizeIncidentActionResultPayload,
  normalizeIncidentPartialFailurePayload,
  normalizeIncomingIncidentStudioOpen,
  normalizeIncidentProtocolMeta,
  normalizeIncidentSystemGraphSnapshotPayload,
  normalizeIncidentWorkspaceGraphSnapshot,
  isIncidentDuplicateRequest,
  type IncidentProjectSelection,
} from '../../webview-ui/src/lib/incidentStudioPayload';
import {
  getActionResultPresentation,
  getBoardActionGuardHint,
} from '../../webview-ui/src/lib/incidentStudioVerifyPolicy';
import { reconcileIncidentStudioSyncSelection } from '../../webview-ui/src/lib/incidentStudioLifecycle';
import { classifyIncidentActionPolicy } from '../ui/panels/incidentStudioPromptPolicy';
import {
  buildIncidentWorkspaceGraphFixture,
  INCIDENT_STUDIO_SUPPORTED_KIT_FIXTURES,
} from './fixtures/incidentStudioGraphFixtures';

describe('incidentStudioFlowE2E', () => {
  it('keeps Diagnose -> Plan -> Verify flow stable across all supported kits', () => {
    for (const fixture of INCIDENT_STUDIO_SUPPORTED_KIT_FIXTURES) {
      const openPayload = normalizeIncomingIncidentStudioOpen({
        workspacePath: ` ${fixture.workspacePath} `,
        workspaceName: ` ${fixture.workspaceName} `,
        projectPath: ` ${fixture.projectPath} `,
        projectName: ` ${fixture.projectName} `,
        projectType: ` ${fixture.projectType} `,
        initialQuery: 'diagnose launch blockers token=top-secret',
      });

      expect(openPayload).not.toBeNull();
      expect(openPayload?.projectSelection?.path).toBe(fixture.projectPath);
      expect(openPayload?.initialQuery).toContain('token=[REDACTED]');

      const graph = normalizeIncidentWorkspaceGraphSnapshot(
        buildIncidentWorkspaceGraphFixture(fixture)
      );

      const syncResult = reconcileIncidentStudioSyncSelection(fixture.workspacePath, null, {
        workspacePath: fixture.workspacePath,
        graph,
      });

      expect(syncResult.shouldApply).toBe(true);
      expect(syncResult.selectionChanged).toBe(true);
      expect(syncResult.projectSelection).toEqual({
        path: fixture.projectPath,
        name: fixture.projectName,
        type: fixture.projectType,
      });

      const projectSelection = syncResult.projectSelection as IncidentProjectSelection;

      // Diagnose: query payload must remain project-scoped and sanitized.
      const diagnosePayload = buildIncidentChatQueryPayload({
        conversationId: 'conv-flow-1',
        workspacePath: fixture.workspacePath,
        requestId: 'diag-1',
        message: 'Analyze current errors. authorization: Bearer secret-123',
        projectSelection,
      });

      expect(diagnosePayload).toMatchObject({
        conversationId: 'conv-flow-1',
        workspacePath: fixture.workspacePath,
        projectPath: fixture.projectPath,
        projectName: fixture.projectName,
        projectType: fixture.projectType,
      });
      expect(diagnosePayload.message).toContain('authorization:[REDACTED]');

      // Plan: execution metadata must match the host-side policy classification.
      const planPolicy = classifyIncidentActionPolicy('doctor-fix');
      const planPayload = buildIncidentChatExecuteActionPayload({
        conversationId: 'conv-flow-1',
        actionId: 'action-flow-1',
        actionType: 'doctor-fix',
        workspacePath: fixture.workspacePath,
        requestId: 'plan-1',
        projectSelection,
      });

      expect(planPayload.execution).toEqual(
        expect.objectContaining({
          riskClass: planPolicy.riskClass,
          riskLevel: planPolicy.riskLevel,
          requiresImpactReview: planPolicy.requiresImpactReview,
          requiresVerifyPath: planPolicy.requiresVerifyPath,
          allowCompletionClaimWithoutVerify: planPolicy.allowCompletionClaimWithoutVerify,
        })
      );

      expect(getBoardActionGuardHint(planPayload.execution)).toBe(
        'Verification is required before claiming success.'
      );

      // Verify (pending): result should not be presented as success.
      const verifyPending = normalizeIncidentActionResultPayload({
        success: false,
        verificationRequired: true,
        verifyPolicy: planPayload.execution,
        outputSummary: 'doctor-fix - verification required before completion claim',
      });
      expect(getActionResultPresentation(verifyPending)).toEqual({
        tone: 'warning',
        title: 'Verification required',
        description: 'doctor-fix - verification required before completion claim',
      });

      // Verify (passed): deterministic evidence should flip result presentation to success.
      const verifyPassed = normalizeIncidentActionResultPayload({
        success: true,
        verificationRequired: false,
        verifyPolicy: planPayload.execution,
        outputSummary: 'doctor-fix - result shown in conversation above',
        evidence: {
          source: 'doctor-last-run',
          passed: 6,
          warnings: 0,
          errors: 0,
        },
      });
      expect(verifyPassed.evidence?.errors).toBe(0);
      expect(getActionResultPresentation(verifyPassed)).toEqual({
        tone: 'success',
        title: 'Verification passed',
        description: 'doctor-fix - result shown in conversation above',
      });

      const systemGraphSnapshot = normalizeIncidentSystemGraphSnapshotPayload({
        requestId: 'graph-flow-1',
        workspacePath: fixture.workspacePath,
        projectPath: fixture.projectPath,
        graphVersion: 'v1',
        nodes: fixture.modules.map((moduleName) => ({
          id: `service:${moduleName}`,
          type: 'service',
          label: `${moduleName} service`,
          filePath: `src/${moduleName}`,
          confidence: 70,
        })),
        edges: fixture.modules.slice(0, 1).map((moduleName, index) => ({
          sourceId: `service:${moduleName}`,
          targetId: `service:${fixture.modules[index + 1] || moduleName}`,
          relation: 'depends-on',
        })),
        summary: {
          nodeCount: fixture.modules.length,
          edgeCount: fixture.modules.length > 1 ? 1 : 0,
          supportedTopology: fixture.kit,
        },
      });

      expect(systemGraphSnapshot?.workspacePath).toBe(fixture.workspacePath);
      expect(systemGraphSnapshot?.summary.supportedTopology).toBe(fixture.kit);

      const impactAssessment = normalizeIncidentImpactAssessmentPayload({
        requestId: 'impact-flow-1',
        source: ['graph', 'doctor'],
        confidence: 78,
        riskLevel: planPayload.execution.riskLevel,
        affectedModules: fixture.modules.slice(0, 2),
        affectedFiles: [fixture.projectPath],
        affectedTests: fixture.modules.slice(0, 1).map((name) => `tests/${name}.spec.ts`),
        likelyFailureMode: 'downstream service regression risk',
        verifyChecklist: ['Run deterministic verification command'],
        blockMutationWhenScopeUnknown: true,
      });

      expect(impactAssessment.blockMutationWhenScopeUnknown).toBe(true);
      expect(impactAssessment.affectedModules.length).toBeGreaterThan(0);

      const predictiveWarning = normalizeIncidentPredictiveWarningPayload({
        requestId: 'predictive-flow-1',
        warningId: `warn-${fixture.kit}`,
        confidenceBand: 'medium',
        predictedFailure: 'likely downstream timeout',
        affectedScopeSummary: impactAssessment.affectedModules.join(', '),
        nextSafeAction: 'Run change-impact-lite and verify before apply.',
        verifyChecklist: impactAssessment.verifyChecklist,
        telemetrySeed: {
          predictionKey: `pred-${fixture.kit}`,
          evidenceSources: impactAssessment.sources,
        },
      });

      expect(predictiveWarning.telemetrySeed.predictionKey).toContain(fixture.kit);
      expect(predictiveWarning.verifyChecklist.length).toBeGreaterThan(0);

      const releaseGateEvidence = normalizeIncidentReleaseGateEvidencePayload({
        requestId: 'gate-flow-1',
        scopeKnown: impactAssessment.affectedModules.length > 0,
        verifyPathPresent: impactAssessment.verifyChecklist.length > 0,
        rollbackPathPresent: true,
        confidenceSufficient: impactAssessment.confidence >= 60,
        blockedReasons: [],
      });

      expect(releaseGateEvidence.scopeKnown).toBe(true);
      expect(releaseGateEvidence.verifyPathPresent).toBe(true);
      expect(releaseGateEvidence.confidenceSufficient).toBe(true);
    }
  });

  it('enforces guarded mutate flow for inline-command with warning -> failure progression', () => {
    const policy = classifyIncidentActionPolicy('inline-command');
    expect(policy.requiresImpactReview).toBe(true);
    expect(policy.requiresVerifyPath).toBe(true);

    expect(getBoardActionGuardHint(policy)).toBe(
      'Impact review and verification are required before claiming success.'
    );

    const verifyPending = normalizeIncidentActionResultPayload({
      success: false,
      verificationRequired: true,
      verifyPolicy: policy,
      outputSummary: 'inline-command - verification required before completion claim',
    });
    expect(getActionResultPresentation(verifyPending).tone).toBe('warning');

    const verifyFailed = normalizeIncidentActionResultPayload({
      success: false,
      verificationRequired: false,
      verifyPolicy: policy,
      outputSummary: 'inline-command - command exited with failures',
    });
    expect(getActionResultPresentation(verifyFailed)).toEqual({
      tone: 'failure',
      title: 'Verification failed',
      description: 'inline-command - command exited with failures',
    });

    const rollbackFailure = normalizeIncidentActionResultPayload({
      success: false,
      verificationRequired: false,
      verifyPolicy: policy,
      outputSummary: 'inline-command - rollback attempted after verify failure',
      rollback: {
        attempted: true,
        status: 'succeeded',
        candidateFiles: ['src/orders/service.ts'],
        restoredFiles: ['src/orders/service.ts'],
        failedFiles: [],
      },
    });

    expect(rollbackFailure.rollback).toEqual({
      attempted: true,
      status: 'succeeded',
      reason: undefined,
      attemptedAt: undefined,
      candidateFiles: ['src/orders/service.ts'],
      restoredFiles: ['src/orders/service.ts'],
      failedFiles: [],
      suggestedNextStep: undefined,
    });
    expect(getActionResultPresentation(rollbackFailure).tone).toBe('failure');
  });

  it('guards finalization from duplicate request IDs during verify completion', () => {
    const doneMeta = normalizeIncidentProtocolMeta({
      requestId: ' req-done-1 ',
      version: ' v1 ',
    });

    expect(doneMeta).toEqual({
      requestId: 'req-done-1',
      version: 'v1',
    });

    expect(isIncidentDuplicateRequest('req-done-1', doneMeta.requestId)).toBe(true);
    expect(isIncidentDuplicateRequest('req-done-1', 'req-done-2')).toBe(false);
  });

  it('ignores stale workspace sync payloads during rapid workspace switching', () => {
    const fixture = INCIDENT_STUDIO_SUPPORTED_KIT_FIXTURES[0];
    const otherFixture = INCIDENT_STUDIO_SUPPORTED_KIT_FIXTURES[1];

    const staleSync = reconcileIncidentStudioSyncSelection(fixture.workspacePath, null, {
      workspacePath: otherFixture.workspacePath,
      graph: normalizeIncidentWorkspaceGraphSnapshot(
        buildIncidentWorkspaceGraphFixture(otherFixture)
      ),
    });

    expect(staleSync.shouldApply).toBe(false);
    expect(staleSync.selectionChanged).toBe(false);
    expect(staleSync.projectSelection).toBeNull();
  });

  it('keeps partial-failure payload retry semantics deterministic for stream interruptions', () => {
    const timeoutFailure = normalizeIncidentPartialFailurePayload({
      code: ' TIMEOUT ',
      message: ' Upstream stream timed out ',
      retryable: true,
    });

    expect(timeoutFailure).toEqual({
      code: 'TIMEOUT',
      message: 'Upstream stream timed out',
      retryable: true,
    });

    const duplicateFailure = normalizeIncidentPartialFailurePayload({
      code: ' DUPLICATE_REQUEST ',
      message: ' Duplicate requestId detected ',
      retryable: false,
    });

    expect(duplicateFailure).toEqual({
      code: 'DUPLICATE_REQUEST',
      message: 'Duplicate requestId detected',
      retryable: false,
    });
  });

  it('preserves precise unknown-scope blocked reasons in release gate contract payload', () => {
    const policy = classifyIncidentActionPolicy('inline-command');
    expect(policy.requiresImpactReview).toBe(true);
    expect(policy.requiresVerifyPath).toBe(true);

    const releaseGateEvidence = normalizeIncidentReleaseGateEvidencePayload({
      requestId: ' gate-unknown-1 ',
      scopeKnown: false,
      verifyPathPresent: false,
      rollbackPathPresent: false,
      confidenceSufficient: false,
      blockedReasons: [
        'Affected scope is unknown while impact review is required.',
        'Scope is unknown for an impact-reviewed action.',
        'Verification evidence is missing for a verify-first action.',
        'Affected scope is unknown while impact review is required.',
      ],
    });

    expect(releaseGateEvidence).toEqual({
      requestId: 'gate-unknown-1',
      scopeKnown: false,
      verifyPathPresent: false,
      rollbackPathPresent: false,
      confidenceSufficient: false,
      blockedReasons: [
        'Affected scope is unknown while impact review is required.',
        'Scope is unknown for an impact-reviewed action.',
        'Verification evidence is missing for a verify-first action.',
      ],
    });
  });
});
