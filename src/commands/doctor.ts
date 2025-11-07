/**
 * Doctor Command
 * Run system checks for RapidKit requirements
 */

import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { SystemCheckResult } from '../types';

export async function doctorCommand() {
  const logger = Logger.getInstance();
  logger.info('Doctor command initiated');

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Running system checks',
        cancellable: false,
      },
      async (progress) => {
        progress.report({ increment: 0, message: 'Checking Python...' });

        const result: SystemCheckResult = {
          passed: true,
          checks: [],
        };

        // Check Python
        try {
          const { execa } = await import('execa');
          const pythonResult = await execa('python3', ['--version']);
          result.checks.push({
            name: 'Python',
            status: 'pass',
            message: pythonResult.stdout,
          });
        } catch (error) {
          result.passed = false;
          result.checks.push({
            name: 'Python',
            status: 'fail',
            message: 'Python 3 not found',
          });
        }

        progress.report({ increment: 25, message: 'Checking Node.js...' });

        // Check Node.js
        try {
          const { execa } = await import('execa');
          const nodeResult = await execa('node', ['--version']);
          result.checks.push({
            name: 'Node.js',
            status: 'pass',
            message: nodeResult.stdout,
          });
        } catch (error) {
          result.checks.push({
            name: 'Node.js',
            status: 'warning',
            message: 'Node.js not found (optional for demo mode)',
          });
        }

        progress.report({ increment: 50, message: 'Checking Poetry...' });

        // Check Poetry
        try {
          const { execa } = await import('execa');
          const poetryResult = await execa('poetry', ['--version']);
          result.checks.push({
            name: 'Poetry',
            status: 'pass',
            message: poetryResult.stdout,
          });
        } catch (error) {
          result.checks.push({
            name: 'Poetry',
            status: 'warning',
            message: 'Poetry not found (optional)',
          });
        }

        progress.report({ increment: 75, message: 'Checking Git...' });

        // Check Git
        try {
          const { execa } = await import('execa');
          const gitResult = await execa('git', ['--version']);
          result.checks.push({
            name: 'Git',
            status: 'pass',
            message: gitResult.stdout,
          });
        } catch (error) {
          result.checks.push({
            name: 'Git',
            status: 'warning',
            message: 'Git not found (optional)',
          });
        }

        progress.report({ increment: 100, message: 'Done!' });

        // Show results
        showDoctorResults(result);
      }
    );
  } catch (error) {
    logger.error('Error in doctorCommand', error);
    vscode.window.showErrorMessage(
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function showDoctorResults(result: SystemCheckResult) {
  const lines = ['# RapidKit System Check\n'];

  for (const check of result.checks) {
    const icon =
      check.status === 'pass' ? '✅' : check.status === 'warning' ? '⚠️' : '❌';
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

  // Show notification
  if (result.passed) {
    vscode.window.showInformationMessage('✅ System check passed!');
  } else {
    vscode.window.showWarningMessage(
      '⚠️ Some system checks failed. See output for details.'
    );
  }
}
