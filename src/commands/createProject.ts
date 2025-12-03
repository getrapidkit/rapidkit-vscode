/**
 * Create Project Command
 * Interactive wizard for creating a new RapidKit project
 */

import * as vscode from 'vscode';
import { ProjectWizard } from '../ui/wizards/projectWizard';
import { Logger } from '../utils/logger';
import { WorkspaceManager } from '../core/workspaceManager';

export async function createProjectCommand(selectedWorkspacePath?: string) {
  const logger = Logger.getInstance();
  logger.info('Create Project command initiated');

  try {
    // Determine creation mode: workspace or standalone
    let workspaceRoot: string | undefined;
    let creationMode: 'workspace' | 'standalone' = 'standalone';

    if (selectedWorkspacePath) {
      // Use the provided workspace path (from UI)
      workspaceRoot = selectedWorkspacePath;
      creationMode = 'workspace';
    } else {
      // Try to get from WorkspaceManager
      const workspaceManager = WorkspaceManager.getInstance();
      const workspaces = workspaceManager.getWorkspaces();

      if (workspaces.length > 0) {
        // Ask user: create in workspace or standalone?
        const modeChoice = await vscode.window.showQuickPick(
          [
            {
              label: '$(folder) Create in Workspace',
              description: 'Create project inside an existing RapidKit workspace',
              detail: 'Use workspace CLI: rapidkit create <project> --template <template>',
              mode: 'workspace' as const,
            },
            {
              label: '$(file-directory) Create Standalone Project',
              description: 'Create an independent project',
              detail: 'Use: npx rapidkit <project> --template <template>',
              mode: 'standalone' as const,
            },
          ],
          {
            placeHolder: 'Choose project creation mode',
            ignoreFocusOut: true,
          }
        );

        if (!modeChoice) {
          return;
        }

        creationMode = modeChoice.mode;

        // If workspace mode, select which workspace
        if (creationMode === 'workspace') {
          if (workspaces.length === 1) {
            workspaceRoot = workspaces[0].path;
          } else {
            const selected = await vscode.window.showQuickPick(
              workspaces.map((ws) => ({
                label: ws.name,
                description: ws.path,
                workspace: ws,
              })),
              {
                placeHolder: 'Select workspace for the new project',
              }
            );

            if (!selected) {
              return;
            }

            workspaceRoot = selected.workspace.path;
          }
        }
      }
    }

    // Show wizard
    const wizard = new ProjectWizard();
    const config = await wizard.show();

    if (!config) {
      logger.info('Project creation cancelled by user');
      return;
    }

    // Map framework to template
    const template = config.framework === 'fastapi' ? 'fastapi' : 'nestjs';

    // Execute with progress
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Creating ${config.name} project`,
        cancellable: false,
      },
      async (progress) => {
        progress.report({ increment: 0, message: 'Initializing...' });

        try {
          const path = require('path');
          const fs = require('fs-extra');
          const { RapidKitCLI } = await import('../core/rapidkitCLI.js');
          const cli = new RapidKitCLI();

          progress.report({ increment: 20, message: 'Running rapidkit CLI...' });

          let projectPath: string;

          if (creationMode === 'workspace' && workspaceRoot) {
            // Workspace mode: use `rapidkit create`
            logger.info('Creating project in workspace:', workspaceRoot);

            await cli.createProjectInWorkspace({
              name: config.name,
              template: template as 'fastapi' | 'nestjs',
              workspacePath: workspaceRoot,
              skipInstall: false,
            });

            projectPath = path.join(workspaceRoot, config.name);
          } else {
            // Standalone mode: use `npx rapidkit --template`
            logger.info('Creating standalone project');

            // Ask for destination folder
            const defaultPath = path.join(require('os').homedir(), 'Projects');
            const folderUri = await vscode.window.showOpenDialog({
              canSelectFiles: false,
              canSelectFolders: true,
              canSelectMany: false,
              openLabel: 'Select Destination',
              title: 'Select destination folder for project',
              defaultUri: vscode.Uri.file(defaultPath),
            });

            if (!folderUri || folderUri.length === 0) {
              logger.info('Project creation cancelled - no destination selected');
              return;
            }

            const parentPath = folderUri[0].fsPath;

            await cli.createProject({
              name: config.name,
              template: template as 'fastapi' | 'nestjs',
              parentPath: parentPath,
              skipGit: false,
              skipInstall: false,
            });

            projectPath = path.join(parentPath, config.name);
          }

          progress.report({ increment: 70, message: 'Verifying project...' });

          // Wait for file system
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Verify project was created
          if (!(await fs.pathExists(projectPath))) {
            throw new Error(`Project was not created at ${projectPath}`);
          }

          logger.info('Project created successfully at:', projectPath);

          progress.report({ increment: 90, message: 'Refreshing workspace...' });

          // Refresh views
          await vscode.commands.executeCommand('rapidkit.refreshProjects');

          if (creationMode === 'workspace' && workspaceRoot) {
            // Update workspace in manager
            const manager = WorkspaceManager.getInstance();
            await manager.updateWorkspace(workspaceRoot);
            await vscode.commands.executeCommand('rapidkit.refreshWorkspaces');
          }

          progress.report({ increment: 100, message: 'Done!' });

          // Show success with actions
          const openAction = 'Open Project';
          const docsAction = 'View Docs';
          const selected = await vscode.window.showInformationMessage(
            `✅ Project "${config.name}" created successfully!\n\n` +
              `📁 Location: ${projectPath}\n` +
              `🚀 Framework: ${config.framework}\n` +
              `💡 Next: Run 'rapidkit dev' to start development server`,
            openAction,
            docsAction,
            'Close'
          );

          if (selected === openAction) {
            const projectUri = vscode.Uri.file(projectPath);
            await vscode.commands.executeCommand('vscode.openFolder', projectUri, {
              forceNewWindow: false,
            });
          } else if (selected === docsAction) {
            await vscode.env.openExternal(vscode.Uri.parse('https://getrapidkit.com/docs'));
          }
        } catch (error: any) {
          logger.error('Failed to create project:', {
            message: error.message,
            stack: error.stack,
          });

          const errorMessage = error instanceof Error ? error.message : String(error);
          const helpAction = 'Get Help';
          const selected = await vscode.window.showErrorMessage(
            `Failed to create project: ${errorMessage}`,
            helpAction,
            'Close'
          );

          if (selected === helpAction) {
            await vscode.env.openExternal(
              vscode.Uri.parse('https://getrapidkit.com/docs/troubleshooting')
            );
          }
        }
      }
    );
  } catch (error) {
    logger.error('Error in createProjectCommand', error);
    vscode.window.showErrorMessage(
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
