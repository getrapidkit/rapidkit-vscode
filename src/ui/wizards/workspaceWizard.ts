/**
 * Workspace Wizard
 * Interactive wizard for workspace creation
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import { WorkspaceConfig } from '../../types';

export class WorkspaceWizard {
  async show(): Promise<WorkspaceConfig | undefined> {
    // Step 1: Workspace name
    const name = await vscode.window.showInputBox({
      prompt: 'Enter workspace name',
      placeHolder: 'my-rapidkit-workspace',
      validateInput: (value) => {
        if (!value) {
          return 'Workspace name is required';
        }
        if (!/^[a-z][a-z0-9-]*$/.test(value)) {
          return 'Use lowercase letters, numbers, and hyphens only';
        }
        return null;
      },
    });

    if (!name) {
      return undefined;
    }

    // Step 2: Show workspace info
    const proceed = await vscode.window.showInformationMessage(
      '📦 RapidKit Workspace\n\n' +
        'Create a workspace to organize multiple FastAPI and NestJS projects.\n' +
        'Use the local CLI to quickly scaffold projects and manage modules.\n\n' +
        '💡 Powered by: npx rapidkit (npm package)',
      { modal: true },
      'Continue'
    );

    if (proceed !== 'Continue') {
      return undefined;
    }

    // Step 3: Git initialization
    const initGitItems = [
      {
        label: '$(git-commit) Yes',
        description: 'Initialize git repository',
        picked: true,
        value: true,
      },
      {
        label: '$(circle-slash) No',
        description: 'Skip git initialization',
        picked: false,
        value: false,
      },
    ];

    const initGit = await vscode.window.showQuickPick(initGitItems, {
      placeHolder: 'Initialize git repository?',
      ignoreFocusOut: true,
    });

    if (!initGit) {
      return undefined;
    }

    // Step 4: Destination folder
    const defaultPath = path.join(os.homedir(), 'Projects');
    const folderUri = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: 'Select Destination',
      title: 'Select destination folder for workspace',
      defaultUri: vscode.Uri.file(defaultPath),
    });

    if (!folderUri || folderUri.length === 0) {
      return undefined;
    }

    const destinationPath = folderUri[0].fsPath;
    const workspacePath = path.join(destinationPath, name);

    return {
      name,
      path: workspacePath,
      initGit: initGit.value,
    };
  }
}
