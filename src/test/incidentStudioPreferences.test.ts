import { describe, expect, it } from 'vitest';

import {
  DEFAULT_INCIDENT_USER_MODE,
  normalizeIncidentPrimaryCtaExperimentVariant,
  normalizeIncidentUserMode,
  primaryCtaModeForIncidentUserMode,
  resolveIncidentPrimaryCtaMode,
} from '../../webview-ui/src/lib/incidentStudioPreferences';

describe('incidentStudioPreferences', () => {
  it('normalizes persisted incident user mode values and falls back safely', () => {
    expect(normalizeIncidentUserMode('guided')).toBe('guided');
    expect(normalizeIncidentUserMode('standard')).toBe('standard');
    expect(normalizeIncidentUserMode('expert')).toBe('expert');
    expect(normalizeIncidentUserMode('invalid-mode')).toBe(DEFAULT_INCIDENT_USER_MODE);
    expect(normalizeIncidentUserMode(undefined)).toBe(DEFAULT_INCIDENT_USER_MODE);
    expect(normalizeIncidentUserMode(null)).toBe(DEFAULT_INCIDENT_USER_MODE);
  });

  it('keeps expert mode multi-cta while guided and standard remain single-cta', () => {
    expect(primaryCtaModeForIncidentUserMode('guided')).toBe('single');
    expect(primaryCtaModeForIncidentUserMode('standard')).toBe('single');
    expect(primaryCtaModeForIncidentUserMode('expert')).toBe('multi');
  });

  it('normalizes experiment variants and rejects invalid values', () => {
    expect(normalizeIncidentPrimaryCtaExperimentVariant('single')).toBe('single');
    expect(normalizeIncidentPrimaryCtaExperimentVariant('multi')).toBe('multi');
    expect(normalizeIncidentPrimaryCtaExperimentVariant('guided')).toBeNull();
    expect(normalizeIncidentPrimaryCtaExperimentVariant(undefined)).toBeNull();
  });

  it('lets experiment variant override mode-derived cta mapping', () => {
    expect(resolveIncidentPrimaryCtaMode('guided', null)).toBe('single');
    expect(resolveIncidentPrimaryCtaMode('expert', null)).toBe('multi');
    expect(resolveIncidentPrimaryCtaMode('guided', 'multi')).toBe('multi');
    expect(resolveIncidentPrimaryCtaMode('expert', 'single')).toBe('single');
  });
});
