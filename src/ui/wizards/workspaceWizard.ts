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
    // Only ask for workspace name
    const name = await vscode.window.showInputBox({
      prompt: 'Enter workspace name',
      placeHolder: 'my-workspace',
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

    // Use default location: ~/RapidKit/
    const defaultPath = path.join(os.homedir(), 'RapidKit');
    const workspacePath = path.join(defaultPath, name);

    return {
      name,
      path: workspacePath,
      initGit: true, // Always init git
    };
  }
}
