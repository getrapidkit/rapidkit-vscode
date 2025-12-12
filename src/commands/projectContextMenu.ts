/**
 * Project Context Menu Commands
 * Right-click actions for project items
 */

import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import { Logger } from '../utils/logger';

/**
 * Open project folder in system file explorer
 */
export async function openProjectFolder(projectPath: string): Promise<void> {
  const logger = Logger.getInstance();

  try {
    await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(projectPath));
  } catch (error) {
    logger.error('Failed to open project folder', error);
    vscode.window.showErrorMessage(
      `Failed to open folder: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Copy project path to clipboard
 */
export async function copyProjectPath(projectPath: string): Promise<void> {
  const logger = Logger.getInstance();

  try {
    await vscode.env.clipboard.writeText(projectPath);
    vscode.window.showInformationMessage(`Copied: ${projectPath}`);
  } catch (error) {
    logger.error('Failed to copy project path', error);
    vscode.window.showErrorMessage(
      `Failed to copy path: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Delete project (with confirmation)
 */
export async function deleteProject(projectPath: string): Promise<void> {
  const logger = Logger.getInstance();

  try {
    // Get project name from path
    const projectName = projectPath.split('/').pop() || 'Unknown';

    const answer = await vscode.window.showWarningMessage(
      `Delete project "${projectName}"?\n\nThis will permanently delete all files in:\n${projectPath}`,
      { modal: true },
      'Delete',
      'Cancel'
    );

    if (answer !== 'Delete') {
      return;
    }

    // Show progress
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Deleting project "${projectName}"`,
        cancellable: false,
      },
      async (progress) => {
        progress.report({ increment: 0, message: 'Removing files...' });

        await fs.remove(projectPath);

        progress.report({ increment: 100, message: 'Done!' });

        // Refresh project list
        await vscode.commands.executeCommand('rapidkit.refreshProjects');

        vscode.window.showInformationMessage(`🗑️ Project "${projectName}" deleted successfully`, {
          modal: false,
        });
      }
    );
  } catch (error) {
    logger.error('Failed to delete project', error);
    vscode.window.showErrorMessage(
      `Failed to delete project: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
