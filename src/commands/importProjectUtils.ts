export type StackConfidence = 'high' | 'medium' | 'low';
export type DetectedStack = 'fastapi' | 'nestjs' | 'go' | 'springboot' | 'unknown';

export interface StackDetection {
  stack: DetectedStack;
  confidence: StackConfidence;
}

export interface ProjectSignals {
  hasPyProject: boolean;
  hasGoMod: boolean;
  hasPomXml: boolean;
  hasGradle: boolean;
  hasGradleKts: boolean;
  hasPackageJson: boolean;
  hasNestDependency: boolean;
}

export function normalizeProjectName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\.git$/i, '')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '')
    .slice(0, 64);
}

export function detectProjectStackFromSignals(signals: ProjectSignals): StackDetection {
  if (signals.hasPyProject) {
    return { stack: 'fastapi', confidence: 'high' };
  }

  if (signals.hasNestDependency) {
    return { stack: 'nestjs', confidence: 'high' };
  }

  if (signals.hasPackageJson) {
    return { stack: 'unknown', confidence: 'medium' };
  }

  if (signals.hasGoMod) {
    return { stack: 'go', confidence: 'high' };
  }

  if (signals.hasPomXml || signals.hasGradle || signals.hasGradleKts) {
    return { stack: 'springboot', confidence: 'high' };
  }

  return { stack: 'unknown', confidence: 'low' };
}

export function deriveProjectNameFromGitUrl(gitUrl: string): string {
  const trimmed = gitUrl.trim();
  if (!trimmed) {
    return 'imported-project';
  }

  const slashBased = trimmed.replace(/\\/g, '/').replace(/\/+$/, '').split('/');
  const lastSlashSegment = slashBased[slashBased.length - 1] || trimmed;

  const colonSegments = lastSlashSegment.split(':');
  const candidate = (colonSegments[colonSegments.length - 1] || lastSlashSegment).replace(
    /\.git$/i,
    ''
  );

  const normalized = normalizeProjectName(candidate);
  return normalized || 'imported-project';
}
