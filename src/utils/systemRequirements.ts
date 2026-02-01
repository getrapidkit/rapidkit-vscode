/**
 * System Requirements Checker & Auto-Installer
 * Validates Python 3.10+, venv, Node.js, and Git with auto-fix capabilities
 */

import * as vscode from 'vscode';
import { run } from './exec';
import { Logger } from './logger';
import { checkPythonEnvironment, getPythonErrorMessage } from './pythonChecker';

export interface SystemRequirementsResult {
  allMet: boolean;
  python: {
    available: boolean;
    meetsMinimumVersion: boolean; // Python 3.10+
    venvSupport: boolean;
    version?: string;
    canAutoFix: boolean;
    autoFixCommand?: string;
  };
  nodejs: {
    available: boolean;
    version?: string;
  };
  git: {
    available: boolean;
    version?: string;
  };
}

/**
 * Check all system requirements
 */
export async function checkSystemRequirements(): Promise<SystemRequirementsResult> {
  const logger = Logger.getInstance();

  const result: SystemRequirementsResult = {
    allMet: false,
    python: {
      available: false,
      meetsMinimumVersion: false,
      venvSupport: false,
      canAutoFix: false,
    },
    nodejs: {
      available: false,
    },
    git: {
      available: false,
    },
  };

  // Check Python
  const pythonEnv = await checkPythonEnvironment();
  result.python.available = pythonEnv.available;
  result.python.meetsMinimumVersion = pythonEnv.meetsMinimumVersion;
  result.python.venvSupport = pythonEnv.venvSupport;
  result.python.version = pythonEnv.version;

  // Check if we can auto-fix missing venv (on supported platforms)
  if (pythonEnv.available && !pythonEnv.venvSupport) {
    const autoFixInfo = await checkVenvAutoFix(pythonEnv.version || '');
    result.python.canAutoFix = autoFixInfo.canFix;
    result.python.autoFixCommand = autoFixInfo.command;
  }

  // Check Node.js (optional)
  try {
    const nodeResult = await run('node', ['--version'], { timeout: 2000, stdio: 'pipe' });
    if (nodeResult.exitCode === 0) {
      result.nodejs.available = true;
      result.nodejs.version = nodeResult.stdout?.trim();
    }
  } catch {
    logger.debug('Node.js not found (optional)');
  }

  // Check Git (optional)
  try {
    const gitResult = await run('git', ['--version'], { timeout: 2000, stdio: 'pipe' });
    if (gitResult.exitCode === 0) {
      result.git.available = true;
      result.git.version = gitResult.stdout?.trim();
    }
  } catch {
    logger.debug('Git not found (optional)');
  }

  // All requirements met?
  result.allMet =
    result.python.available && result.python.meetsMinimumVersion && result.python.venvSupport;

  return result;
}

/**
 * Check if we can auto-fix missing venv support
 */
async function checkVenvAutoFix(pythonVersion: string): Promise<{
  canFix: boolean;
  command?: string;
}> {
  const platform = process.platform;

  // Extract Python version number (e.g., "Python 3.13.5" -> "3.13")
  const versionMatch = pythonVersion.match(/(\d+\.\d+)/);
  const version = versionMatch ? versionMatch[1] : '3';

  // On Linux with apt (Debian/Ubuntu), we can suggest auto-install
  if (platform === 'linux') {
    // Check if apt is available
    try {
      await run('which', ['apt'], { timeout: 1000, stdio: 'pipe' });
      return {
        canFix: true,
        command: `sudo apt update && sudo apt install -y python${version}-venv`,
      };
    } catch {
      // apt not available
    }
  }

  return { canFix: false };
}

/**
 * Attempt to auto-fix missing venv support (with user permission)
 */
