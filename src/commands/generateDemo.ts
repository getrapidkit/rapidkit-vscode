/**
 * Generate Demo Command
 * Generate a demo FastAPI project
 */

import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { RapidKitCLI } from '../core/rapidkitCLI';
import * as path from 'path';
import * as fs from 'fs-extra';

export async function generateDemoCommand(workspace?: { path: string; mode: string }) {
  const logger = Logger.getInstance();
  logger.info('Generate Demo command initiated');

  try {
    // If no workspace provided, try to get the selected workspace from context
    let targetWorkspace = workspace;
    
    if (!targetWorkspace) {
      // Try to get from rapidkit.selectedWorkspace context
      const workspaceData = await vscode.commands.executeCommand('rapidkit.getSelectedWorkspace');
      if (workspaceData && typeof workspaceData === 'object') {
        targetWorkspace = workspaceData as { path: string; mode: string };
        logger.info('Retrieved workspace from context', targetWorkspace);
      }
    }

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

    // Determine destination path
    let destinationPath: string;
    let isDemoWorkspace = false;

    // If workspace is provided/retrieved and is demo mode, use it directly
    if (targetWorkspace && targetWorkspace.mode === 'demo') {
      destinationPath = targetWorkspace.path;
      isDemoWorkspace = true;
      logger.info(`Using demo workspace: ${destinationPath}`);
    } else if (targetWorkspace) {
      // Use regular workspace path
      destinationPath = targetWorkspace.path;
      isDemoWorkspace = await fs.pathExists(path.join(destinationPath, 'generate-demo.js'));
      logger.info(`Using workspace: ${destinationPath}, isDemoWorkspace: ${isDemoWorkspace}`);
    } else {
      // Get destination folder from user
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
      
      // Check if selected folder is a demo workspace
      isDemoWorkspace = await fs.pathExists(path.join(destinationPath, 'generate-demo.js'));
    }

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
          if (isDemoWorkspace) {
            // Use generate-demo.js script from demo workspace
            logger.info('Using demo workspace generate-demo.js script');
            const { execa } = await import('execa');
            
            await execa('node', ['generate-demo.js', projectName], {
              cwd: destinationPath,
              stdio: 'pipe',
            });
          } else {
            // Use rapidkit CLI with --demo-only flag
            logger.info('Using rapidkit CLI with --demo-only');
            const cli = new RapidKitCLI();

            await cli.generateDemo({
              name: projectName,
              destinationPath: destinationPath,
            });
          }

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
