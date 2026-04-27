export function buildIncidentFirstResponseRules(input: {
  projectScoped: boolean;
  hasDoctorEvidence: boolean;
  framework?: string;
}): string[] {
  if (!input.projectScoped) {
    return [];
  }

  const rules: string[] = [
    'FIRST RESPONSE POLICY: Assume the user may be non-technical and needs a launch roadmap, not abstract architecture commentary.',
    'In `What happened`, begin with plain-language stage text: `Stage: <blocked|setup|ready-to-run>` and one sentence explaining current state.',
    'In `Why`, avoid jargon. If a technical term is necessary, explain it in simple words in the same line.',
    'In `Next command`, output one practical command that advances the user exactly one step toward a running service.',
    'Use this sequence explicitly when relevant: install dependencies -> init -> dev -> verify.',
    'If the project is blocked, name the blocker first, then the exact command or setup action to remove it.',
  ];

  if (!input.hasDoctorEvidence) {
    rules.push(
      'No doctor evidence exists yet. Do not default to generic workspace advice; infer launch readiness from selected project files and framework blockers.'
    );
  }

  if (input.framework === 'springboot') {
    rules.push(
      'For Spring Boot, prioritize wrapper/build-tool readiness and never recommend `rapidkit dev` before Maven/Gradle prerequisites are satisfied.'
    );
  }

  return rules;
}
