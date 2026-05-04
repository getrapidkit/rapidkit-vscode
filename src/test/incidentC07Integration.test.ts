import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { describe, expect, it, vi } from 'vitest';

import { ByopDiscoveryEngine } from '../core/byopDiscovery';
import { evaluateIncidentC07Gates } from '../core/incidentC07Integration';

function createTempProject(prefix: string): string {
  const projectPath = path.join(
    os.tmpdir(),
    `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
  fs.mkdirSync(projectPath, { recursive: true });
  return projectPath;
}

describe('Incident C07 integration', () => {
  it('evaluates C07 gates for known native mapping scope', async () => {
    const projectPath = createTempProject('incident-c07-known');
    fs.mkdirSync(path.join(projectPath, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(projectPath, 'package.json'),
      JSON.stringify(
        {
          name: 'incident-c07-known',
          version: '1.0.0',
          dependencies: {
            express: '^4.19.2',
          },
        },
        null,
        2
      )
    );
    fs.writeFileSync(
      path.join(projectPath, 'src', 'app.js'),
      "const express = require('express');\nconst app = express();\napp.get('/health', (req, res) => res.json({ ok: true }));\nmodule.exports = app;\n"
    );

    const result = await evaluateIncidentC07Gates({
      workspacePath: projectPath,
      projectPath,
      actionType: 'apply-debug-patch',
      actionPolicy: {
        riskClass: 'guarded-mutating',
        riskLevel: 'medium',
        requiresImpactReview: true,
        requiresVerifyPath: true,
      },
      verifyReady: true,
      verifySuccess: true,
      verifyChecklist: ['Run integration tests and capture verify evidence.'],
      rollbackApproved: true,
    });

    expect(result.evaluated).toBe(true);
    expect(result.scopeBlocked).toBe(false);
    expect(
      result.blockedReasons.some((reason) => /scope is unknown|scope is uncertain/i.test(reason))
    ).toBe(false);
  });

  it('blocks mutating flow when mapping scope is unknown', async () => {
    const projectPath = createTempProject('incident-c07-unknown');
    fs.writeFileSync(path.join(projectPath, 'README.md'), '# minimal project\n');

    const result = await evaluateIncidentC07Gates({
      workspacePath: projectPath,
      projectPath,
      actionType: 'apply-debug-patch',
      actionPolicy: {
        riskClass: 'guarded-mutating',
        riskLevel: 'medium',
        requiresImpactReview: true,
        requiresVerifyPath: true,
      },
      verifyReady: true,
      verifySuccess: true,
      verifyChecklist: ['Run deterministic verify command and capture output evidence.'],
      rollbackApproved: true,
    });

    expect(result.evaluated).toBe(true);
    expect(result.scopeBlocked).toBe(true);
    expect(
      result.blockedReasons.some((reason) => /scope is unknown|scope is uncertain/i.test(reason))
    ).toBe(true);
  });

  it('returns a non-evaluated result when project root cannot be resolved', async () => {
    const workspacePath = createTempProject('incident-c07-missing');

    const result = await evaluateIncidentC07Gates({
      workspacePath,
      projectPath: 'missing/project/path',
      actionType: 'doctor-fix',
      actionPolicy: {
        riskClass: 'non-mutating-executable',
        riskLevel: 'low',
        requiresImpactReview: false,
        requiresVerifyPath: false,
      },
      verifyReady: false,
      verifySuccess: false,
      verifyChecklist: [],
    });

    expect(result).toEqual({
      evaluated: false,
      scopeBlocked: false,
      blockedReasons: [],
    });
  });

  it('fails closed for mutating actions when C07 evaluation throws', async () => {
    const projectPath = createTempProject('incident-c07-failsafe-mutating');
    const discoverSpy = vi
      .spyOn(ByopDiscoveryEngine.prototype, 'discover')
      .mockRejectedValue(new Error('simulated discovery failure'));

    try {
      const result = await evaluateIncidentC07Gates({
        workspacePath: projectPath,
        projectPath,
        actionType: 'apply-debug-patch',
        actionPolicy: {
          riskClass: 'guarded-mutating',
          riskLevel: 'high',
          requiresImpactReview: true,
          requiresVerifyPath: true,
        },
        verifyReady: false,
        verifySuccess: false,
        verifyChecklist: [],
      });

      expect(result.evaluated).toBe(false);
      expect(result.scopeBlocked).toBe(true);
      expect(result.blockedReasons).toContain(
        'C07 gate evaluation unavailable; block mutation until architecture scope is confirmed.'
      );
    } finally {
      discoverSpy.mockRestore();
    }
  });

  it('does not block non-mutating actions when C07 evaluation throws', async () => {
    const projectPath = createTempProject('incident-c07-failsafe-non-mutating');
    const discoverSpy = vi
      .spyOn(ByopDiscoveryEngine.prototype, 'discover')
      .mockRejectedValue(new Error('simulated discovery failure'));

    try {
      const result = await evaluateIncidentC07Gates({
        workspacePath: projectPath,
        projectPath,
        actionType: 'release-readiness-commander',
        actionPolicy: {
          riskClass: 'non-mutating-executable',
          riskLevel: 'medium',
          requiresImpactReview: false,
          requiresVerifyPath: false,
        },
        verifyReady: true,
        verifySuccess: true,
        verifyChecklist: [],
      });

      expect(result.evaluated).toBe(false);
      expect(result.scopeBlocked).toBe(false);
      expect(result.blockedReasons).toEqual([]);
    } finally {
      discoverSpy.mockRestore();
    }
  });
});
