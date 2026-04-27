import { describe, expect, it } from 'vitest';

import {
  getActionResultPresentation,
  getBoardActionGuardHint,
} from '../../webview-ui/src/lib/incidentStudioVerifyPolicy';

describe('incidentStudioVerifyPolicy', () => {
  it('flags guarded actions that require both impact review and verification', () => {
    expect(
      getBoardActionGuardHint({
        requiresImpactReview: true,
        requiresVerifyPath: true,
      })
    ).toBe('Impact review and verification are required before claiming success.');
  });

  it('returns a warning presentation when verification is still required', () => {
    expect(
      getActionResultPresentation({
        success: false,
        verificationRequired: true,
        verifyPolicy: {
          requiresVerifyPath: true,
          allowCompletionClaimWithoutVerify: false,
        },
        outputSummary: 'inline-command - verification required before completion claim',
      })
    ).toEqual({
      tone: 'warning',
      title: 'Verification required',
      description: 'inline-command - verification required before completion claim',
    });
  });

  it('preserves failure presentation when execution genuinely fails', () => {
    expect(
      getActionResultPresentation({
        success: false,
        outputSummary: 'doctor-fix - command exited with failures',
      })
    ).toEqual({
      tone: 'failure',
      title: 'Verification failed',
      description: 'doctor-fix - command exited with failures',
    });
  });
});
