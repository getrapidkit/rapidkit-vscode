/**
 * Project Wizard
 * Interactive wizard for project creation
 */

import * as vscode from 'vscode';
import { ProjectConfig } from '../../types';

export class ProjectWizard {
  async show(preselectedFramework?: 'fastapi' | 'nestjs'): Promise<ProjectConfig | undefined> {
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

    // Step 2: Choose framework (skip if preselected)
    let framework: 'fastapi' | 'nestjs';

    if (preselectedFramework) {
      framework = preselectedFramework;
    } else {
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

      framework = selectedFramework.framework;
    }

    // Maps to kit slug: fastapi → fastapi.standard, nestjs → nestjs.standard (npx rapidkit create project <kit> <name> --output .)
    // Always use npm as default package manager

    return {
      name,
      framework,
      packageManager: 'npm', // Always use npm (default)
    };
  }
}
