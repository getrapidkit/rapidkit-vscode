/**
 * Doctor Command
 * Run system checks for RapidKit requirements
 */

import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { SystemCheckResult } from '../types';
import { getPoetryVersion } from '../utils/poetryHelper';
import { checkPythonEnvironment } from '../utils/pythonChecker';

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

    // Check RapidKit core
    if (pythonEnv.rapidkitCoreInstalled) {
      result.checks.push({
        name: 'RapidKit core',
        status: 'pass',
        message: 'Installed in system Python',
      });
    } else {
      result.checks.push({
        name: 'RapidKit core',
        status: 'warning',
        message: 'Not installed in system Python (will use workspace venv)',
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

  // Check RapidKit npm package
  try {
    const { execa } = await import('execa');
    const rapidkitResult = await execa('npx', ['rapidkit', '--version'], { timeout: 10000 });
    const version = rapidkitResult.stdout.trim();
    result.checks.push({
      name: 'RapidKit npm',
      status: 'pass',
      message: `v${version}`,
    });
  } catch {
    result.checks.push({
      name: 'RapidKit npm',
      status: 'warning',
      message: 'Not cached (will download on first use)',
    });
  }

  progress.report({ increment: 100, message: 'Done!' });

  // Show results
  const lines = ['# RapidKit System Check\n'];

  for (const check of result.checks) {
    const icon = check.status === 'pass' ? '✅' : check.status === 'warning' ? '⚠️' : '❌';
    lines.push(`${icon} **${check.name}**: ${check.message}`);
  }

  lines.push(
    '\n---\n',
    result.passed
      ? '✅ All required checks passed!'
      : '❌ Some checks failed. Please install missing requirements.'
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
