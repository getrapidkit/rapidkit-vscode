/**
 * System check command - shows rapidkit-core installation status
 */

import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '../utils/logger';

const execAsync = promisify(exec);
const logger = Logger.getInstance();

interface PackageInfo {
  installed: boolean;
  version?: string;
  location?: string;
  latestVersion?: string;
}

export async function checkSystemCommand() {
  try {
    const coreInfo = await checkRapidKitCore();
    const npmInfo = await checkRapidKitNpm();

    // Show results in message
    let message = '## RapidKit System Status\n\n';

    // Core package
    message += '### Python Core (rapidkit-core)\n';
    if (coreInfo.installed) {
      message += `✅ Installed: ${coreInfo.version}\n`;
      if (coreInfo.location) {
        message += `📍 Location: ${coreInfo.location}\n`;
      }
      if (coreInfo.latestVersion && coreInfo.version !== coreInfo.latestVersion) {
        message += `⚠️ Latest version: ${coreInfo.latestVersion} (update available)\n`;
      }
    } else {
      message += '❌ Not installed\n';
      if (coreInfo.latestVersion) {
        message += `💡 Latest version: ${coreInfo.latestVersion}\n`;
      }
      message += '💡 Install: `pip install rapidkit-core`\n';
    }

    message += '\n### NPM Package (rapidkit)\n';
    if (npmInfo.installed) {
      message += `✅ Installed: ${npmInfo.version}\n`;
      if (npmInfo.latestVersion && npmInfo.version !== npmInfo.latestVersion) {
        message += `⚠️ Latest version: ${npmInfo.latestVersion} (update available)\n`;
      }
    } else {
      message += '❌ Not installed globally\n';
      if (npmInfo.latestVersion) {
        message += `💡 Latest version: ${npmInfo.latestVersion}\n`;
      }
      message += '💡 Install: `npm install -g rapidkit`\n';
    }

    // Show in output panel
    const channel = vscode.window.createOutputChannel('RapidKit System Check');
    channel.clear();
    channel.appendLine(message);
    channel.show();

    // Also show quick summary
    const summary = coreInfo.installed
      ? `rapidkit-core ${coreInfo.version} installed`
      : 'rapidkit-core not installed';
    vscode.window.showInformationMessage(`RapidKit System: ${summary}`, 'OK');
  } catch (error) {
    logger.error('System check failed:', error);
    vscode.window.showErrorMessage('Failed to check system status');
  }
}

async function checkRapidKitCore(): Promise<PackageInfo> {
  try {
    // Try pip list
    const { stdout } = await execAsync(
      'pip list 2>/dev/null || python3 -m pip list 2>/dev/null || python -m pip list 2>/dev/null'
    );
    const lines = stdout.split('\n');
    const coreLine = lines.find((line) => line.toLowerCase().includes('rapidkit-core'));

    if (coreLine) {
      // Extract version from line like "rapidkit-core     0.2.2"
      const match = coreLine.match(/rapidkit-core\s+(\S+)/i);
      const version = match ? match[1] : undefined;

      // Try to get location
      let location: string | undefined;
      try {
        const { stdout: showOutput } = await execAsync(
          'pip show rapidkit-core 2>/dev/null || python3 -m pip show rapidkit-core 2>/dev/null || python -m pip show rapidkit-core 2>/dev/null'
        );
        const locationMatch = showOutput.match(/Location:\s*(.+)/);
        if (locationMatch) {
          location = locationMatch[1].trim();
        }
      } catch {
        // Ignore if show fails
      }

      // Try to get latest version from PyPI
      const latestVersion = await getLatestPyPIVersion('rapidkit-core');

      return {
        installed: true,
        version,
        location,
        latestVersion,
      };
    }

    // Not installed - try to get latest version
    const latestVersion = await getLatestPyPIVersion('rapidkit-core');
    return {
      installed: false,
      latestVersion,
    };
  } catch {
    return { installed: false };
  }
}

async function checkRapidKitNpm(): Promise<PackageInfo> {
  try {
    // Try npm list -g
    const { stdout } = await execAsync('npm list -g rapidkit 2>/dev/null || echo ""');

    // Look for version in output like "rapidkit@0.16.3"
    const match = stdout.match(/rapidkit@(\S+)/);

    if (match) {
      const version = match[1];
      const latestVersion = await getLatestNpmVersion('rapidkit');

      return {
        installed: true,
        version,
        latestVersion,
      };
    }

    // Not installed - try to get latest version
    const latestVersion = await getLatestNpmVersion('rapidkit');
    return {
      installed: false,
      latestVersion,
    };
  } catch {
    return { installed: false };
  }
}

async function getLatestPyPIVersion(packageName: string): Promise<string | undefined> {
  try {
    const { stdout } = await execAsync(`pip index versions ${packageName} 2>/dev/null | head -n 1`);
    // Output format: "rapidkit-core (0.2.1)"
    const match = stdout.match(/\(([^)]+)\)/);
    return match ? match[1] : undefined;
  } catch {
    // Try alternative method with pip search (might be disabled)
    try {
      const https = require('https');
      return new Promise((resolve) => {
        https
          .get(`https://pypi.org/pypi/${packageName}/json`, (res: any) => {
            let data = '';
            res.on('data', (chunk: any) => (data += chunk));
            res.on('end', () => {
              try {
                const json = JSON.parse(data);
                resolve(json.info.version);
              } catch {
                resolve(undefined);
              }
            });
          })
          .on('error', () => resolve(undefined));
      });
    } catch {
      return undefined;
    }
  }
}

async function getLatestNpmVersion(packageName: string): Promise<string | undefined> {
  try {
    const { stdout } = await execAsync(`npm view ${packageName} version 2>/dev/null`);
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}
