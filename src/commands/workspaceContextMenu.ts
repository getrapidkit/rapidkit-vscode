/**
 * Workspace Context Menu Commands
 * Right-click actions for workspace items
 */

import * as vscode from 'vscode';
import { RapidKitWorkspace } from '../types';
import { Logger } from '../utils/logger';

/**
 * Open workspace folder in system file explorer
 */
export async function openWorkspaceFolder(workspace: RapidKitWorkspace): Promise<void> {
  const logger = Logger.getInstance();
  
  try {
    await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(workspace.path));
  } catch (error) {
    logger.error('Failed to open workspace folder', error);
    vscode.window.showErrorMessage(`Failed to open folder: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Copy workspace path to clipboard
 */
export async function copyWorkspacePath(workspace: RapidKitWorkspace): Promise<void> {
  const logger = Logger.getInstance();
  
  try {
    await vscode.env.clipboard.writeText(workspace.path);
    vscode.window.showInformationMessage(`Copied: ${workspace.path}`);
  } catch (error) {
    logger.error('Failed to copy workspace path', error);
    vscode.window.showErrorMessage(`Failed to copy path: ${error instanceof Error ? error.message : String(error)}`);
  }
}
