/**
 * Workspace Context Menu Commands
 * Right-click actions for workspace items
 */

import * as vscode from 'vscode';
import { Logger } from '../utils/logger';

/**
 * Open workspace folder in system file explorer
 */
export async function openWorkspaceFolder(workspacePath: string): Promise<void> {
  const logger = Logger.getInstance();
  
  try {
    await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(workspacePath));
  } catch (error) {
    logger.error('Failed to open workspace folder', error);
    vscode.window.showErrorMessage(`Failed to open folder: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Copy workspace path to clipboard
 */
export async function copyWorkspacePath(workspacePath: string): Promise<void> {
  const logger = Logger.getInstance();
  
  try {
    await vscode.env.clipboard.writeText(workspacePath);
    vscode.window.showInformationMessage(`Copied: ${workspacePath}`);
  } catch (error) {
    logger.error('Failed to copy workspace path', error);
    vscode.window.showErrorMessage(`Failed to copy path: ${error instanceof Error ? error.message : String(error)}`);
  }
}
