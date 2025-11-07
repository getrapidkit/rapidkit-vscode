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

    // Step 2: Demo mode notice (full mode disabled until stable release)
    const proceed = await vscode.window.showInformationMessage(
      '📦 Demo Mode\n\n' +
      'Create a RapidKit workspace with bundled templates.\n' +
      'Generate multiple FastAPI/NestJs projects instantly without Python RapidKit installation.\n\n' +
      '💡 Full mode will be available in the stable release.',
      { modal: true },
      'Continue'
    );

    if (proceed !== 'Continue') {
      return undefined;
    }

    const mode = 'demo' as const;

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
      mode, // Always 'demo' for now
      initGit: initGit.value,
    };
  }
}
