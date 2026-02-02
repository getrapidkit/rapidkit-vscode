/**
 * Doctor Command
 * Run system checks for RapidKit requirements
 */

import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { SystemCheckResult } from '../types';
import { getPoetryVersion } from '../utils/poetryHelper';
import { checkPythonEnvironment } from '../utils/pythonChecker';

// Helper function to fetch JSON from HTTPS URL (version checking)
const fetchJson = (url: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const https = require('https');
    https
      .get(url, (res: any) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          fetchJson(res.headers.location).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        let data = '';
        res.on('data', (chunk: string) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
};

// Helper to parse version
const parseVersion = (version: string) => {
  if (!version) {
    return null;
  }
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)((?:rc|alpha|beta)\d*)?$/);
  if (!match) {
    return null;
  }
  return {
    major: parseInt(match[1]),
    minor: parseInt(match[2]),
    patch: parseInt(match[3]),
    prerelease: match[4] || null,
  };
};

// Helper to compare semantic versions
const isNewerVersion = (current: string, latest: string): boolean => {
  if (!current || !latest) {
    return false;
  }
  try {
    const curr = parseVersion(current);
    const last = parseVersion(latest);

    if (!curr || !last) {
      return false;
    }

    // Compare major.minor.patch
    if (last.major > curr.major) {
      return true;
    }
    if (last.major < curr.major) {
      return false;
    }

    if (last.minor > curr.minor) {
      return true;
    }
    if (last.minor < curr.minor) {
      return false;
    }

    if (last.patch > curr.patch) {
      return true;
    }
    if (last.patch < curr.patch) {
      return false;
    }

    // Same version, check prerelease
    if (!curr.prerelease && last.prerelease) {
      return false;
    }
    if (curr.prerelease && !last.prerelease) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
};

async function runSystemChecks(
  progress: vscode.Progress<{ message?: string; increment?: number }>
) {
  progress.report({ increment: 0, message: 'Checking Python...' });

  const result: SystemCheckResult = {
    passed: true,
    checks: [],
  };

  // Check Python environment comprehensively
  const pythonEnv = await checkPythonEnvironment();

  if (pythonEnv.available) {
    result.checks.push({
      name: 'Python',
      status: 'pass',
      message: `${pythonEnv.version} (${pythonEnv.command})`,
    });

    // Check venv support
    if (pythonEnv.venvSupport) {
      result.checks.push({
        name: 'Python venv',
        status: 'pass',
        message: 'Virtual environment support available',
      });
    } else {
      result.passed = false;
      result.checks.push({
        name: 'Python venv',
        status: 'fail',
        message: pythonEnv.recommendation || 'Virtual environment support missing',
      });
    }

    // Check RapidKit core with version checking
    if (pythonEnv.rapidkitCoreInstalled) {
      let coreMessage = `Installed in system Python`;

      // Try to get version from rapidkit-core
      try {
        const { execa } = await import('execa');
        const coreVerResult = await execa(
          'python3',
          ['-c', 'import rapidkit_core; print(rapidkit_core.__version__)'],
          { timeout: 5000 }
        );
        const coreVersion = coreVerResult.stdout.trim();

        if (coreVersion) {
          coreMessage = `v${coreVersion}`;

          // Check for newer version
          try {
            const data = await fetchJson('https://pypi.org/pypi/rapidkit-core/json');
            if (data.info && data.info.version) {
              const latestVersion = data.info.version;
              if (isNewerVersion(coreVersion, latestVersion)) {
                coreMessage += ` → v${latestVersion} available`;
              }
            }
          } catch {
            // Silently fail version check
          }
        }
      } catch {
        // Silently fail version detection
      }

      result.checks.push({
        name: 'RapidKit core',
        status: 'pass',
        message: coreMessage,
      });
    } else {
      result.passed = false;
      result.checks.push({
        name: 'RapidKit core',
        status: 'fail',
        message: 'Not installed - required for Python projects',
      });
    }
  } else {
    result.passed = false;
    result.checks.push({
      name: 'Python',
      status: 'fail',
      message: pythonEnv.recommendation || 'Python 3.10+ not found',
    });
  }

  progress.report({ increment: 20, message: 'Checking Node.js...' });

  // Check Node.js
  try {
    const { execa } = await import('execa');
    const nodeResult = await execa('node', ['--version']);
    result.checks.push({
      name: 'Node.js',
      status: 'pass',
      message: nodeResult.stdout,
    });
  } catch {
    result.checks.push({
      name: 'Node.js',
      status: 'warning',
      message: 'Node.js not found (optional for demo mode)',
    });
  }

  progress.report({ increment: 40, message: 'Checking Poetry...' });

  // Check Poetry with enhanced detection
  const poetryVersion = await getPoetryVersion();
  if (poetryVersion) {
    result.checks.push({
      name: 'Poetry',
      status: 'pass',
      message: `Poetry version ${poetryVersion}`,
    });
  } else {
    result.checks.push({
      name: 'Poetry',
      status: 'warning',
      message: 'Poetry not found (optional, but recommended for FastAPI projects)',
    });
  }

  progress.report({ increment: 60, message: 'Checking Git...' });

  // Check Git
  try {
    const { execa } = await import('execa');
    const gitResult = await execa('git', ['--version']);
    result.checks.push({
      name: 'Git',
      status: 'pass',
      message: gitResult.stdout,
    });
  } catch {
    result.checks.push({
      name: 'Git',
      status: 'warning',
      message: 'Git not found (optional)',
    });
  }

  progress.report({ increment: 85, message: 'Checking RapidKit npm...' });

  // Check RapidKit npm package - distinguish global vs npx cache
  try {
    const { execa } = await import('execa');

    // Check global installation first
    let isGlobal = false;
    try {
      await execa('which', ['rapidkit']);
      isGlobal = true;
    } catch {
      // Not in PATH, might be in npx cache
    }

    // Get version from npx
    const rapidkitResult = await execa('npx', ['--yes', 'rapidkit@latest', '--version'], {
      timeout: 10000,
    });
    const version = rapidkitResult.stdout.trim();

    let npmMessage = `v${version}`;
    if (isGlobal) {
      npmMessage += ' (globally installed)';
    } else {
      npmMessage += ' (npx cache only)';
    }

    // Check for newer version
    try {
      const data = await fetchJson('https://registry.npmjs.org/rapidkit/latest');
      const latestVersion = data.version;
      if (isNewerVersion(version, latestVersion)) {
        npmMessage += ` → v${latestVersion} available`;
      }
    } catch {
      // Silently fail version check
    }

    result.checks.push({
      name: 'RapidKit npm',
      status: isGlobal ? 'pass' : 'fail',
      message: npmMessage + (isGlobal ? '' : ' - global installation recommended'),
    });
  } catch {
    result.passed = false;
    result.checks.push({
      name: 'RapidKit npm',
      status: 'fail',
      message: 'Not installed - run: npm install -g rapidkit',
    });
  }

  progress.report({ increment: 100, message: 'Done!' });

  // Show results
  const lines = ['# RapidKit System Check\n'];

  for (const check of result.checks) {
    const icon = check.status === 'pass' ? '✅' : check.status === 'warning' ? '⚠' : '❌';
    // Simplify message by removing extra details
    let message = check.message;
    // Remove parenthetical details like "(globally installed)", "(python3)", etc.
    message = message.replace(/\s*\([^)]*\)$/g, '');
    lines.push(`${icon} ${check.name}: ${message}`);
  }

  lines.push(
    '\n---\n',
    result.passed ? '✅ All required checks passed!' : '⚠ Some checks failed. See details above.'
  );

  // Show in output channel
  const output = vscode.window.createOutputChannel('RapidKit Doctor');
  output.clear();
  output.appendLine(lines.join('\n'));
  output.show();

  return result;
}

export async function doctorCommand() {
  const logger = Logger.getInstance();
  logger.info('Doctor command initiated');

  try {
    const result = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Running system checks',
        cancellable: false,
      },
      runSystemChecks
    );

    // Show notification
    if (result.passed) {
      const viewReportAction = '📊 View Full Report';
      const selected = await vscode.window.showInformationMessage(
        '✅ System check passed!',
        { modal: false },
        viewReportAction
      );

      if (selected === viewReportAction) {
        await vscode.commands.executeCommand('rapidkit.doctor');
      }
    } else {
      const fixIssuesAction = '🔧 View Issues';
      const selected = await vscode.window.showWarningMessage(
        '⚠️ Some system checks failed. See output for details.',
        { modal: false },
        fixIssuesAction
      );

      if (selected === fixIssuesAction) {
        await vscode.commands.executeCommand('rapidkit.doctor');
      }
    }
  } catch (error) {
    logger.error('Error in doctorCommand', error);
    vscode.window.showErrorMessage(
      `System check failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
