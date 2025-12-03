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
        cancellable: true,
      },
      async (progress, token) => {
        progress.report({ increment: 0, message: 'Setting up workspace...' });

        if (token.isCancellationRequested) {
          return;
        }

        try {
          const cli = new RapidKitCLI();

          // Check if CLI is available
          const isAvailable = await cli.isAvailable();
          if (!isAvailable) {
            vscode.window.showWarningMessage('⚠️ RapidKit CLI not found. Installing via npx...');
          }

          progress.report({ increment: 20, message: 'Running rapidkit CLI...' });

          // Create workspace using CLI wrapper (always use demo mode)
          const result = await cli.createWorkspace({
            name: config.name,
            path: config.path,
            demoMode: true, // Always use demo mode until RapidKit is on PyPI
            skipGit: !config.initGit,
          });

          logger.info('Workspace created successfully', result.stdout);

          progress.report({ increment: 60, message: 'Adding RapidKit marker...' });

          // Create .rapidkit-workspace marker file with specific signature
          const markerPath = path.join(config.path, '.rapidkit-workspace');
          await fs.ensureDir(config.path);
          await fs.writeJSON(
            markerPath,
            {
              $schema: 'https://getrapidkit.com/schemas/workspace.json',
              signature: 'RAPIDKIT_VSCODE_WORKSPACE',
              version: '1.0.0',
              mode: config.mode,
              createdAt: new Date().toISOString(),
              createdBy: 'rapidkit-vscode-extension',
              extensionVersion: '0.1.0',
            },
            { spaces: 2 }
          );

          progress.report({ increment: 70, message: 'Registering workspace...' });

          // Add workspace to manager
          const workspaceManager = WorkspaceManager.getInstance();
          await workspaceManager.addWorkspace(config.path);

          progress.report({ increment: 80, message: 'Refreshing views...' });

          // Wait a bit for file system to sync
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Refresh workspace explorer
          await vscode.commands.executeCommand('rapidkit.refreshWorkspaces');

          progress.report({ increment: 90, message: 'Done!' });

          // Show success message
          const openAction = 'Open Workspace';
          const selected = await vscode.window.showInformationMessage(
            `✅ Workspace "${config.name}" created successfully!`,
            openAction,
            'Close'
          );

          if (selected === openAction) {
            const workspaceUri = vscode.Uri.file(config.path);
            await vscode.commands.executeCommand('vscode.openFolder', workspaceUri, {
              forceNewWindow: false,
            });
          }

          progress.report({ increment: 100, message: 'Complete!' });
        } catch (error) {
          logger.error('Failed to create workspace', error);
          vscode.window.showErrorMessage(
            `Failed to create workspace: ${error instanceof Error ? error.message : String(error)}`
          );
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