export async function autoFixVenvSupport(command: string): Promise<boolean> {
  const logger = Logger.getInstance();

  const terminal = vscode.window.createTerminal({
    name: 'RapidKit: Install Python venv',
    hideFromUser: false,
  });

  terminal.show();

  // Show command first for transparency
  terminal.sendText(`echo "Installing Python venv support..."`);
  terminal.sendText(`echo "Command: ${command}"`);
  terminal.sendText(command);

  // Wait a bit for installation
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Verify installation
  const verification = await checkPythonEnvironment();
  const success = verification.venvSupport;

  if (success) {
    terminal.sendText(`echo "\n✅ Python venv support installed successfully!"`);
    terminal.sendText(`echo "You can close this terminal now."`);
    logger.info('Auto-fix venv support: SUCCESS');
  } else {
    terminal.sendText(`echo "\n⚠️ Installation may require manual verification."`);
    terminal.sendText(`echo "Please restart VS Code after installation completes."`);
    logger.warn('Auto-fix venv support: verification failed');
  }

  return success;
}

/**
 * Show smart error message with auto-fix option if available
 */
export async function showSystemRequirementsError(
  requirements: SystemRequirementsResult
): Promise<'retry' | 'install' | 'cancel'> {
  if (!requirements.python.available) {
    // Python not found - can't auto-fix
    const message =
      '❌ Python not found on your system.\n\n' +
      'RapidKit requires Python 3.10+ to create projects.\n\n' +
      'Please install Python from:\n' +
      '  • Ubuntu/Debian: sudo apt install python3.13\n' +
      '  • macOS: brew install python@3.13\n' +
      '  • Windows: python.org/downloads\n\n' +
      'After installing Python, restart VS Code.';

    const setupGuideAction = 'View Setup Guide';
    const selected = await vscode.window.showErrorMessage(
      message,
      { modal: true },
      setupGuideAction
    );

    if (selected === setupGuideAction) {
      await vscode.env.openExternal(vscode.Uri.parse('https://getrapidkit.com/docs/setup/python'));
    }

    return 'cancel';
  }

  if (!requirements.python.meetsMinimumVersion) {
    // Python version too old
    const message =
      `❌ Python ${requirements.python.version} is too old.\n\n` +
      'RapidKit requires Python 3.10 or higher.\n\n' +
      'Please upgrade Python:\n' +
      '  • Ubuntu/Debian: sudo apt install python3.13\n' +
      '  • macOS: brew install python@3.13\n' +
      '  • Windows: python.org/downloads\n\n' +
      'After upgrading, restart VS Code.';

    const setupGuideAction = 'View Setup Guide';
    const selected = await vscode.window.showErrorMessage(
      message,
      { modal: true },
      setupGuideAction
    );

    if (selected === setupGuideAction) {
      await vscode.env.openExternal(vscode.Uri.parse('https://getrapidkit.com/docs/setup/python'));
    }

    return 'cancel';
  }

  if (!requirements.python.venvSupport) {
    // Python found but venv missing

    if (requirements.python.canAutoFix && requirements.python.autoFixCommand) {
      // We can auto-fix!
      const message =
        '⚠️ Python venv support is missing.\n\n' +
        'RapidKit can automatically install it for you.\n\n' +
        `Command: ${requirements.python.autoFixCommand}\n\n` +
        'This requires sudo password and will take ~10 seconds.';

      const autoInstallAction = '🔧 Auto Install';
      const manualAction = 'Install Manually';
      const cancelAction = 'Cancel';

      const selected = await vscode.window.showWarningMessage(
        message,
        { modal: true },
        autoInstallAction,
        manualAction,
        cancelAction
      );

      if (selected === autoInstallAction) {
        return 'install';
      } else if (selected === manualAction) {
        await vscode.env.openExternal(
          vscode.Uri.parse('https://getrapidkit.com/docs/setup/python-venv')
        );
        return 'cancel';
      }

      return 'cancel';
    } else {
      // Can't auto-fix
      const pythonEnv = await checkPythonEnvironment();
      const message = getPythonErrorMessage(pythonEnv);

      const setupGuideAction = 'View Setup Guide';
      const retryAction = 'Retry';

      const selected = await vscode.window.showErrorMessage(
        message,
        { modal: true },
        setupGuideAction,
        retryAction
      );

      if (selected === setupGuideAction) {
        await vscode.env.openExternal(
          vscode.Uri.parse('https://getrapidkit.com/docs/setup/python-venv')
        );
      } else if (selected === retryAction) {
        return 'retry';
      }

      return 'cancel';
    }
  }

  return 'retry';
}
