/**
 * Generate Demo Command
 * Simplified wrapper to create a FastAPI demo project using npm package
 * Uses: npx rapidkit <project> --template fastapi
 */

import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { RapidKitCLI } from '../core/rapidkitCLI';
import { WorkspaceManager } from '../core/workspaceManager';
import * as path from 'path';
import * as fs from 'fs-extra';

export async function generateDemoCommand(workspace?: { path: string; mode: string }) {
  const logger = Logger.getInstance();
  logger.info('Generate Demo command initiated');

  try {
    // Get project name
    const projectName = await vscode.window.showInputBox({
      prompt: 'Enter demo project name',
      placeHolder: 'my-demo-api',
      validateInput: (value) => {
        if (!value) {
          return 'Project name is required';
        }
        if (!/^[a-z][a-z0-9-]*$/.test(value)) {
          return 'Use lowercase letters, numbers, and hyphens only';
        }
        return null;
      },
    });

    if (!projectName) {
      return;
    }

    // Determine destination: workspace or custom folder
    let destinationPath: string;
    let isWorkspaceMode = false;

    if (workspace) {
      // Use provided workspace
      destinationPath = workspace.path;
      isWorkspaceMode = true;
      logger.info('Using workspace mode:', destinationPath);
    } else {
      // Check if user has workspaces
      const workspaceManager = WorkspaceManager.getInstance();
      const workspaces = workspaceManager.getWorkspaces();

      if (workspaces.length > 0) {
        // Ask: workspace or standalone?
        const modeChoice = await vscode.window.showQuickPick(
          [
            {
              label: '$(folder) Create in Workspace',
              description: 'Create demo inside an existing workspace',
              mode: 'workspace' as const,
            },
            {
              label: '$(file-directory) Create Standalone',
              description: 'Create demo in a custom folder',
              mode: 'standalone' as const,
            },
          ],
          {
            placeHolder: 'Where to create the demo project?',
            ignoreFocusOut: true,
          }
        );

        if (!modeChoice) {
          return;
        }

        if (modeChoice.mode === 'workspace') {
          // Select workspace
          if (workspaces.length === 1) {
            destinationPath = workspaces[0].path;
          } else {
            const selected = await vscode.window.showQuickPick(
              workspaces.map((ws) => ({
                label: ws.name,
                description: ws.path,
                workspace: ws,
              })),
              {
                placeHolder: 'Select workspace',
              }
            );

            if (!selected) {
              return;
            }

            destinationPath = selected.workspace.path;
          }
          isWorkspaceMode = true;
        } else {
          // Custom folder
          const folderUri = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Select Destination',
            title: 'Select destination folder',
          });

          if (!folderUri || folderUri.length === 0) {
            return;
          }

          destinationPath = folderUri[0].fsPath;
          isWorkspaceMode = false;
        }
      } else {
        // No workspaces - ask for folder
        const folderUri = await vscode.window.showOpenDialog({
          canSelectFiles: false,
          canSelectFolders: true,
          canSelectMany: false,
          openLabel: 'Select Destination',
          title: 'Select destination folder for demo project',
        });

        if (!folderUri || folderUri.length === 0) {
          return;
        }

        destinationPath = folderUri[0].fsPath;
        isWorkspaceMode = false;
      }
    }

    // Generate with progress
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Generating demo project: ${projectName}`,
        cancellable: false,
      },
      async (progress) => {
        progress.report({ increment: 0, message: 'Initializing...' });

        try {
          const cli = new RapidKitCLI();
          let projectPath: string;

          progress.report({ increment: 20, message: 'Running rapidkit CLI...' });

          if (isWorkspaceMode) {
            // Workspace mode: use rapidkit create
            logger.info('Creating demo in workspace:', destinationPath);

            await cli.createProjectInWorkspace({
              name: projectName,
              template: 'fastapi',
              workspacePath: destinationPath,
              skipInstall: false,
            });

            projectPath = path.join(destinationPath, projectName);
          } else {
            // Standalone mode: use npx rapidkit --template fastapi
            logger.info('Creating standalone demo project');

            await cli.createProject({
              name: projectName,
              template: 'fastapi',
              parentPath: destinationPath,
              skipGit: false,
              skipInstall: false,
            });

            projectPath = path.join(destinationPath, projectName);
          }

          progress.report({ increment: 70, message: 'Verifying project...' });

          // Wait for file system
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Verify project was created
          const projectExists = await fs.pathExists(projectPath);
          if (!projectExists) {
            throw new Error(`Project was not created at ${projectPath}`);
          }

          logger.info('Demo project created successfully:', projectPath);

          progress.report({ increment: 90, message: 'Refreshing views...' });

          // Refresh views
          await vscode.commands.executeCommand('rapidkit.refreshProjects');

          if (isWorkspaceMode) {
            const manager = WorkspaceManager.getInstance();
            await manager.updateWorkspace(destinationPath);
            await vscode.commands.executeCommand('rapidkit.refreshWorkspaces');
          }

          progress.report({ increment: 100, message: 'Done!' });

          // Show success with actions
          const openAction = 'Open Project';
          const docsAction = 'View Docs';
          const selected = await vscode.window.showInformationMessage(
            `✅ Demo project "${projectName}" created successfully!\n\n` +
              `📁 Location: ${projectPath}\n` +
              `🚀 Framework: FastAPI\n` +
              `💡 Next: Run 'rapidkit dev' to start development server`,
            openAction,
            docsAction,
            'Close'
          );

          if (selected === openAction) {
            const uri = vscode.Uri.file(projectPath);
            await vscode.commands.executeCommand('vscode.openFolder', uri, false);
          } else if (selected === docsAction) {
            await vscode.env.openExternal(vscode.Uri.parse('https://getrapidkit.com/docs'));
          }
        } catch (error) {
          logger.error('Failed to generate demo project', error);

          const errorMessage = error instanceof Error ? error.message : String(error);
          const helpAction = 'Get Help';
          const result = await vscode.window.showErrorMessage(
            `Failed to generate demo project: ${errorMessage}`,
            helpAction,
            'Close'
          );

          if (result === helpAction) {
            await vscode.env.openExternal(
              vscode.Uri.parse('https://getrapidkit.com/docs/troubleshooting')
            );
          }
        }
      }
    );
  } catch (error) {
    logger.error('Error in generateDemoCommand', error);
    vscode.window.showErrorMessage(
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
