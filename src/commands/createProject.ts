/**
 * Create Project Command
 * Interactive wizard for creating a new RapidKit project
 */

import * as vscode from 'vscode';
import { ProjectWizard } from '../ui/wizards/projectWizard';
import { Logger } from '../utils/logger';
import { WorkspaceManager } from '../core/workspaceManager';
import { getExtensionVersion, MARKERS } from '../utils/constants';

export async function createProjectCommand(
  selectedWorkspacePath?: string,
  preselectedFramework?: 'fastapi' | 'nestjs'
) {
  const logger = Logger.getInstance();
  logger.info('Create Project command initiated', { preselectedFramework });

  try {
    const path = require('path');
    const os = require('os');

    // Determine workspace: use selected, or ask user
    let workspaceRoot: string;

    if (selectedWorkspacePath) {
      // Use the provided workspace path (from UI or selected workspace)
      workspaceRoot = selectedWorkspacePath;
    } else {
      // Check if currently in a RapidKit workspace
      const currentWorkspace = vscode.workspace.workspaceFolders?.[0];
      const isInRapidKitWorkspace = currentWorkspace?.uri.fsPath.includes('.rapidkit');

      if (isInRapidKitWorkspace && currentWorkspace) {
        // Already in RapidKit workspace, use it
        workspaceRoot = currentWorkspace.uri.fsPath;
        logger.info('Using current RapidKit workspace:', workspaceRoot);
      } else {
        // Ask user for location preference
        const locationChoice = await vscode.window.showQuickPick(
          [
            {
              label: '$(home) Default Location',
              description: 'Recommended for quick start',
              detail: '~/RapidKit/rapidkits/',
              value: 'default',
            },
            {
              label: '$(folder-opened) Custom Location',
              description: 'Choose your own directory',
              detail: 'Select where to create the project',
              value: 'custom',
            },
          ],
          {
            placeHolder: 'Where do you want to create the project?',
            ignoreFocusOut: true,
          }
        );

        if (!locationChoice) {
          logger.info('Project creation cancelled - no location selected');
          return;
        }

        if (locationChoice.value === 'custom') {
          // User wants to choose custom location
          const folderUri = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Select Location',
            title: 'Select location for project',
            defaultUri: vscode.Uri.file(path.join(os.homedir(), 'Projects')),
          });

          if (!folderUri || folderUri.length === 0) {
            logger.info('Project creation cancelled - no folder selected');
            return;
          }

          workspaceRoot = folderUri[0].fsPath;
          logger.info('Using custom location:', workspaceRoot);

          // Check if custom location is a RapidKit workspace, if not treat as standalone location
          const fs = require('fs-extra');
          const rapidkitDir = path.join(workspaceRoot, '.rapidkit');
          const markerPath = path.join(workspaceRoot, '.rapidkit-workspace');
          const hasRapidkitMarker =
            (await fs.pathExists(rapidkitDir)) || (await fs.pathExists(markerPath));

          if (!hasRapidkitMarker) {
            logger.info(
              'Custom location is not a workspace, creating marker for extension recognition'
            );

            // Create marker file so extension can recognize this custom location
            await fs.writeJson(markerPath, {
              signature: MARKERS.WORKSPACE_SIGNATURE,
              version: getExtensionVersion(),
              type: 'custom-location',
              created: new Date().toISOString(),
            });

            logger.info('Created marker file at:', markerPath);
          }
        } else {
          // Use default workspace: ~/RapidKit/rapidkits
          const defaultWorkspacePath = path.join(os.homedir(), 'RapidKit', 'rapidkits');
          workspaceRoot = defaultWorkspacePath;

          // Check if default workspace exists, if not create it
          const fs = require('fs-extra');
          if (!(await fs.pathExists(defaultWorkspacePath))) {
            logger.info('Default workspace does not exist, creating:', defaultWorkspacePath);

            // Ensure RapidKit parent directory exists
            const rapidkitDir = path.join(os.homedir(), 'RapidKit');
            await fs.ensureDir(rapidkitDir);
            logger.info('RapidKit directory ensured:', rapidkitDir);

            // Create default workspace
            const { RapidKitCLI } = await import('../core/rapidkitCLI.js');
            const cli = new RapidKitCLI();

            await cli.createWorkspace({
              name: 'rapidkits',
              parentPath: rapidkitDir,
              skipGit: false,
            });

            // Add marker file for extension
            const markerPath = path.join(defaultWorkspacePath, '.rapidkit-workspace');
            await fs.writeJson(markerPath, {
              signature: MARKERS.WORKSPACE_SIGNATURE,
              version: getExtensionVersion(),
              created: new Date().toISOString(),
            });

            // Add to WorkspaceManager
            const manager = WorkspaceManager.getInstance();
            await manager.addWorkspace(defaultWorkspacePath);

            logger.info('Default workspace created successfully');
            vscode.window.showInformationMessage('✅ Created default workspace: rapidkits');
          } else {
            // Make sure default workspace is in manager
            const manager = WorkspaceManager.getInstance();
            const workspaces = manager.getWorkspaces();
            const isInManager = workspaces.some((ws) => ws.path === defaultWorkspacePath);
            if (!isInManager) {
              await manager.addWorkspace(defaultWorkspacePath);
              logger.info('Added existing default workspace to manager');
            }
          }
          logger.info('Using default workspace:', workspaceRoot);
        }
      }
    }

    // Show wizard
    const wizard = new ProjectWizard();
    const config = await wizard.show(preselectedFramework);

    if (!config) {
      logger.info('Project creation cancelled by user');
      return;
    }

    logger.info('Project config from wizard:', JSON.stringify(config));

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

          // Always use workspace mode (workspaceRoot is always set)
          logger.info('Creating project in workspace:', workspaceRoot);

          await cli.createProjectInWorkspace({
            name: config.name,
            template: template as 'fastapi' | 'nestjs',
            workspacePath: workspaceRoot,
            skipInstall: false,
          });

          const projectPath = path.join(workspaceRoot, config.name);

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

          // Update workspace in manager and ensure it's registered
          const manager = WorkspaceManager.getInstance();
          const workspaces = manager.getWorkspaces();
          const isRegistered = workspaces.some((ws) => ws.path === workspaceRoot);

          if (!isRegistered) {
            // Add this workspace to manager
            await manager.addWorkspace(workspaceRoot);
            logger.info('Registered new workspace in manager:', workspaceRoot);
          } else {
            // Just update existing workspace
            await manager.updateWorkspace(workspaceRoot);
          }

          await vscode.commands.executeCommand('rapidkit.refreshWorkspaces');

          progress.report({ increment: 100, message: 'Done!' });

          // Show success with enhanced actions
          const openAction = '📂 Open in Editor';
          const terminalAction = '⚡ Open Terminal';
          const addModulesAction = '🧩 Add Modules';
          const docsAction = '📖 View Docs';

          const selected = await vscode.window.showInformationMessage(
            `✅ Project "${config.name}" created successfully!`,
            { modal: false },
            openAction,
            terminalAction,
            addModulesAction,
            docsAction
          );

          if (selected === openAction) {
            const projectUri = vscode.Uri.file(projectPath);
            await vscode.commands.executeCommand('vscode.openFolder', projectUri, {
              forceNewWindow: false,
            });
          } else if (selected === terminalAction) {
            const terminal = vscode.window.createTerminal({
              name: `RapidKit - ${config.name}`,
              cwd: projectPath,
            });
            terminal.show();
            terminal.sendText('# Run: rapidkit init && rapidkit dev');
          } else if (selected === addModulesAction) {
            // Set project path context then trigger add module
            await vscode.commands.executeCommand('rapidkit.addModule', projectPath);
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
