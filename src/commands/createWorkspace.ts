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
import { isFirstTimeSetup, showFirstTimeSetupMessage } from '../utils/firstTimeSetup';
import { updateWorkspaceMetadata } from '../utils/workspaceMarker';

export async function createWorkspaceCommand() {
  const logger = Logger.getInstance();
  logger.info('Create Workspace command initiated');

  try {
    // Check if this is first-time setup and show guidance
    const isFirstTime = await isFirstTimeSetup();
    if (isFirstTime) {
      logger.info('First-time setup detected, showing guidance');
      const shouldContinue = await showFirstTimeSetupMessage();
      if (!shouldContinue) {
        logger.info('User cancelled first-time setup');
        return;
      }
    }

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
        progress.report({
          increment: 0,
          message: 'Initializing... (First time setup may take 30-60 seconds)',
        });

        try {
          const cli = new RapidKitCLI();

          progress.report({ increment: 10, message: 'Preparing workspace directory...' });

          // Create and prepare the workspace directory
          // Note: rapidkit-npm creates workspaces in ~/RapidKit/rapidkits by default
          // For custom paths, we need to handle this differently
          await fs.ensureDir(config.path);
          logger.info('Workspace directory created:', config.path);

          // Check if it's a default location (~/.RapidKit/rapidkits/<name>)
          const homeDir = require('os').homedir();
          const defaultWorkspacePath = path.join(homeDir, 'RapidKit', 'rapidkits', config.name);
          const isDefaultLocation = config.path === defaultWorkspacePath;

          if (isDefaultLocation) {
            // Use npm package directly for default location
            progress.report({
              increment: 20,
              message: 'Setting up RapidKit CLI (downloading if needed)...',
            });

            const createResult = await cli.createWorkspace({
              name: config.name,
              parentPath: path.dirname(config.path),
              skipGit: !config.initGit,
            });

            // Check if creation was successful
            if (createResult.exitCode !== 0) {
              const stderr = createResult.stderr || createResult.stdout || '';
              logger.error('Workspace creation failed', {
                exitCode: createResult.exitCode,
                stderr,
              });

              throw new Error(`Workspace creation failed: ${stderr || 'Unknown error'}`);
            }
          } else {
            // For custom paths, run npm command to create in default location, then move
            progress.report({
              increment: 20,
              message: 'Setting up RapidKit CLI (downloading if needed)...',
            });

            const createResult = await cli.createWorkspace({
              name: config.name,
              parentPath: path.dirname(defaultWorkspacePath),
              skipGit: !config.initGit,
            });

            // Check if creation was successful
            if (createResult.exitCode !== 0) {
              const stderr = createResult.stderr || createResult.stdout || '';
              logger.error('Workspace creation failed', {
                exitCode: createResult.exitCode,
                stderr,
              });

              throw new Error(`Workspace creation failed: ${stderr || 'Unknown error'}`);
            }

            // Move from default location to custom path
            if (await fs.pathExists(defaultWorkspacePath)) {
              const contents = await fs.readdir(defaultWorkspacePath);
              for (const item of contents) {
                await fs.move(path.join(defaultWorkspacePath, item), path.join(config.path, item), {
                  overwrite: true,
                });
              }
              // Clean up the default location placeholder
              await fs.remove(defaultWorkspacePath);
              logger.info('Workspace moved from default location to custom path');
            } else {
              throw new Error('Workspace was not created at the expected location');
            }
          }

          logger.info('Workspace creation via npm package completed');

          progress.report({ increment: 50, message: 'Finalizing workspace...' });

          // Note: We skip detailed validation here because:
          // 1. npm package already validates during creation
          // 2. Poetry venvs may not be immediately ready for inspection
          // 3. The marker file existence is sufficient proof of successful creation

          logger.info('Workspace creation successful (validation skipped - npm handles it)');

          progress.report({ increment: 65, message: 'Verifying workspace...' });

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

          // Verify workspace marker exists (created by npm package)
          const markerPath = path.join(config.path, '.rapidkit-workspace');
          if (!(await fs.pathExists(markerPath))) {
            logger.warn('Workspace marker not found - npm package should have created it');
          } else {
            // Add VS Code metadata to the marker
            const { getExtensionVersion } = await import('../utils/constants.js');
            await updateWorkspaceMetadata(config.path, {
              vscode: {
                extensionVersion: getExtensionVersion(),
                createdViaExtension: true,
                lastOpenedAt: new Date().toISOString(),
                openCount: 1,
              },
            });
            logger.info('Workspace marker verified and VS Code metadata added');
          }

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
              `💡 Tip: Add projects with \`rapidkit create\` (interactive) or \`rapidkit create project fastapi.standard my-api --output .\``,
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
