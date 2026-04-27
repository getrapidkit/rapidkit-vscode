export type IncidentStudioBoardActionPolicy = {
  requiresImpactReview?: boolean;
  requiresVerifyPath?: boolean;
};

export type IncidentStudioActionResultPolicy = {
  success: boolean;
  outputSummary?: string;
  verificationRequired?: boolean;
  verifyPolicy?: {
    requiresVerifyPath?: boolean;
    requiresImpactReview?: boolean;
    allowCompletionClaimWithoutVerify?: boolean;
  };
};

export type IncidentStudioActionResultPresentation = {
  tone: 'success' | 'warning' | 'failure';
  title: string;
  description: string;
};

export function getBoardActionGuardHint(action: IncidentStudioBoardActionPolicy): string | null {
  if (action.requiresImpactReview && action.requiresVerifyPath) {
    return 'Impact review and verification are required before claiming success.';
  }
  if (action.requiresVerifyPath) {
    return 'Verification is required before claiming success.';
  }
  if (action.requiresImpactReview) {
    return 'Review impact before applying this action.';
  }
  return null;
}

export function getActionResultPresentation(
  result: IncidentStudioActionResultPolicy
): IncidentStudioActionResultPresentation {
  if (result.verificationRequired && result.verifyPolicy?.requiresVerifyPath) {
    return {
      tone: 'warning',
      title: 'Verification required',
      description:
        result.outputSummary ||
        'A result was returned, but verification is still required before claiming success.',
    };
  }

  if (result.success) {
    return {
      tone: 'success',
      title: 'Verification passed',
      description: result.outputSummary || 'Action completed successfully and result was returned.',
    };
  }

  return {
    tone: 'failure',
    title: 'Verification failed',
    description:
      result.outputSummary ||
      'Action completed with failures. Review output and retry with a safer path.',
  };
}
