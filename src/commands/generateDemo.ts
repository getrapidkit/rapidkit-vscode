/**
 * Generate Demo Command
 * Generate a demo FastAPI project
 */

import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { RapidKitCLI } from '../core/rapidkitCLI';
import * as path from 'path';

export async function generateDemoCommand() {
  const logger = Logger.getInstance();
  logger.info('Generate Demo command initiated');

  try {
    // Get project name
    const projectName = await vscode.window.showInputBox({
      prompt: 'Enter project name',
      placeHolder: 'my-demo-project',
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

    // Get destination folder
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

    const destinationPath = folderUri[0].fsPath;

    // Generate with progress
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Generating demo project: ${projectName}`,
        cancellable: false,
      },
      async (progress) => {
        progress.report({ increment: 0, message: 'Creating project structure...' });

        try {
          const cli = new RapidKitCLI();

          // Use CLI wrapper to generate demo
          await cli.generateDemo({
            name: projectName,
            destinationPath: destinationPath,
          });

          progress.report({ increment: 100, message: 'Done!' });

          const projectPath = path.join(destinationPath, projectName);

          // Show success with actions
          const openAction = 'Open Project';
          const openFolderAction = 'Open in New Window';
          const selected = await vscode.window.showInformationMessage(
            `✅ Demo project "${projectName}" created successfully!`,
            openAction,
            openFolderAction,
            'Close'
          );

          if (selected === openAction) {
            const uri = vscode.Uri.file(projectPath);
            await vscode.commands.executeCommand('vscode.openFolder', uri, false);
          } else if (selected === openFolderAction) {
            const uri = vscode.Uri.file(projectPath);
            await vscode.commands.executeCommand('vscode.openFolder', uri, true);
          }
        } catch (error) {
          logger.error('Failed to generate demo project', error);
          vscode.window.showErrorMessage(
            `Failed to generate demo project: ${error instanceof Error ? error.message : String(error)}`
          );
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
