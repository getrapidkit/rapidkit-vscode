/**
 * Workspace Context Menu Commands
 * Right-click actions for workspace items
 */

import * as vscode from 'vscode';
import { Logger } from '../utils/logger';

type OpenPick = vscode.QuickPickItem & { value: 'select' | 'new' };

/**
 * Prompt how to open a workspace path, matching the dashboard QuickPick flow.
 */
export async function openWorkspace(workspacePath: string): Promise<void> {
  const wsBaseName = workspacePath
    ? workspacePath.split(/[/\\]/).pop() || workspacePath
    : 'workspace';
  const openPick = await vscode.window.showQuickPick<OpenPick>(
    [
      {
        label: '$(folder-active) Select in Current Window',
        description: 'Activate workspace here (updates sidebar + Projects tree)',
        detail: 'Selects the workspace in the sidebar. Projects and modules update immediately.',
        value: 'select',
      },
      {
        label: '$(empty-window) Open in New Window',
        description: 'Open workspace folder in a separate VS Code window',
        detail: 'Current window stays unchanged.',
        value: 'new',
      },
    ],
    {
      placeHolder: `What would you like to do with “${wsBaseName}”?`,
      title: 'Open Workspace',
      ignoreFocusOut: true,
    }
  );

  if (!openPick) {
    return;
  }

  if (openPick.value === 'select') {
    await vscode.commands.executeCommand('workspai.selectWorkspace', workspacePath);
    return;
  }

  const uri = vscode.Uri.file(workspacePath);
  await vscode.commands.executeCommand('vscode.openFolder', uri, {
    forceNewWindow: true,
  });
}

/**
 * Open workspace folder in system file explorer
 */
export async function openWorkspaceFolder(workspacePath: string): Promise<void> {
  const logger = Logger.getInstance();

  try {
    await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(workspacePath));
  } catch (error) {
    logger.error('Failed to open workspace folder', error);
    vscode.window.showErrorMessage(
      `Failed to open folder: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Copy workspace path to clipboard
 */
export async function copyWorkspacePath(workspacePath: string): Promise<void> {
  const logger = Logger.getInstance();

  try {
    await vscode.env.clipboard.writeText(workspacePath);
    vscode.window.showInformationMessage(`Copied: ${workspacePath}`, 'OK');
  } catch (error) {
    logger.error('Failed to copy workspace path', error);
    vscode.window.showErrorMessage(
      `Failed to copy path: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
