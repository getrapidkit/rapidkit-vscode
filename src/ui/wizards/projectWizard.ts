/**
 * Project Wizard
 * Interactive wizard for project creation
 */

import * as vscode from 'vscode';
import { ProjectConfig } from '../../types';
import { ConfigurationManager } from '../../core/configurationManager';

export class ProjectWizard {
  async show(): Promise<ProjectConfig | undefined> {
    const config = ConfigurationManager.getInstance();

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

    // Step 3: Choose kit
    const kitItems = [
      {
        label: `$(file-code) ${framework}.standard`,
        description: 'Recommended for most projects',
        detail: 'Essential features and best practices',
        kit: `${framework}.standard`,
        picked: true,
      },
      {
        label: `$(rocket) ${framework}.advanced`,
        description: 'For complex applications',
        detail: 'All features including advanced patterns',
        kit: `${framework}.advanced`,
        picked: false,
      },
    ];

    const selectedKit = await vscode.window.showQuickPick(kitItems, {
      placeHolder: 'Select project kit',
      ignoreFocusOut: true,
    });

    if (!selectedKit) {
      return undefined;
    }

    const kit = selectedKit.kit;

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

    // Step 5: Select modules (optional)
    const moduleItems = [
      {
        label: '$(shield) Authentication',
        description: 'auth_core',
        picked: false,
        module: 'auth_core',
      },
      {
        label: '$(database) PostgreSQL',
        description: 'db_postgres',
        picked: false,
        module: 'db_postgres',
      },
      {
        label: '$(zap) Redis Cache',
        description: 'redis',
        picked: false,
        module: 'redis',
      },
      {
        label: '$(mail) Notifications',
        description: 'notifications',
        picked: false,
        module: 'notifications',
      },
    ];

    const selectedModules = await vscode.window.showQuickPick(moduleItems, {
      placeHolder: 'Select modules to include (optional)',
      canPickMany: true,
      ignoreFocusOut: true,
    });

    const modules = selectedModules ? selectedModules.map((m) => m.module) : [];

    // Step 5: Author (optional)
    const author = await vscode.window.showInputBox({
      prompt: 'Author name (optional)',
      placeHolder: config.get('author', 'Your Name'),
    });

    return {
      name,
      kit,
      framework,
      packageManager, // For NestJS projects
      modules,
      author: author || undefined,
      license: 'MIT',
      description: `A ${framework} project built with RapidKit`,
    };
  }
}
