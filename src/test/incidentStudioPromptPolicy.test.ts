import { describe, expect, it } from 'vitest';

import { buildIncidentFirstResponseRules } from '../ui/panels/incidentStudioPromptPolicy';

describe('incidentStudioPromptPolicy', () => {
  it('returns no extra rules for workspace-scoped mode', () => {
    expect(
      buildIncidentFirstResponseRules({
        projectScoped: false,
        hasDoctorEvidence: true,
      })
    ).toEqual([]);
  });

  it('injects non-technical launch-roadmap guidance for project-scoped first response', () => {
    const rules = buildIncidentFirstResponseRules({
      projectScoped: true,
      hasDoctorEvidence: false,
      framework: 'fastapi',
    });

    expect(rules.some((line) => line.includes('non-technical'))).toBe(true);
    expect(rules.some((line) => line.includes('Stage: <blocked|setup|ready-to-run>'))).toBe(true);
    expect(
      rules.some((line) => line.includes('install dependencies -> init -> dev -> verify'))
    ).toBe(true);
    expect(rules.some((line) => line.includes('No doctor evidence exists yet'))).toBe(true);
  });

  it('adds spring-specific blocker rule in project-scoped mode', () => {
    const rules = buildIncidentFirstResponseRules({
      projectScoped: true,
      hasDoctorEvidence: true,
      framework: 'springboot',
    });

    expect(rules.some((line) => line.includes('Spring Boot'))).toBe(true);
    expect(rules.some((line) => line.includes('never recommend `rapidkit dev`'))).toBe(true);
  });
});
