import { describe, expect, it } from 'vitest';
import {
  buildWorkspaceShareBundleDashboardSummary,
  parseWorkspaceShareBundle,
} from '../utils/workspaceShareBundle';

describe('workspaceShareBundle', () => {
  it('parses valid bundle payload', () => {
    const payload = JSON.stringify({
      schema_version: '1.0',
      workspace: { name: 'team-ws', profile: 'polyglot' },
      summary: { project_count: 2, doctor_evidence_included: true },
      projects: [{ runtime: 'java' }, { runtime: 'node' }],
    });

    const parsed = parseWorkspaceShareBundle(payload);

    expect(parsed.schema_version).toBe('1.0');
    expect(parsed.workspace?.name).toBe('team-ws');
  });

  it('throws when schema_version is missing', () => {
    expect(() => parseWorkspaceShareBundle(JSON.stringify({ projects: [] }))).toThrow(
      'schema_version is required'
    );
  });

  it('builds dashboard summary with runtime and health aggregation', () => {
    const summary = buildWorkspaceShareBundleDashboardSummary(
      {
        schema_version: '1.0',
        generated_at: '2026-01-01T00:00:00.000Z',
        workspace: { name: 'ops-ws', profile: 'enterprise' },
        summary: { project_count: 2, doctor_evidence_included: true },
        projects: [
          {
            runtime: 'java',
            doctor_report: { health: { passed: 10, warnings: 2, errors: 1 } },
          },
          {
            runtime: 'node',
            doctor_report: { health: { passed: 7, warnings: 1, errors: 0 } },
          },
        ],
      },
      '/tmp/share-bundle.json'
    );

    expect(summary.workspaceName).toBe('ops-ws');
    expect(summary.workspaceProfile).toBe('enterprise');
    expect(summary.projectCount).toBe(2);
    expect(summary.runtimes).toEqual(['java', 'node']);
    expect(summary.healthTotals).toEqual({ passed: 17, warnings: 3, errors: 1 });
    expect(summary.sourceFile).toBe('/tmp/share-bundle.json');
  });
});
