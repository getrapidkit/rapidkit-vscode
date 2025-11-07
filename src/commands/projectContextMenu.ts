/**
 * Project Context Menu Commands
 * Right-click actions for project items
 */

import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import { RapidKitProject } from '../types';
import { Logger } from '../utils/logger';

/**
 * Open project folder in system file explorer
 */
export async function openProjectFolder(project: RapidKitProject): Promise<void> {
  const logger = Logger.getInstance();
  
  try {
    await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(project.path));
  } catch (error) {
    logger.error('Failed to open project folder', error);
    vscode.window.showErrorMessage(`Failed to open folder: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Copy project path to clipboard
 */
export async function copyProjectPath(project: RapidKitProject): Promise<void> {
  const logger = Logger.getInstance();
  
  try {
    await vscode.env.clipboard.writeText(project.path);
    vscode.window.showInformationMessage(`Copied: ${project.path}`);
  } catch (error) {
    logger.error('Failed to copy project path', error);
    vscode.window.showErrorMessage(`Failed to copy path: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Delete project (with confirmation)
 */
export async function deleteProject(project: RapidKitProject): Promise<void> {
  const logger = Logger.getInstance();
  
  try {
    const answer = await vscode.window.showWarningMessage(
      `Delete project "${project.name}"?\n\nThis will permanently delete all files in:\n${project.path}`,
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
        title: `Deleting project "${project.name}"`,
        cancellable: false,
      },
      async (progress) => {
        progress.report({ increment: 0, message: 'Removing files...' });
        
        await fs.remove(project.path);
        
        progress.report({ increment: 100, message: 'Done!' });
        
        // Refresh project list
        await vscode.commands.executeCommand('rapidkit.refreshProjects');
        
        vscode.window.showInformationMessage(`Project "${project.name}" deleted successfully`);
      }
    );
  } catch (error) {
    logger.error('Failed to delete project', error);
    vscode.window.showErrorMessage(`Failed to delete project: ${error instanceof Error ? error.message : String(error)}`);
  }
}
