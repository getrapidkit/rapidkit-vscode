/**
 * Add Module Command
 * Add a module to an existing project
 */

import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { RapidKitModule } from '../types';

export async function addModuleCommand(module?: RapidKitModule) {
  const logger = Logger.getInstance();
  logger.info('Add Module command initiated', module);

  try {
    // If no module provided, show quick pick
    if (!module) {
      const selectedModule = await showModulePicker();
      if (!selectedModule) {
        return;
      }
      module = selectedModule;
    }

    // Check dependencies
    if (module.dependencies.length > 0) {
      const deps = module.dependencies.join(', ');
      const proceed = await vscode.window.showWarningMessage(
        `This module requires: ${deps}. Continue?`,
        'Yes',
        'No'
      );
      if (proceed !== 'Yes') {
        return;
      }
    }

    // Add module with progress
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Adding module: ${module.displayName}`,
        cancellable: false,
      },
      async (progress) => {
        progress.report({ increment: 0, message: 'Installing module...' });

        try {
          // Here we would call rapidkit add module command
          // For now, show success
          await new Promise((resolve) => setTimeout(resolve, 2000));

          progress.report({ increment: 100, message: 'Done!' });

          // Show success with actions
          const viewDocsAction = '📖 View Module Docs';
          const addMoreAction = '➕ Add Another Module';

          const selected = await vscode.window.showInformationMessage(
            `✅ Module "${module!.displayName}" added successfully!`,
            { modal: false },
            viewDocsAction,
            addMoreAction
          );

          // Refresh project explorer
          await vscode.commands.executeCommand('rapidkit.refreshProjects');

          if (selected === viewDocsAction) {
            await vscode.env.openExternal(
              vscode.Uri.parse(`https://getrapidkit.com/docs/modules/${module!.id}`)
            );
          } else if (selected === addMoreAction) {
            await vscode.commands.executeCommand('rapidkit.addModule');
          }
        } catch (error) {
          logger.error('Failed to add module', error);
          vscode.window.showErrorMessage(
            `Failed to add module: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    );
  } catch (error) {
    logger.error('Error in addModuleCommand', error);
    vscode.window.showErrorMessage(
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function showModulePicker(): Promise<RapidKitModule | undefined> {
  // Mock module list - In production, this will be fetched from API
  const modules: RapidKitModule[] = [
    {
      id: 'auth_core',
      name: 'auth_core',
      displayName: 'Authentication Core',
      version: '0.1.1',
      description: 'Password hashing and token signing',
      category: 'auth',
      status: 'stable',
      tags: [],
      dependencies: [],
      installed: false,
    },
    {
      id: 'db_postgres',
      name: 'db_postgres',
      displayName: 'PostgreSQL',
      version: '1.0.17',
      description: 'SQLAlchemy PostgreSQL integration',
      category: 'database',
      status: 'stable',
      tags: [],
      dependencies: [],
      installed: false,
    },
  ];

  const selected = await vscode.window.showQuickPick(
    modules.map((m) => ({
      label: `$(extensions) ${m.displayName}`,
      description: `v${m.version}`,
      detail: m.description,
      module: m,
    })),
    {
      placeHolder: 'Select a module to add',
      matchOnDescription: true,
      matchOnDetail: true,
    }
  );

  return selected?.module;
}
