import { describe, expect, it } from 'vitest';

import {
  buildIncidentStudioTelemetryFromCache,
  buildIncidentStudioTelemetryPayload,
  shouldUseIncidentStudioTelemetryCache,
} from '../ui/panels/incidentStudioTelemetry';

describe('incidentStudioTelemetry', () => {
  it('uses cached command/onboarding summaries but always overrides doctor summary with fresh evidence', () => {
    const cachedData = {
      commandSummary: {
        totalEvents: 12,
        lastCommand: 'workspai.aiQuickActions',
        lastCommandAt: '2026-04-25T04:00:00.000Z',
        commandUsage: [{ command: 'workspai.aiQuickActions', count: 12 }],
        surfaceBreakdown: {
          actionEvents: 10,
          askEvents: 2,
          actionVsAskShare: 83.33,
        },
      },
      onboardingSummary: {
        followupShown: 4,
        followupClicked: 2,
        overallFollowupClickThroughRate: 50,
      },
      ctaVariantBreakdown: {
        workspacePath: '/tmp/demo',
        timeWindow: 'last7d',
        windowStartAt: '2026-04-18T04:00:00.000Z',
        windowEndAt: '2026-04-25T04:00:00.000Z',
        variants: [
          {
            variant: 'single',
            loopStarted: 5,
            nextActionClicked: 3,
            actionExecuted: 2,
            verifyPassed: 1,
            verifyFailed: 1,
            verifyCompletionRate: 100,
            actionVsAskShare: 40,
            loopCompleted: 1,
            abandoned: 2,
          },
        ],
      },
      doctorSummary: {
        workspaceName: 'stale-workspace',
        generatedAt: '2026-04-25T03:55:00.000Z',
      },
      timestamp: Date.now(),
    };

    const freshDoctorSummary = {
      workspaceName: 'fresh-workspace',
      generatedAt: '2026-04-25T04:05:00.000Z',
      issueCount: 1,
    };

    expect(buildIncidentStudioTelemetryFromCache(cachedData, freshDoctorSummary)).toEqual({
      commandSummary: cachedData.commandSummary,
      onboardingSummary: cachedData.onboardingSummary,
      ctaVariantBreakdown: cachedData.ctaVariantBreakdown,
      doctorSummary: {
        ...freshDoctorSummary,
        ctaVariantBreakdown: cachedData.ctaVariantBreakdown,
      },
    });
  });

  it('accepts cache only inside ttl and rejects expired entries', () => {
    const now = 1000;
    const ttlMs = 250;

    expect(
      shouldUseIncidentStudioTelemetryCache(
        {
          commandSummary: null,
          onboardingSummary: null,
          doctorSummary: null,
          timestamp: 751,
        },
        now,
        ttlMs
      )
    ).toBe(true);

    expect(
      shouldUseIncidentStudioTelemetryCache(
        {
          commandSummary: null,
          onboardingSummary: null,
          doctorSummary: null,
          timestamp: 750,
        },
        now,
        ttlMs
      )
    ).toBe(false);
  });

  it('builds a stable telemetry payload contract from tracker summaries', () => {
    expect(
      buildIncidentStudioTelemetryPayload(
        {
          totalEvents: 9,
          lastCommand: 'workspai.studio.verify_passed',
          lastCommandAt: '2026-04-25T04:10:00.000Z',
          commandUsage: [{ command: 'workspai.studio.verify_passed', count: 1 }],
          surfaceBreakdown: {
            actionEvents: 9,
            askEvents: 0,
            actionVsAskShare: 100,
          },
        },
        {
          followupShown: 3,
          followupClicked: 1,
          overallFollowupClickThroughRate: 33.33,
        },
        {
          workspacePath: '/tmp/demo',
          timeWindow: 'last7d',
          windowStartAt: '2026-04-18T04:00:00.000Z',
          windowEndAt: '2026-04-25T04:10:00.000Z',
          variants: [
            {
              variant: 'multi',
              loopStarted: 6,
              nextActionClicked: 1,
              actionExecuted: 4,
              verifyPassed: 3,
              verifyFailed: 1,
              verifyCompletionRate: 100,
              actionVsAskShare: 80,
              loopCompleted: 2,
              abandoned: 1,
            },
          ],
        },
        { workspaceName: 'demo' }
      )
    ).toEqual({
      commandSummary: {
        totalEvents: 9,
        lastCommand: 'workspai.studio.verify_passed',
        lastCommandAt: '2026-04-25T04:10:00.000Z',
        commandUsage: [{ command: 'workspai.studio.verify_passed', count: 1 }],
        surfaceBreakdown: {
          actionEvents: 9,
          askEvents: 0,
          actionVsAskShare: 100,
        },
      },
      onboardingSummary: {
        followupShown: 3,
        followupClicked: 1,
        overallFollowupClickThroughRate: 33.33,
      },
      ctaVariantBreakdown: {
        workspacePath: '/tmp/demo',
        timeWindow: 'last7d',
        windowStartAt: '2026-04-18T04:00:00.000Z',
        windowEndAt: '2026-04-25T04:10:00.000Z',
        variants: [
          {
            variant: 'multi',
            loopStarted: 6,
            nextActionClicked: 1,
            actionExecuted: 4,
            verifyPassed: 3,
            verifyFailed: 1,
            verifyCompletionRate: 100,
            actionVsAskShare: 80,
            loopCompleted: 2,
            abandoned: 1,
          },
        ],
      },
      doctorSummary: {
        workspaceName: 'demo',
        ctaVariantBreakdown: {
          workspacePath: '/tmp/demo',
          timeWindow: 'last7d',
          windowStartAt: '2026-04-18T04:00:00.000Z',
          windowEndAt: '2026-04-25T04:10:00.000Z',
          variants: [
            {
              variant: 'multi',
              loopStarted: 6,
              nextActionClicked: 1,
              actionExecuted: 4,
              verifyPassed: 3,
              verifyFailed: 1,
              verifyCompletionRate: 100,
              actionVsAskShare: 80,
              loopCompleted: 2,
              abandoned: 1,
            },
          ],
        },
      },
    });
  });
});
