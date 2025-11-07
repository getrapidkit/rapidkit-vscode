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

    // Step 2: Choose mode
    const modeItems = [
      {
        label: '$(rocket) Demo Mode',
        description: 'Quick start with bundled templates',
        detail: 'No Python RapidKit required - Generate multiple FastAPI projects instantly',
        mode: 'demo' as const,
      },
      {
        label: '$(package) Full Mode',
        description: 'Complete RapidKit with all features',
        detail: 'Requires RapidKit Python package - Access all kits and modules',
        mode: 'full' as const,
      },
    ];

    const selectedMode = await vscode.window.showQuickPick(modeItems, {
      placeHolder: 'Select workspace mode',
      ignoreFocusOut: true,
    });

    if (!selectedMode) {
      return undefined;
    }

    const mode = selectedMode.mode;

    // Step 3: Install method (only for full mode)
    let installMethod: 'poetry' | 'venv' | 'pipx' | undefined;
    if (mode === 'full') {
      const methodItems = [
        {
          label: '$(book) Poetry',
          description: 'Recommended',
          detail: 'Modern Python dependency management',
          method: 'poetry' as const,
        },
        {
          label: '$(file-directory) venv + pip',
          description: 'Standard',
          detail: 'Built-in Python virtual environment',
          method: 'venv' as const,
        },
        {
          label: '$(globe) pipx',
          description: 'Global',
          detail: 'Install globally with pipx',
          method: 'pipx' as const,
        },
      ];

      const selectedMethod = await vscode.window.showQuickPick(methodItems, {
        placeHolder: 'Select installation method',
        ignoreFocusOut: true,
      });

      if (!selectedMethod) {
        return undefined;
      }

      installMethod = selectedMethod.method;
    }

    // Step 4: Git initialization
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

    // Step 5: Destination folder
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
      mode,
      installMethod,
      initGit: initGit.value,
    };
  }
}
