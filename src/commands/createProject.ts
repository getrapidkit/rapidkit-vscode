/**
 * Create Project Command
 * Interactive wizard for creating a new RapidKit project
 */

import * as vscode from 'vscode';
import { ProjectWizard } from '../ui/wizards/projectWizard';
import { Logger } from '../utils/logger';
import { WorkspaceManager } from '../core/workspaceManager';

export async function createProjectCommand(
  selectedWorkspacePath?: string,
  preselectedFramework?: 'fastapi' | 'nestjs'
) {
  const logger = Logger.getInstance();
  logger.info('Create Project command initiated', { preselectedFramework });

  try {
    const path = require('path');
    const os = require('os');
    const fs = require('fs-extra');

    // Determine workspace: use selected, or ask user
    let workspaceRoot: string | undefined;

    if (selectedWorkspacePath) {
      // Check if the selected workspace path actually exists
      const workspaceExists = await fs.pathExists(selectedWorkspacePath);

      if (!workspaceExists) {
        logger.warn('Selected workspace path does not exist:', selectedWorkspacePath);

        // Show warning and ask user what to do
        const action = await vscode.window.showWarningMessage(
          `⚠️ Selected workspace no longer exists: ${path.basename(selectedWorkspacePath)}`,
          'Choose New Location',
          'Recreate Workspace',
          'Cancel'
        );

        if (action === 'Recreate Workspace') {
          // Recreate the workspace
          logger.info('Recreating workspace:', selectedWorkspacePath);
          const parentPath = path.dirname(selectedWorkspacePath);
          const workspaceName = path.basename(selectedWorkspacePath);

          await fs.ensureDir(parentPath);

          const { RapidKitCLI } = await import('../core/rapidkitCLI.js');
          const cli = new RapidKitCLI();

          await cli.createWorkspace({
            name: workspaceName,
            parentPath: parentPath,
            skipGit: false,
          });

          // Marker file is created by npm package with standard format
          workspaceRoot = selectedWorkspacePath;
          logger.info('Workspace recreated successfully');
          vscode.window.showInformationMessage(`✅ Recreated workspace: ${workspaceName}`);
        } else if (action === 'Choose New Location') {
          // Let user proceed to location selection
          selectedWorkspacePath = undefined; // Reset to trigger location prompt
        } else {
          logger.info('Project creation cancelled by user');
          return;
        }
      } else {
        // Use the provided workspace path (from UI or selected workspace)
        workspaceRoot = selectedWorkspacePath;
      }
    }

    if (!selectedWorkspacePath || typeof workspaceRoot === 'undefined') {
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
            logger.info('Custom location is not a workspace - project will be created standalone');
            // Note: Projects created outside workspaces will prompt via npm package
          }

          // Register custom workspace in manager so it persists across restarts
          const manager = WorkspaceManager.getInstance();
          const registered = await manager.addWorkspace(workspaceRoot);
          if (registered) {
            logger.info('Custom workspace registered in manager:', workspaceRoot);
          }
        } else {
          // No workspace selected - prompt user to create one
          vscode.window
            .showErrorMessage(
              'No workspace found. Please create a workspace first using "RapidKit: Create Workspace" command.',
              'Create Workspace'
            )
            .then((selection) => {
              if (selection === 'Create Workspace') {
                vscode.commands.executeCommand('rapidkit.createWorkspace');
              }
            });
          return;
        }
      }
    }

    // Ensure workspaceRoot is defined before proceeding
    if (!workspaceRoot) {
      logger.error('Workspace root is undefined');
      vscode.window.showErrorMessage('Failed to determine workspace location');
      return;
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

          // Always use workspace mode: npx rapidkit create project <kit> <name> --output . (cwd = workspaceRoot)
          const workspacePathAbs = path.isAbsolute(workspaceRoot)
            ? workspaceRoot
            : path.resolve(workspaceRoot);
          logger.info('Creating project in workspace:', workspacePathAbs, 'name:', config.name);

          const result = await cli.createProjectInWorkspace({
            name: config.name,
            template: template as 'fastapi' | 'nestjs',
            workspacePath: workspacePathAbs,
            skipInstall: false,
          });

          const exitCode = (result as { exitCode?: number }).exitCode ?? 1;
          if (exitCode !== 0) {
            const stderr = (result as { stderr?: string }).stderr ?? '';
            const stdout = (result as { stdout?: string }).stdout ?? '';
            logger.error('rapidkit create project failed', { exitCode, stderr, stdout });
            throw new Error(
              stderr.trim() ||
                stdout.trim() ||
                `rapidkit create project exited with code ${exitCode}`
            );
          }

          const projectPath = path.join(workspacePathAbs, config.name);

          progress.report({ increment: 70, message: 'Verifying project...' });

          // Wait for file system (Poetry/lock can be slow)
          for (let i = 0; i < 15; i++) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            if (await fs.pathExists(projectPath)) {
              break;
            }
            if (i === 14) {
              throw new Error(
                `Project was not created at ${projectPath}. Check Output > RapidKit for CLI errors.`
              );
            }
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
