/**
 * Project Wizard
 * Interactive wizard for project creation
 */

import * as vscode from 'vscode';
import { ProjectConfig } from '../../types';

export class ProjectWizard {
  async show(): Promise<ProjectConfig | undefined> {
    // Step 1: Project name
    const name = await vscode.window.showInputBox({
      prompt: 'Enter project name',
      placeHolder: 'my-api-project',
      validateInput: (value) => {
        if (!value) {
          return 'Project name is required';
        }
        if (!/^[a-z][a-z0-9-_]*$/.test(value)) {
          return 'Use lowercase letters, numbers, hyphens, and underscores only';
        }
        return null;
      },
    });

    if (!name) {
      return undefined;
    }

    // Step 2: Choose framework
    const frameworkItems = [
      {
        label: '$(symbol-property) FastAPI',
        description: 'Modern Python web framework',
        detail: 'High performance, easy to learn, fast to code',
        framework: 'fastapi' as const,
      },
      {
        label: '$(symbol-class) NestJS',
        description: 'Progressive Node.js framework',
        detail: 'TypeScript-first, modular architecture',
        framework: 'nestjs' as const,
      },
    ];

    const selectedFramework = await vscode.window.showQuickPick(frameworkItems, {
      placeHolder: 'Select framework',
      ignoreFocusOut: true,
    });

    if (!selectedFramework) {
      return undefined;
    }

    const framework = selectedFramework.framework;

    // Note: npm package uses --template flag (fastapi or nestjs)
    // No kit selection needed, templates are fixed

    // Step 4: If NestJS, ask for package manager
    let packageManager: string | undefined;
    if (framework === 'nestjs') {
      const pmItems = [
        {
          label: '$(package) npm',
          description: 'Node Package Manager (default)',
          detail: 'Widely used, comes with Node.js',
          value: 'npm',
          picked: true,
        },
        {
          label: '$(package) yarn',
          description: 'Fast, reliable package manager',
          detail: 'Popular alternative to npm',
          value: 'yarn',
        },
        {
          label: '$(package) pnpm',
          description: 'Fast, disk space efficient',
          detail: 'Modern package manager',
          value: 'pnpm',
        },
      ];

      const selectedPM = await vscode.window.showQuickPick(pmItems, {
        placeHolder: 'Select package manager for NestJS',
        ignoreFocusOut: true,
      });

      if (!selectedPM) {
        return undefined;
      }

      packageManager = selectedPM.value;
    }

    // Note: Module installation will be available after project creation
    // using the workspace CLI

    return {
      name,
      framework,
      packageManager, // For NestJS projects
    };
  }
}
