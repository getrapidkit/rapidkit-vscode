import { describe, expect, it } from 'vitest';

import { reconcileIncidentStudioSyncSelection } from '../../webview-ui/src/lib/incidentStudioLifecycle';
import {
  INCIDENT_STUDIO_SUPPORTED_KIT_FIXTURES,
  buildIncidentWorkspaceGraphFixture,
} from './fixtures/incidentStudioGraphFixtures';

describe('incidentStudio stress gate', () => {
  it('remains deterministic across repeated workspace switching and stale sync payloads', () => {
    const fixtures = INCIDENT_STUDIO_SUPPORTED_KIT_FIXTURES.slice(0, 3);
    let activeWorkspacePath = fixtures[0].workspacePath;
    let currentProjectPath: string | null = null;

    for (let iteration = 0; iteration < 180; iteration += 1) {
      const activeFixture = fixtures[iteration % fixtures.length];
      const staleFixture = fixtures[(iteration + 1) % fixtures.length];

      activeWorkspacePath = activeFixture.workspacePath;

      const staleSelection = reconcileIncidentStudioSyncSelection(
        activeWorkspacePath,
        currentProjectPath,
        {
          workspacePath: staleFixture.workspacePath,
          selectedProjectPath: staleFixture.projectPath,
          graph: buildIncidentWorkspaceGraphFixture(staleFixture),
        }
      );

      expect(staleSelection).toEqual({
        shouldApply: false,
        selectionChanged: false,
        projectSelection: null,
      });

      const validSelection = reconcileIncidentStudioSyncSelection(
        activeWorkspacePath,
        currentProjectPath,
        {
          workspacePath: activeFixture.workspacePath,
          selectedProjectPath: activeFixture.projectPath,
          graph: buildIncidentWorkspaceGraphFixture(activeFixture),
        }
      );

      expect(validSelection.shouldApply).toBe(true);
      expect(validSelection.projectSelection?.path).toBe(activeFixture.projectPath);
      expect(validSelection.projectSelection?.name).toBe(activeFixture.projectName);
      expect(validSelection.projectSelection?.type).toBe(activeFixture.projectType);

      currentProjectPath = validSelection.projectSelection?.path ?? null;
    }
  });

  it('tracks cross-project drift transitions inside the same workspace without dropping scope', () => {
    const base = INCIDENT_STUDIO_SUPPORTED_KIT_FIXTURES[0];
    const workspacePath = base.workspacePath;
    const projectA = `${workspacePath}/orders-api`;
    const projectB = `${workspacePath}/billing-api`;

    let currentProjectPath: string | null = null;

    const firstSelection = reconcileIncidentStudioSyncSelection(workspacePath, currentProjectPath, {
      workspacePath,
      selectedProjectPath: projectA,
      graph: {
        ...buildIncidentWorkspaceGraphFixture(base),
        workspace: {
          path: workspacePath,
          name: base.workspaceName,
        },
        project: {
          framework: base.framework,
          kit: base.kit,
          selectedProject: {
            path: projectA,
            name: 'orders-api',
            type: base.projectType,
          },
        },
      },
    });

    expect(firstSelection.shouldApply).toBe(true);
    expect(firstSelection.selectionChanged).toBe(true);
    expect(firstSelection.projectSelection?.path).toBe(projectA);

    currentProjectPath = firstSelection.projectSelection?.path ?? null;

    const driftSelection = reconcileIncidentStudioSyncSelection(workspacePath, currentProjectPath, {
      workspacePath,
      selectedProjectPath: projectB,
      graph: {
        ...buildIncidentWorkspaceGraphFixture(base),
        workspace: {
          path: workspacePath,
          name: base.workspaceName,
        },
        project: {
          framework: base.framework,
          kit: base.kit,
          selectedProject: {
            path: projectB,
            name: 'billing-api',
            type: base.projectType,
          },
        },
      },
    });

    expect(driftSelection.shouldApply).toBe(true);
    expect(driftSelection.selectionChanged).toBe(true);
    expect(driftSelection.projectSelection?.path).toBe(projectB);
    expect(driftSelection.projectSelection?.name).toBe('billing-api');

    currentProjectPath = driftSelection.projectSelection?.path ?? null;

    const keepSelection = reconcileIncidentStudioSyncSelection(workspacePath, currentProjectPath, {
      workspacePath,
      selectedProjectPath: projectB,
      graph: {
        ...buildIncidentWorkspaceGraphFixture(base),
        workspace: {
          path: workspacePath,
          name: base.workspaceName,
        },
        project: {
          framework: base.framework,
          kit: base.kit,
          selectedProject: {
            path: projectB,
            name: 'billing-api',
            type: base.projectType,
          },
        },
      },
    });

    expect(keepSelection.shouldApply).toBe(true);
    expect(keepSelection.selectionChanged).toBe(false);
    expect(keepSelection.projectSelection?.path).toBe(projectB);
  });
});
