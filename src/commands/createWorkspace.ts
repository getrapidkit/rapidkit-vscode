/**
 * Create Workspace Command
 * Interactive wizard for creating a new RapidKit workspace
 */

import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { WorkspaceWizard } from '../ui/wizards/workspaceWizard';
import { Logger } from '../utils/logger';
import { RapidKitCLI } from '../core/rapidkitCLI';
import { WorkspaceManager } from '../core/workspaceManager';

export async function createWorkspaceCommand() {
  const logger = Logger.getInstance();
  logger.info('Create Workspace command initiated');

  try {
    // Show wizard to collect user input
    const wizard = new WorkspaceWizard();
    const config = await wizard.show();

    if (!config) {
      logger.info('Workspace creation cancelled by user');
      return;
    }

    // Execute with progress
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Creating RapidKit workspace',
        cancellable: false,
      },
      async (progress) => {
        progress.report({ increment: 0, message: 'Initializing...' });

        try {
          const cli = new RapidKitCLI();

          progress.report({ increment: 10, message: 'Running npx rapidkit...' });

          // Ensure parent directory exists
          const parentPath = path.dirname(config.path);
          await fs.ensureDir(parentPath);
          logger.info('Parent directory ensured:', parentPath);

          // Create workspace using npm package
          // Command: npx rapidkit <workspace-name>
          await cli.createWorkspace({
            name: config.name,
            parentPath: parentPath,
            skipGit: !config.initGit,
          });

          logger.info('Workspace created successfully via npm package');

          progress.report({ increment: 70, message: 'Verifying workspace...' });

          // Verify workspace was created
          const workspaceExists = await fs.pathExists(config.path);
          if (!workspaceExists) {
            throw new Error(`Workspace directory not created at ${config.path}`);
          }

          // Check for workspace marker (.rapidkit directory)
          const rapidkitDir = path.join(config.path, '.rapidkit');
          const rapidkitDirExists = await fs.pathExists(rapidkitDir);

          if (!rapidkitDirExists) {
            logger.warn('Workspace created but .rapidkit directory not found');
          }

          // Create VS Code extension marker file for workspace detection
          const markerPath = path.join(config.path, '.rapidkit-workspace');
          await fs.writeJSON(
            markerPath,
            {
              signature: 'RAPIDKIT_VSCODE_WORKSPACE',
              createdBy: 'rapidkit-vscode-extension',
              version: '0.4.0',
              createdAt: new Date().toISOString(),
              name: config.name,
            },
            { spaces: 2 }
          );

          logger.info('Workspace marker file created');

          progress.report({ increment: 80, message: 'Registering workspace...' });

          // Add workspace to manager
          const workspaceManager = WorkspaceManager.getInstance();
          await workspaceManager.addWorkspace(config.path);

          progress.report({ increment: 90, message: 'Refreshing views...' });

          // Wait for file system sync
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Refresh workspace explorer
          await vscode.commands.executeCommand('rapidkit.refreshWorkspaces');

          progress.report({ increment: 100, message: 'Complete!' });

          // Show success message with actions
          const openAction = 'Open Workspace';
          const docsAction = 'View Docs';
          const selected = await vscode.window.showInformationMessage(
            `✅ Workspace "${config.name}" created successfully!\n\n` +
              `📁 Location: ${config.path}\n` +
              `💡 Tip: Use 'rapidkit create my-api --template fastapi' to add projects`,
            openAction,
            docsAction,
            'Close'
          );

          if (selected === openAction) {
            const workspaceUri = vscode.Uri.file(config.path);
            await vscode.commands.executeCommand('vscode.openFolder', workspaceUri, {
              forceNewWindow: false,
            });
          } else if (selected === docsAction) {
            await vscode.env.openExternal(vscode.Uri.parse('https://getrapidkit.com/docs'));
          }
        } catch (error) {
          logger.error('Failed to create workspace', error);

          const errorMessage = error instanceof Error ? error.message : String(error);
          const helpAction = 'Get Help';
          const selected = await vscode.window.showErrorMessage(
            `Failed to create workspace: ${errorMessage}`,
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
    logger.error('Error in createWorkspaceCommand', error);
    vscode.window.showErrorMessage(
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
