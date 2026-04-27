export const INCIDENT_USER_MODES = ['guided', 'standard', 'expert'] as const;

export type IncidentUserMode = (typeof INCIDENT_USER_MODES)[number];
export type IncidentPrimaryCtaMode = 'single' | 'multi';
export type IncidentPrimaryCtaExperimentVariant = IncidentPrimaryCtaMode;

export const DEFAULT_INCIDENT_USER_MODE: IncidentUserMode = 'standard';

export function normalizeIncidentUserMode(value: unknown): IncidentUserMode {
  return INCIDENT_USER_MODES.includes(value as IncidentUserMode)
    ? (value as IncidentUserMode)
    : DEFAULT_INCIDENT_USER_MODE;
}

export function primaryCtaModeForIncidentUserMode(mode: IncidentUserMode): IncidentPrimaryCtaMode {
  return mode === 'expert' ? 'multi' : 'single';
}

export function normalizeIncidentPrimaryCtaExperimentVariant(
  value: unknown
): IncidentPrimaryCtaExperimentVariant | null {
  if (value === 'single' || value === 'multi') {
    return value;
  }
  return null;
}

export function resolveIncidentPrimaryCtaMode(
  mode: IncidentUserMode,
  experimentVariant?: IncidentPrimaryCtaExperimentVariant | null
): IncidentPrimaryCtaMode {
  return experimentVariant || primaryCtaModeForIncidentUserMode(mode);
}
