/**
 * Setup Panel
 * Dedicated webview panel for system requirements and toolchain setup
 */

import * as vscode from 'vscode';

export class SetupPanel {
  public static currentPanel: SetupPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    this._panel = panel;
    this._panel.webview.html = this._getHtmlContent(context);

    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'checkInstallStatus': {
            const status = await this._checkInstallationStatus();
            this._panel.webview.postMessage({ command: 'statusUpdate', status });
            break;
          }
          case 'clearRequirementCache': {
            try {
              const { requirementCache } = await import('../../utils/requirementCache.js');
              requirementCache.invalidateAll();
              vscode.window.showInformationMessage(
                '✅ Cache Cleared\n\nPython and Poetry checks will be performed fresh on next use.'
              );
              // Refresh status to show it's cleared
              const status = await this._checkInstallationStatus();
              this._panel.webview.postMessage({ command: 'statusUpdate', status });
            } catch {
              vscode.window.showErrorMessage('Failed to clear cache');
            }
            break;
          }
          case 'doctor':
            vscode.commands.executeCommand('rapidkit.doctor');
            break;
          case 'showWelcome':
            vscode.commands.executeCommand('rapidkit.showWelcome');
            break;
          case 'openUrl':
            vscode.env.openExternal(vscode.Uri.parse(message.url));
            break;
          case 'showInfo':
            vscode.window.showInformationMessage(message.message);
            break;
          case 'installNpmGlobal': {
            const terminal = vscode.window.createTerminal('Install RapidKit CLI');
            terminal.show();
            terminal.sendText('npm install -g rapidkit');
            setTimeout(async () => {
              const newStatus = await this._checkInstallationStatus();
              this._panel.webview.postMessage({ command: 'statusUpdate', status: newStatus });
            }, 8000);
            break;
          }
          case 'upgradeNpmGlobal': {
            const terminal = vscode.window.createTerminal('Upgrade RapidKit CLI');
            terminal.show();
            terminal.sendText('npm install -g rapidkit@latest');
            setTimeout(async () => {
              const newStatus = await this._checkInstallationStatus();
              this._panel.webview.postMessage({ command: 'statusUpdate', status: newStatus });
            }, 8000);
            break;
          }
          case 'installPipCore': {
            const terminal = vscode.window.createTerminal('Install RapidKit Core');
            terminal.show();
            terminal.sendText('pipx install --force rapidkit-core');
            setTimeout(async () => {
              const newStatus = await this._checkInstallationStatus();
              this._panel.webview.postMessage({ command: 'statusUpdate', status: newStatus });
            }, 10000);
            break;
          }
          case 'upgradePipCore': {
            const terminal = vscode.window.createTerminal('Upgrade RapidKit Core');
            terminal.show();
            terminal.sendText('pipx upgrade rapidkit-core');
            setTimeout(async () => {
              const newStatus = await this._checkInstallationStatus();
              this._panel.webview.postMessage({ command: 'statusUpdate', status: newStatus });
            }, 10000);
            break;
          }
          case 'installPoetry': {
            const terminal = vscode.window.createTerminal('Install Poetry');
            terminal.show();
            if (process.platform === 'win32') {
              terminal.sendText(
                '(Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | python -'
              );
            } else {
              terminal.sendText('curl -sSL https://install.python-poetry.org | python3 -');
            }
            setTimeout(async () => {
              // Invalidate Poetry cache after installation
              try {
                const { requirementCache } = await import('../../utils/requirementCache.js');
                requirementCache.invalidatePoetry();
              } catch {
                // Ignore cache errors
              }
              const newStatus = await this._checkInstallationStatus();
              this._panel.webview.postMessage({ command: 'statusUpdate', status: newStatus });
            }, 12000);
            break;
          }
          case 'installPipx': {
            const terminal = vscode.window.createTerminal('Install pipx');
            terminal.show();
            if (process.platform === 'win32') {
              terminal.sendText('python -m pip install --user pipx && python -m pipx ensurepath');
            } else {
              terminal.sendText('python3 -m pip install --user pipx && python3 -m pipx ensurepath');
            }
            vscode.window.showInformationMessage(
              'pipx installed. Please restart your terminal or VS Code for PATH changes to take effect.'
            );
            setTimeout(async () => {
              const newStatus = await this._checkInstallationStatus();
              this._panel.webview.postMessage({ command: 'statusUpdate', status: newStatus });
            }, 8000);
            break;
          }
          case 'installPipxThenCore': {
            const terminal = vscode.window.createTerminal('Setup RapidKit Toolchain');
            terminal.show();
            if (process.platform === 'win32') {
              terminal.sendText(
                'python -m pip install --user pipx && python -m pipx ensurepath && pipx install --force rapidkit-core'
              );
            } else {
              terminal.sendText(
                'python3 -m pip install --user pipx && python3 -m pipx ensurepath && pipx install --force rapidkit-core'
              );
            }
            vscode.window.showInformationMessage(
              'Installing pipx and RapidKit Core. Please wait...'
            );
            setTimeout(async () => {
              const newStatus = await this._checkInstallationStatus();
              this._panel.webview.postMessage({ command: 'statusUpdate', status: newStatus });
            }, 15000);
            break;
          }
          case 'installCoreFallback': {
            const answer = await vscode.window.showWarningMessage(
              'pipx not found. Install RapidKit Core with pip --user instead? (fallback mode)',
              'Install with pip',
              'Cancel'
            );
            if (answer === 'Install with pip') {
              const terminal = vscode.window.createTerminal('Install RapidKit Core (fallback)');
              terminal.show();
              if (process.platform === 'win32') {
                terminal.sendText('python -m pip install --user rapidkit-core');
              } else {
                terminal.sendText('python3 -m pip install --user rapidkit-core');
              }
              vscode.window.showWarningMessage(
                'RapidKit Core installed via pip. This may conflict with virtualenvs. Consider installing pipx later.'
              );
              setTimeout(async () => {
                const newStatus = await this._checkInstallationStatus();
                this._panel.webview.postMessage({ command: 'statusUpdate', status: newStatus });
              }, 10000);
            }
            break;
          }
          case 'verifyPython': {
            const terminal = vscode.window.createTerminal('Verify Python');
            terminal.show();
            terminal.sendText('python --version');
            break;
          }
          case 'verifyPip': {
            const terminal = vscode.window.createTerminal('Verify pip');
            terminal.show();
            terminal.sendText('pip --version');
            break;
          }
          case 'verifyPipx': {
            const terminal = vscode.window.createTerminal('Verify pipx');
            terminal.show();
            terminal.sendText('pipx --version');
            break;
          }
          case 'verifyCore': {
            const terminal = vscode.window.createTerminal('Verify RapidKit Core');
            terminal.show();
            terminal.sendText('rapidkit --version');
            break;
          }
          case 'verifyNpm': {
            const terminal = vscode.window.createTerminal('Verify RapidKit CLI');
            terminal.show();
            terminal.sendText('npx rapidkit --version');
            break;
          }
          case 'verifyPoetry': {
            const terminal = vscode.window.createTerminal('Verify Poetry');
            terminal.show();
            terminal.sendText('poetry --version');
            break;
          }
          case 'getCacheStats': {
            try {
              const { requirementCache } = await import('../../utils/requirementCache.js');
              const stats = requirementCache.getStats();
              this._panel.webview.postMessage({ command: 'cacheStatsUpdate', stats });
            } catch {
              this._panel.webview.postMessage({ command: 'cacheStatsUpdate', stats: null });
            }
            break;
          }
        }
      },
      null,
      this._disposables
    );

    setImmediate(async () => {
      const status = await this._checkInstallationStatus();
      this._panel.webview.postMessage({ command: 'statusUpdate', status });
    });

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  public static show(context: vscode.ExtensionContext) {
    const column = vscode.ViewColumn.One;

    if (SetupPanel.currentPanel) {
      SetupPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'rapidkitSetup',
      '⚙️ RapidKit Setup & Installation',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    SetupPanel.currentPanel = new SetupPanel(panel, context);
  }

  public dispose() {
    SetupPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  private async _checkInstallationStatus() {
    const { execa } = await import('execa');
    const os = await import('os');

    const status = {
      platform: process.platform,
      isWindows: process.platform === 'win32',
      isMac: process.platform === 'darwin',
      isLinux: process.platform === 'linux',

      nodeInstalled: false,
      nodeVersion: null as string | null,
      npmInstalled: false,
      npmVersion: null as string | null,
      npmLocation: null as string | null,
      npmAvailableViaNpx: false,
      latestNpmVersion: null as string | null,

      pythonInstalled: false,
      pythonVersion: null as string | null,
      pythonNeedsUpgrade: false,
      pipInstalled: false,
      pipVersion: null as string | null,
      pipxInstalled: false,
      pipxVersion: null as string | null,
      poetryInstalled: false,
      poetryVersion: null as string | null,

      coreInstalled: false,
      coreVersion: null as string | null,
      coreInstallType: null as 'global' | 'workspace' | null,
      latestCoreVersion: null as string | null,
      latestCoreStable: null as string | null,
      latestCorePrerelease: null as string | null,
    };

    try {
      const result = await execa('node', ['--version'], {
        shell: status.isWindows,
        timeout: 2000,
      });
      status.nodeInstalled = true;
      status.nodeVersion = result.stdout.trim().replace('v', '');
    } catch {
      // ignore
    }

    try {
      const listResult = await execa('npm', ['list', '-g', 'rapidkit', '--depth=0'], {
        shell: status.isWindows,
        timeout: 3000,
        reject: false,
      });

      if (listResult.exitCode === 0 && listResult.stdout.includes('rapidkit@')) {
        const match = listResult.stdout.match(/rapidkit@([\d.]+)/);
        if (match) {
          status.npmVersion = match[1];
          status.npmInstalled = true;
          status.npmLocation = 'npm global';
        }
      } else {
        status.npmInstalled = false;
      }
    } catch {
      status.npmInstalled = false;
    }

    // Check if rapidkit is available via npx (even if not globally installed)
    if (!status.npmInstalled) {
      try {
        const npxResult = await execa('npx', ['rapidkit', '--version'], {
          shell: status.isWindows,
          timeout: 5000,
          reject: false,
        });

        if (npxResult.exitCode === 0 && npxResult.stdout) {
          const match = npxResult.stdout.match(/([\d.]+)/);
          if (match) {
            status.npmVersion = match[1];
            status.npmAvailableViaNpx = true;
            status.npmLocation = 'npx (not global)';
          }
        }
      } catch {
        // npx not available or rapidkit package not found
      }
    }

    const pythonCommands = status.isWindows
      ? ['py', 'python3', 'python']
      : ['python3', 'python', 'python3.10', 'python3.11', 'python3.12', 'python3.13'];

    for (const cmd of pythonCommands) {
      try {
        const result = await execa(cmd, ['--version'], {
          shell: status.isWindows,
          timeout: 2000,
        });
        status.pythonInstalled = true;
        const versionString = result.stdout.trim().replace('Python ', '');
        status.pythonVersion = versionString;

        const versionMatch = versionString.match(/^(\d+)\.(\d+)/);
        if (versionMatch) {
          const major = parseInt(versionMatch[1]);
          const minor = parseInt(versionMatch[2]);
          if (major < 3 || (major === 3 && minor < 10)) {
            status.pythonNeedsUpgrade = true;
          }
        }
        break;
      } catch {
        continue;
      }
    }

    if (status.pythonInstalled) {
      const pipVariants = status.isWindows
        ? [
            { cmd: 'py', args: ['-m', 'pip', '--version'] },
            { cmd: 'pip3', args: ['--version'] },
            { cmd: 'pip', args: ['--version'] },
          ]
        : [
            { cmd: 'pip3', args: ['--version'] },
            { cmd: 'pip', args: ['--version'] },
            { cmd: 'python3', args: ['-m', 'pip', '--version'] },
          ];

      for (const variant of pipVariants) {
        try {
          const result = await execa(variant.cmd, variant.args, {
            shell: status.isWindows,
            timeout: 3000,
          });
          status.pipInstalled = true;
          const versionMatch = result.stdout.match(/pip ([\d.]+)/);
          status.pipVersion = versionMatch ? versionMatch[1] : 'unknown';
          break;
        } catch {
          continue;
        }
      }
    }

    if (status.pythonInstalled && status.pipInstalled) {
      try {
        const result = await execa('pipx', ['--version'], {
          shell: status.isWindows,
          timeout: 3000,
        });
        status.pipxInstalled = true;
        status.pipxVersion =
          result.stdout.match(/pipx ([\d.]+)/)?.[1] ||
          result.stdout.match(/([\d.]+)/)?.[1] ||
          'unknown';
      } catch {
        status.pipxInstalled = false;
      }
    }

    if (status.pythonInstalled && status.pipInstalled) {
      try {
        const result = await execa('poetry', ['--version'], {
          shell: status.isWindows,
          timeout: 3000,
        });
        status.poetryInstalled = true;
        status.poetryVersion =
          result.stdout.match(/Poetry .*version ([\d.]+)/)?.[1] ||
          result.stdout.match(/([\d.]+)/)?.[1] ||
          'unknown';
      } catch {
        status.poetryInstalled = false;
      }
    }

    const detectionMethods = [
      async () => {
        for (const cmd of pythonCommands) {
          try {
            const result = await execa(
              cmd,
              ['-c', 'import rapidkit_core; print(rapidkit_core.__version__)'],
              {
                shell: status.isWindows,
                timeout: 3000,
                reject: true,
              }
            );
            const version = result.stdout.trim();
            if (version && !version.includes('command not found')) {
              return version;
            }
          } catch {
            continue;
          }
        }
        return null;
      },
      async () => {
        for (const cmd of pythonCommands) {
          try {
            const result = await execa(cmd, ['-m', 'pip', 'show', 'rapidkit-core'], {
              shell: status.isWindows,
              timeout: 3000,
            });
            const versionMatch = result.stdout.match(/Version:\s*(\S+)/);
            if (versionMatch) {
              return versionMatch[1];
            }
          } catch {
            continue;
          }
        }
        return null;
      },
      async () => {
        const pipCommands = status.isWindows ? ['pip', 'pip3'] : ['pip3', 'pip'];
        for (const cmd of pipCommands) {
          try {
            const result = await execa(cmd, ['show', 'rapidkit-core'], {
              shell: status.isWindows,
              timeout: 3000,
            });
            const versionMatch = result.stdout.match(/Version:\s*(\S+)/);
            if (versionMatch) {
              return versionMatch[1];
            }
          } catch {
            continue;
          }
        }
        return null;
      },
      async () => {
        if (status.isWindows) {
          return null;
        }
        try {
          const versionsResult = await execa('pyenv', ['versions', '--bare'], { timeout: 3000 });
          const versions = versionsResult.stdout.split('\n').filter((v) => v.trim());

          for (const version of versions) {
            try {
              const pyenvRoot = process.env.PYENV_ROOT || `${os.homedir()}/.pyenv`;
              const pipPath = `${pyenvRoot}/versions/${version.trim()}/bin/pip`;

              const result = await execa(pipPath, ['show', 'rapidkit-core'], { timeout: 2000 });
              const versionMatch = result.stdout.match(/Version:\s*(\S+)/);
              if (versionMatch) {
                return versionMatch[1];
              }
            } catch {
              continue;
            }
          }
        } catch {
          // ignore
        }
        return null;
      },
      async () => {
        try {
          const listResult = await execa('pipx', ['list'], {
            shell: status.isWindows,
            timeout: 3000,
            reject: false,
          });

          const listOutput = listResult.stdout + listResult.stderr;

          if (listOutput.includes('rapidkit-core')) {
            if (
              listOutput.includes('symlink missing') ||
              listOutput.includes('unexpected location')
            ) {
              return null;
            }

            try {
              const cmdResult = await execa('rapidkit', ['--version'], {
                shell: status.isWindows,
                timeout: 2000,
                reject: false,
              });
              const cmdOutput = cmdResult.stdout.trim();

              if (cmdOutput.includes('RapidKit') || cmdOutput.includes('Version')) {
                const versionMatch = cmdOutput.match(/v?([\d.]+(?:rc\d+)?(?:a\d+)?(?:b\d+)?)/);
                if (versionMatch) {
                  return versionMatch[1];
                }
                return 'installed';
              }
            } catch {
              // ignore
            }

            for (const cmd of pythonCommands) {
              try {
                const pyResult = await execa(
                  cmd,
                  ['-c', 'import rapidkit_core; print(rapidkit_core.__version__)'],
                  { shell: status.isWindows, timeout: 2000 }
                );
                const importedVersion = pyResult.stdout.trim();
                if (importedVersion) {
                  return null;
                }
              } catch {
                continue;
              }
            }
            return null;
          }
        } catch {
          // ignore
        }

        try {
          const cmdResult = await execa('rapidkit', ['--version'], {
            shell: status.isWindows,
            timeout: 2000,
            reject: false,
          });
          const cmdOutput = cmdResult.stdout.trim();

          if (cmdOutput.includes('RapidKit') || cmdOutput.includes('Version')) {
            const versionMatch = cmdOutput.match(/v?([\d.]+(?:rc\d+)?(?:a\d+)?(?:b\d+)?)/);
            if (versionMatch) {
              return versionMatch[1];
            }
            return 'installed';
          }
        } catch {
          // ignore
        }

        return null;
      },
      async () => {
        if (status.isWindows) {
          return null;
        }
        try {
          const fs = await import('fs-extra');
          const path = await import('path');
          const homedir = os.homedir();
          const venvPath = path.join(homedir, '.local', 'share', 'pipx', 'venvs', 'rapidkit-core');

          if (await fs.pathExists(venvPath)) {
            const pythonPath = path.join(venvPath, 'bin', 'python');
            if (await fs.pathExists(pythonPath)) {
              try {
                const result = await execa(
                  pythonPath,
                  ['-c', 'import rapidkit_core; print(rapidkit_core.__version__)'],
                  { timeout: 2000 }
                );
                return result.stdout.trim();
              } catch {
                // ignore
              }
            }
          }
        } catch {
          // ignore
        }
        return null;
      },
      async () => {
        try {
          const result = await execa('poetry', ['show', 'rapidkit-core'], {
            shell: status.isWindows,
            reject: false,
            timeout: 3000,
          });
          if (result.exitCode === 0) {
            const versionMatch = result.stdout.match(/version\s+:\s+(\S+)/);
            if (versionMatch) {
              return versionMatch[1];
            }
            return 'installed';
          }
        } catch {
          // ignore
        }
        return null;
      },
      async () => {
        try {
          const result = await execa('rapidkit', ['--version'], {
            shell: status.isWindows,
            timeout: 3000,
          });
          const output = result.stdout.trim();

          if (output.includes('RapidKit Version') || output.includes('rapidkit-core')) {
            const versionMatch = output.match(/v?([\d.]+(?:rc\d+)?(?:a\d+)?(?:b\d+)?)/i);
            if (versionMatch) {
              return versionMatch[1];
            }
          } else if (/^[\d.]+$/.test(output)) {
            return null;
          }
        } catch {
          // ignore
        }
        return null;
      },
      async () => {
        try {
          const result = await execa('conda', ['list', 'rapidkit-core'], {
            shell: status.isWindows,
            timeout: 3000,
          });
          if (result.stdout.includes('rapidkit-core')) {
            const lines = result.stdout.split('\n');
            for (const line of lines) {
              if (line.includes('rapidkit-core')) {
                const parts = line.split(/\s+/);
                if (parts.length >= 2) {
                  return parts[1];
                }
              }
            }
            return 'installed';
          }
        } catch {
          // ignore
        }
        return null;
      },
    ];

    for (let i = 0; i < detectionMethods.length; i++) {
      try {
        const version = await detectionMethods[i]();
        if (version) {
          status.coreInstalled = true;
          status.coreVersion = version === 'installed' ? 'unknown' : version;

          if (i === 4 || i === 5) {
            status.coreInstallType = 'global';
          } else if (i === 6) {
            status.coreInstallType = 'workspace';
          } else if (i === 0 || i === 1 || i === 2) {
            try {
              const pipxCheck = await execa('pipx', ['list'], {
                shell: status.isWindows,
                timeout: 2000,
                reject: false,
              });
              if (pipxCheck.stdout.includes('rapidkit-core')) {
                status.coreInstallType = 'global';
              } else {
                status.coreInstallType = 'workspace';
              }
            } catch {
              status.coreInstallType = 'workspace';
            }
          } else {
            status.coreInstallType = 'global';
          }
          break;
        }
      } catch {
        continue;
      }
    }

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

    try {
      try {
        // Force npm to fetch latest version without cache
        const npmResult = await execa(
          'npm',
          ['view', 'rapidkit', 'version', '--registry=https://registry.npmjs.org/'],
          { timeout: 8000 }
        );
        status.latestNpmVersion = npmResult.stdout.trim();
      } catch {
        try {
          const data = await fetchJson('https://registry.npmjs.org/rapidkit/latest');
          status.latestNpmVersion = data.version;
        } catch {
          // ignore
        }
      }

      try {
        const data = await fetchJson('https://pypi.org/pypi/rapidkit-core/json');

        const releases = Object.keys(data.releases || {});
        if (releases.length > 0) {
          const stableVersions: string[] = [];
          const prereleaseVersions: string[] = [];

          // Separate stable from pre-release
          releases.forEach((ver) => {
            if (ver.match(/\d+\.\d+\.\d+$/)) {
              // Pure X.Y.Z = stable
              stableVersions.push(ver);
            } else if (ver.match(/rc|alpha|beta|a\d|b\d/i)) {
              // Has RC/alpha/beta = prerelease
              prereleaseVersions.push(ver);
            }
          });

          // Sort helper
          const sortVersions = (versions: string[]) => {
            return versions.sort((a, b) => {
              const aParts = a.split(/[.-]/).map((p) => parseInt(p) || 0);
              const bParts = b.split(/[.-]/).map((p) => parseInt(p) || 0);
              for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
                const diff = (bParts[i] || 0) - (aParts[i] || 0);
                if (diff !== 0) {
                  return diff;
                }
              }
              return 0;
            });
          };

          if (stableVersions.length > 0) {
            status.latestCoreStable = sortVersions(stableVersions)[0];
          }
          if (prereleaseVersions.length > 0) {
            status.latestCorePrerelease = sortVersions(prereleaseVersions)[0];
          }

          // Fallback: use PyPI's reported latest
          if (data.info && data.info.version) {
            const reported = data.info.version;
            if (reported.match(/\d+\.\d+\.\d+$/)) {
              status.latestCoreStable = reported;
            }
          }

          // Backwards compat: latestCoreVersion = stable or prerelease
          status.latestCoreVersion = status.latestCoreStable || status.latestCorePrerelease;
        }
      } catch {
        // ignore
      }
    } catch {
      // ignore
    }

    return status;
  }

  private _getHtmlContent(context: vscode.ExtensionContext): string {
    const rapidkitIconUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'media', 'icons', 'rapidkit.svg')
    );
    const fontUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'media', 'fonts', 'MuseoModerno-Bold.ttf')
    );
    const npmIconUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'media', 'icons', 'npm.svg')
    );
    const pythonIconUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'media', 'icons', 'python.svg')
    );
    const pypiIconUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'media', 'icons', 'pypi.svg')
    );
    const poetryIconUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'media', 'icons', 'poetry.svg')
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>RapidKit Setup</title>
  <style>
    @font-face {
      font-family: 'MuseoModerno';
      src: url('${fontUri}') format('truetype');
      font-weight: 700;
      font-style: normal;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      min-height: 100vh;
      padding: 32px 24px;
    }
    @media (max-width: 768px) {
      body {
        padding: 20px 16px;
      }
    }
    .container { max-width: 1000px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 32px; }
    .logo { width: 64px; height: 64px; margin-bottom: 12px; }
    @media (max-width: 768px) {
      .header { margin-bottom: 24px; }
      .logo { width: 48px; height: 48px; margin-bottom: 8px; }
    }
    h1 {
      font-family: 'MuseoModerno', var(--vscode-font-family);
      font-size: 1.8rem;
      font-weight: 700;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }
    @media (max-width: 768px) {
      h1 {
        font-size: 1.5rem;
      }
    }
    h1 .rapid {
      background: linear-gradient(135deg, #00cfc1, #009688);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    h1 .kit { color: var(--vscode-foreground); }
    .tagline { font-size: 1rem; color: var(--vscode-descriptionForeground); margin-bottom: 10px; }
    .version {
      display: inline-block;
      background: linear-gradient(135deg, #00cfc1, #009688);
      color: white;
      padding: 4px 14px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
    }

    .setup-wizard {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 12px;
      padding: 24px;
      position: relative;
    }
    @media (max-width: 768px) {
      .setup-wizard {
        padding: 16px;
        border-radius: 8px;
      }
    }
    .wizard-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      gap: 12px;
      flex-wrap: wrap;
    }
    @media (max-width: 768px) {
      .wizard-header {
        margin-bottom: 16px;
      }
    }
    .wizard-title { font-size: 1.2rem; font-weight: 700; }
    .wizard-subtitle { color: var(--vscode-descriptionForeground); font-size: 13px; }
    .wizard-btn {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: 1px solid var(--vscode-panel-border);
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .wizard-btn:hover { background: var(--vscode-button-secondaryHoverBackground); }
    .wizard-btn.primary {
      background: linear-gradient(135deg, #00cfc1, #009688);
      color: white;
      border: none;
    }
    .wizard-btn.primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .wizard-btn .icon {
      width: 16px;
      height: 16px;
      display: inline-block;
    }
    .toolchain-ready-badge {
      position: absolute;
      top: -14px;
      left: 24px;
      background: linear-gradient(135deg, #4CAF50, #66BB6A);
      color: white;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
      animation: fadeInScale 0.3s ease-out;
    }
    @keyframes fadeInScale {
      from {
        opacity: 0;
        transform: scale(0.9);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    .installation-methods-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 24px 0 16px 0;
      padding: 10px 16px;
      background: var(--vscode-textBlockQuote-background);
      border-left: 4px solid #00cfc1;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      gap: 8px;
      flex-wrap: wrap;
    }
    @media (max-width: 768px) {
      .installation-methods-header {
        margin: 16px 0 12px 0;
        padding: 8px 12px;
        font-size: 12px;
      }
    }
    .method-recommendation { font-size: 12px; font-weight: 500; opacity: 0.8; }

    .rapidkit-packages {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }
    @media (max-width: 900px) {
      .rapidkit-packages {
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 12px;
      }
    }
    @media (max-width: 600px) {
      .rapidkit-packages {
        grid-template-columns: 1fr;
        gap: 12px;
      }
    }
    .wizard-steps {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 16px;
    }
    @media (max-width: 768px) {
      .wizard-steps {
        grid-template-columns: 1fr;
        gap: 12px;
      }
    }
    .wizard-step {
      position: relative;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 10px;
      padding: 18px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .wizard-step:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 207, 193, 0.15);
      border-color: rgba(0, 207, 193, 0.3);
    }
    .wizard-step.installed { 
      border-left: 4px solid #4CAF50;
      background: linear-gradient(135deg, rgba(76, 175, 80, 0.03) 0%, transparent 100%);
    }
    .wizard-step.not-installed { 
      border-left: 4px solid #FF5722;
      background: linear-gradient(135deg, rgba(255, 87, 34, 0.03) 0%, transparent 100%);
    }
    .wizard-step.needs-upgrade {
      border-left: 4px solid #FF9800;
      background: linear-gradient(135deg, rgba(255, 152, 0, 0.03) 0%, transparent 100%);
    }
    .wizard-step.warning { 
      border-left: 4px solid #FF9800;
      background: linear-gradient(135deg, rgba(255, 152, 0, 0.03) 0%, transparent 100%);
    }
    .wizard-step.installing {
      border-left: 4px solid #00BFA5;
      background: linear-gradient(135deg, rgba(0, 191, 165, 0.05) 0%, transparent 100%);
    }
    .step-recommended-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      padding: 5px 12px;
      background: linear-gradient(135deg, #00cfc1, #00BFA5);
      color: white;
      font-size: 10px;
      font-weight: 700;
      border-radius: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      z-index: 1;
      box-shadow: 0 2px 6px rgba(0, 207, 193, 0.3);
      transition: transform 0.2s;
    }
    .step-recommended-badge:hover {
      transform: scale(1.05);
    }
    .tooltip {
      position: relative;
      display: inline-block;
      cursor: help;
    }
    .tooltip .tooltiptext {
      visibility: hidden;
      width: 220px;
      background: var(--vscode-editorHoverWidget-background);
      color: var(--vscode-editorHoverWidget-foreground);
      text-align: left;
      border-radius: 6px;
      border: 1px solid var(--vscode-editorHoverWidget-border);
      padding: 8px 12px;
      position: absolute;
      z-index: 100;
      bottom: 125%;
      left: 50%;
      margin-left: -110px;
      opacity: 0;
      transition: opacity 0.3s;
      font-size: 11px;
      line-height: 1.5;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
    .tooltip .tooltiptext::after {
      content: "";
      position: absolute;
      top: 100%;
      left: 50%;
      margin-left: -5px;
      border-width: 5px;
      border-style: solid;
      border-color: var(--vscode-editorHoverWidget-border) transparent transparent transparent;
    }
    .tooltip:hover .tooltiptext {
      visibility: visible;
      opacity: 1;
    }
    .progress-container {
      width: 100%;
      height: 3px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
      overflow: hidden;
      margin-top: 8px;
      display: none;
    }
    .progress-container.active {
      display: block;
    }
    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #00cfc1, #00BFA5, #00cfc1);
      background-size: 200% 100%;
      animation: progressMove 2s linear infinite;
      border-radius: 2px;
    }
    @keyframes progressMove {
      0% { background-position: 0% 0%; }
      100% { background-position: 200% 0%; }
    }
    .install-time {
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      opacity: 0.7;
      margin-top: 4px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .install-time::before {
      content: '⏱';
      font-size: 11px;
    }
    .step-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
      padding-top: 24px;
    }
    .step-icon { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; }
    .step-icon img { width: 24px; height: 24px; }
    .step-title { font-weight: 600; font-size: 14px; flex: 1; }
    .step-status { font-size: 18px; min-width: 24px; text-align: center; }
    .step-status.loading { animation: pulse 1.5s ease-in-out infinite; }
    .step-status.loading::after { content: '⋯'; display: inline-block; }
    .wizard-step.installed .step-status { color: #4CAF50; }
    .wizard-step.needs-upgrade .step-status { color: #FF9800; }
    .wizard-step.not-installed .step-status { color: #FF5722; }
    @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .step-details { font-size: 13px; color: var(--vscode-descriptionForeground); margin-bottom: 14px; min-height: 32px; }
    .step-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .step-btn {
      flex: 1;
      min-width: 90px;
      background: transparent;
      color: var(--vscode-foreground);
      border: 1px solid var(--vscode-panel-border);
      padding: 8px 14px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      transition: all 0.2s ease;
    }
    .step-btn:hover { 
      border-color: #00cfc1;
      color: #00cfc1;
    }
    .step-btn.primary {
      border-color: #00cfc1;
      color: #00cfc1;
    }
    .step-btn.primary:hover {
      background: rgba(0, 207, 193, 0.1);
    }
    .step-btn.verify {
      border-color: #2196F3;
      color: #2196F3;
    }
    .step-btn.verify:hover {
      background: rgba(33, 150, 243, 0.1);
    }
    .wizard-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid var(--vscode-panel-border);
      gap: 12px;
      flex-wrap: wrap;
    }
    @media (max-width: 768px) {
      .wizard-footer {
        margin-top: 16px;
        padding-top: 12px;
      }
    }
    .wizard-progress { font-size: 14px; font-weight: 600; }
    .wizard-actions { display: flex; gap: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1><span class="rapid">Rapid</span><span class="kit">Kit</span></h1>
      <p class="tagline">Setup & Installation</p>
    </div>

    <div class="setup-wizard" id="setupWizard">
      <div class="toolchain-ready-badge" id="toolchainBadge" style="display: none;">
        <svg width="10" height="10" viewBox="0 0 10 10" style="margin-right: 6px;">
          <circle cx="5" cy="5" r="4" fill="currentColor"/>
        </svg>
        Ready
      </div>
      <div class="wizard-header">
        <div>
          <div class="wizard-title">🚀 Setup Status</div>
          <div class="wizard-subtitle" style="margin-top: 4px;">System Requirements & Toolchain</div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button class="wizard-btn" onclick="goBackToWelcome()" title="Back to Welcome">
            <svg class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 16px; height: 16px;">
              <path d="M19 12H5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 19l-7-7 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="wizard-btn" onclick="clearCache()" title="Clear Python & Poetry cache (force fresh check)">
            <svg class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 16px; height: 16px;">
              <path d="M3 6h18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M10 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="wizard-btn" onclick="refreshWizard()" title="Refresh">
            <svg class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 12a8 8 0 1 1-2.34-5.66" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M20 4v6h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Refresh
          </button>
          <button class="wizard-btn primary" onclick="finishSetup()" id="finishBtn" title="Run System Doctor">
            <svg class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 16px; height: 16px;">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- REQUIRED SECTION -->
      <div class="installation-methods-header" style="margin-bottom: 8px;">
        <span>⚙️ Required (Must Have)</span>
        <span class="method-recommendation" style="color: #FF5722;">Essential for all workflows</span>
      </div>
      <div class="rapidkit-packages">
        <div class="wizard-step" id="pythonStep">
          <div class="step-recommended-badge" style="background: linear-gradient(135deg, #3776AB, #2C5F8D);">System</div>
          <div class="step-header">
            <span class="step-icon tooltip"><img src="${pythonIconUri}" width="20" height="20" alt="Python" />
              <span class="tooltiptext">Python runtime environment. Required for RapidKit Core and all Python-based development.</span>
            </span>
            <span class="step-title">Python 3.10+</span>
            <span class="step-status loading" id="pythonStatus"></span>
          </div>
          <div class="step-details" id="pythonDetails">Checking...</div>
          <div class="install-time" style="display: none;" id="pythonTime">~5 min</div>
          <div class="progress-container" id="pythonProgress"><div class="progress-bar"></div></div>
          <div class="step-actions" id="pythonActions" style="display: none;">
            <button class="step-btn primary" onclick="openPythonDownload()">Install</button>
          </div>
          <div class="step-actions" id="pythonUpgrade" style="display: none;">
            <button class="step-btn primary" onclick="openPythonDownload()">Upgrade</button>
          </div>
          <div class="step-actions" id="pythonVerify" style="display: none;">
            <button class="step-btn verify" onclick="verifyPython()">Verify</button>
          </div>
        </div>
      </div>

      <!-- RECOMMENDED SECTION -->
      <div class="installation-methods-header" style="margin-top: 20px; margin-bottom: 8px;">
        <span>🎯 Recommended (Better Performance)</span>
        <span class="method-recommendation" style="color: #00BFA5;">Speeds up workspace creation</span>
      </div>
      <div class="rapidkit-packages">
        <div class="wizard-step" id="pipxStep">
          <div class="step-recommended-badge" style="background: linear-gradient(135deg, #9C27B0, #7B1FA2);">Tool Manager</div>
          <div class="step-header">
            <span class="step-icon tooltip"><img src="${pypiIconUri}" width="20" height="20" alt="pipx" />
              <span class="tooltiptext">Isolated Python application installer. Installs packages in separate environments to avoid conflicts.</span>
            </span>
            <span class="step-title">pipx</span>
            <span class="step-status loading" id="pipxStatus"></span>
          </div>
          <div class="step-details" id="pipxDetails">Checking...</div>
          <div class="install-time" style="display: none;" id="pipxTime">~1 min</div>
          <div class="progress-container" id="pipxProgress"><div class="progress-bar"></div></div>
          <div class="step-actions" id="pipxActions" style="display: none;">
            <button class="step-btn primary" onclick="installPipx()">Install</button>
          </div>
          <div class="step-actions" id="pipxVerify" style="display: none;">
            <button class="step-btn verify" onclick="verifyPipx()">Verify</button>
          </div>
        </div>

        <div class="wizard-step" id="coreStep">
          <div class="step-recommended-badge" style="background: linear-gradient(135deg, #00cfc1, #00BFA5);">Engine</div>
          <div class="step-header">
            <span class="step-icon tooltip"><img src="${rapidkitIconUri}" width="20" height="20" alt="RapidKit" />
              <span class="tooltiptext">RapidKit Python Framework with 40+ commands. Core engine for workspace creation and management.</span>
            </span>
            <span class="step-title">RapidKit Core</span>
            <span class="step-status loading" id="coreStatus"></span>
          </div>
          <div class="step-details" id="coreDetails">Checking...</div>
          <div class="install-time" style="display: none;" id="coreTime">~2 min</div>
          <div class="progress-container" id="coreProgress"><div class="progress-bar"></div></div>
          <div class="step-actions" id="coreActions" style="display: none;">
            <button class="step-btn primary" onclick="installPythonCore()">Install</button>
          </div>
          <div class="step-actions" id="coreActionsNoPipx" style="display: none;">
            <button class="step-btn primary" onclick="installPipxThenCore()">Setup All</button>
          </div>
          <div class="step-actions" id="coreUpgrade" style="display: none;">
            <button class="step-btn primary" onclick="upgradeCore()">Upgrade</button>
          </div>
          <div class="step-actions" id="coreVerify" style="display: none;">
            <button class="step-btn verify" onclick="verifyCore()">Verify</button>
          </div>
        </div>

        <div class="wizard-step" id="npmStep">
          <div class="step-recommended-badge" style="background: linear-gradient(135deg, #CB3837, #B02A2A);">CLI Bridge</div>
          <div class="step-header">
            <span class="step-icon tooltip"><img src="${npmIconUri}" width="20" height="20" alt="npm" />
              <span class="tooltiptext">Node.js command-line interface. Workspace and project manager with quick setup commands.</span>
            </span>
            <span class="step-title">RapidKit CLI</span>
            <span class="step-status loading" id="npmStatus"></span>
          </div>
          <div class="step-details" id="npmDetails">Checking...</div>
          <div class="install-time" style="display: none;" id="npmTime">~1 min</div>
          <div class="progress-container" id="npmProgress"><div class="progress-bar"></div></div>
          <div class="step-actions" id="npmActions" style="display: none;">
            <button class="step-btn primary" onclick="installNpmCLI()">Install</button>
          </div>
          <div class="step-actions" id="npmUpgrade" style="display: none;">
            <button class="step-btn primary" onclick="upgradeNpm()">Upgrade</button>
          </div>
          <div class="step-actions" id="npmVerify" style="display: none;">
            <button class="step-btn verify" onclick="verifyNpm()">Verify</button>
          </div>
        </div>
      </div>

      <!-- OPTIONAL SECTION -->
      <div class="installation-methods-header" style="margin-top: 20px;">
        <span>📦 Required for Workspace Creation</span>
        <span class="method-recommendation">Poetry needed for workspace setup (optional for CLI users with --install-method=venv)</span>
      </div>

      <div class="wizard-steps">
        <div class="wizard-step" id="poetryStep">
          <div class="step-recommended-badge" style="background: linear-gradient(135deg, #60A5FA, #3B82F6);">Recommended</div>
          <div class="step-header">
            <span class="step-icon tooltip"><img src="${poetryIconUri}" width="20" height="20" alt="Poetry" />
              <span class="tooltiptext">Python dependency management and packaging. Required by VS Code Extension for workspace creation. Manages virtual environments and dependencies for FastAPI projects.</span>
            </span>
            <span class="step-title">Poetry</span>
            <span class="step-status loading" id="poetryStatus"></span>
          </div>
          <div class="step-details" id="poetryDetails">Checking...</div>
          <div class="install-time" style="display: none;" id="poetryTime">~2 min</div>
          <div class="progress-container" id="poetryProgress"><div class="progress-bar"></div></div>
          <div class="step-actions" id="poetryActions" style="display: none;">
            <button class="step-btn primary" onclick="installPoetry()">Install</button>
          </div>
          <div class="step-actions" id="poetryVerify" style="display: none;">
            <button class="step-btn verify" onclick="verifyPoetry()">Verify</button>
          </div>
        </div>

        <div class="wizard-step" id="pipStep">
          <div class="step-header">
            <span class="step-icon tooltip"><img src="${pypiIconUri}" width="20" height="20" alt="PyPI" />
              <span class="tooltiptext">Python package installer. Usually included with Python. Used for per-project dependencies.</span>
            </span>
            <span class="step-title">pip</span>
            <span class="step-status loading" id="pipStatus"></span>
          </div>
          <div class="step-details" id="pipDetails">Checking...</div>
          <div class="step-actions" id="pipVerify" style="display: none;">
            <button class="step-btn verify" onclick="verifyPip()">Verify</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const isWindowsEnv = ${process.platform === 'win32'};

    window.addEventListener('DOMContentLoaded', () => {
      checkInstallationStatus();
    });

    function checkInstallationStatus() {
      vscode.postMessage({ command: 'checkInstallStatus' });
    }

    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.command === 'statusUpdate' || message.command === 'installStatusUpdate') {
        updateSetupStatus(message.status || message.data);
      }
    });

    function parseVersion(version) {
      if (!version) return null;
      const cleanVersion = String(version).trim().replace(/^v/i, '');
      // NOTE: This string is embedded inside a template literal, so backslashes must be escaped.
      const match = cleanVersion.match(/^(\\d+)\\.(\\d+)\\.(\\d+)([a-z]+\\d*)?/i);
      if (!match) return null;
      return {
        major: parseInt(match[1], 10),
        minor: parseInt(match[2], 10),
        patch: parseInt(match[3], 10),
        prerelease: match[4] || null,
      };
    }

    function isNewerVersion(current, latest) {
      if (!current || !latest) return false;
      try {
        const curr = parseVersion(current);
        const last = parseVersion(latest);
        if (!curr || !last) return false;
        if (last.major > curr.major) return true;
        if (last.major < curr.major) return false;
        if (last.minor > curr.minor) return true;
        if (last.minor < curr.minor) return false;
        if (last.patch > curr.patch) return true;
        if (last.patch < curr.patch) return false;
        if (!curr.prerelease && last.prerelease) return false;
        if (curr.prerelease && !last.prerelease) return true;
        return false;
      } catch (error) {
        console.error('[isNewerVersion] Error:', error);
        return false;
      }
    }

    function updateSetupStatus(status) {
      if (!status) return;

      const pythonStep = document.getElementById('pythonStep');
      const pythonStatus = document.getElementById('pythonStatus');
      const pythonDetails = document.getElementById('pythonDetails');
      const pythonActions = document.getElementById('pythonActions');
      const pythonUpgrade = document.getElementById('pythonUpgrade');

      const pythonVerify = document.getElementById('pythonVerify');
      if (status.pythonInstalled) {
        pythonStep.classList.remove('not-installed');
        pythonStep.classList.add('installed');
        pythonStatus.classList.remove('loading');

        let pythonDisplay = '<span class="step-version">v' + status.pythonVersion + '</span>';
        if (status.pythonNeedsUpgrade) {
          pythonStatus.textContent = '⚠';
          pythonStep.classList.add('needs-upgrade');
          pythonDisplay = '<span style="color: #FF5722; font-weight: 600;">v' + status.pythonVersion + '</span> <span style="color: #FF5722; margin-left: 8px; font-size: 10px;">⚠ Upgrade required</span>';
          if (pythonUpgrade) pythonUpgrade.style.display = 'flex';
          if (pythonVerify) pythonVerify.style.display = 'none';
        } else {
          pythonStatus.textContent = '✓';
          pythonStep.classList.remove('needs-upgrade');
          pythonDisplay += ' <span style="color: #4CAF50; margin-left: 8px; font-size: 10px;">✓ System ready</span>';
          pythonActions.style.display = 'none';
          if (pythonUpgrade) pythonUpgrade.style.display = 'none';
          if (pythonVerify) pythonVerify.style.display = 'flex';
        }
        pythonDetails.innerHTML = pythonDisplay;
      } else {
        pythonStep.classList.remove('installed');
        pythonStep.classList.add('not-installed');
        pythonStatus.textContent = '⚠';
        pythonStatus.classList.remove('loading');
        pythonDetails.innerHTML = '<span style="color: #FF5722;">Not installed - Required</span>';
        pythonActions.style.display = 'flex';
        if (pythonUpgrade) pythonUpgrade.style.display = 'none';
      }

      const pipStep = document.getElementById('pipStep');
      const pipStatus = document.getElementById('pipStatus');
      const pipDetails = document.getElementById('pipDetails');
      const pipVerify = document.getElementById('pipVerify');

      if (status.pipInstalled) {
        pipStep.classList.remove('not-installed');
        pipStep.classList.add('installed');
        pipStatus.textContent = '✓';
        pipStatus.classList.remove('loading');
        pipDetails.innerHTML = '<span class="step-version">v' + status.pipVersion + '</span>';
        if (pipVerify) pipVerify.style.display = 'flex';
      } else {
        pipStep.classList.remove('installed');
        pipStep.classList.add('not-installed');
        pipStatus.textContent = '⚠';
        pipStatus.classList.remove('loading');
        pipDetails.innerHTML = 'Optional (per-project dependencies)';
        if (pipVerify) pipVerify.style.display = 'none';
      }

      const poetryStep = document.getElementById('poetryStep');
      const poetryStatus = document.getElementById('poetryStatus');
      const poetryDetails = document.getElementById('poetryDetails');
      const poetryActions = document.getElementById('poetryActions');

      const poetryVerify = document.getElementById('poetryVerify');
      if (status.poetryInstalled) {
        poetryStep.classList.remove('not-installed');
        poetryStep.classList.add('installed');
        poetryStatus.textContent = '✓';
        poetryStatus.classList.remove('loading');
        poetryDetails.innerHTML = '<span class="step-version">v' + status.poetryVersion + '</span>';
        poetryActions.style.display = 'none';
        if (poetryVerify) poetryVerify.style.display = 'flex';
      } else {
        poetryStep.classList.remove('installed');
        poetryStep.classList.add('not-installed');
        poetryStatus.textContent = '⚠';
        poetryStatus.classList.remove('loading');
        poetryDetails.innerHTML = 'Recommended for FastAPI projects';
        poetryActions.style.display = 'flex';
      }

      const pipxStep = document.getElementById('pipxStep');
      const pipxStatus = document.getElementById('pipxStatus');
      const pipxDetails = document.getElementById('pipxDetails');
      const pipxActions = document.getElementById('pipxActions');

      const pipxVerify = document.getElementById('pipxVerify');
      if (status.pipxInstalled) {
        pipxStep.classList.remove('not-installed');
        pipxStep.classList.add('installed');
        pipxStatus.textContent = '✓';
        pipxStatus.classList.remove('loading');
        pipxDetails.innerHTML = '<span class="step-version">v' + status.pipxVersion + '</span> <span style="color: #4CAF50; margin-left: 8px; font-size: 10px;">✓ Ready for global tools</span>';
        pipxActions.style.display = 'none';
        if (pipxVerify) pipxVerify.style.display = 'flex';
      } else {
        pipxStep.classList.remove('installed');
        pipxStep.classList.add('not-installed');
        pipxStatus.textContent = '⚠';
        pipxStatus.classList.remove('loading');
        pipxDetails.innerHTML = '<span style="color: #FF9800; font-weight: 600;">Recommended</span> <span style="font-size: 10px; display: block; margin-top: 4px;">Speeds up workspace creation</span>';
        pipxActions.style.display = 'flex';
      }

      const npmStep = document.getElementById('npmStep');
      const npmStatus = document.getElementById('npmStatus');
      const npmDetails = document.getElementById('npmDetails');
      const npmActions = document.getElementById('npmActions');
      const npmUpgrade = document.getElementById('npmUpgrade');

      const npmVerify = document.getElementById('npmVerify');
      if (status.npmInstalled) {
        npmStep.classList.remove('not-installed');
        npmStep.classList.add('installed');
        npmStatus.textContent = '✓';
        npmStatus.classList.remove('loading');

        let npmDisplay = '<span class="step-version">v' + status.npmVersion + '</span>';
        if (status.latestNpmVersion && isNewerVersion(status.npmVersion, status.latestNpmVersion)) {
          npmStep.classList.add('needs-upgrade');
          npmStep.classList.remove('installed');
          npmStatus.textContent = '⬆';
          npmDisplay += ' <span style="color: #FF9800; margin-left: 8px;">→ v' + status.latestNpmVersion + '</span>';
          npmActions.style.display = 'none';
          npmUpgrade.style.display = 'flex';
          if (npmVerify) npmVerify.style.display = 'none';
        } else {
          npmStep.classList.remove('needs-upgrade');
          npmStep.classList.add('installed');
          npmStatus.textContent = '✓';
          npmDisplay += ' <span style="color: #4CAF50; margin-left: 8px; font-size: 10px;">✓ Workspace manager ready</span>';
          npmActions.style.display = 'none';
          npmUpgrade.style.display = 'none';
          if (npmVerify) npmVerify.style.display = 'flex';
        }
        npmDetails.innerHTML = npmDisplay;
      } else if (status.npmAvailableViaNpx) {
        npmStep.classList.remove('installed');
        npmStep.classList.add('needs-upgrade');
        npmStatus.textContent = '⚠️';
        npmStatus.classList.remove('loading');
        npmDetails.innerHTML = '<span style="color: #FF9800; font-weight: 600;">v' + status.npmVersion + ' via npx</span> <span style="font-size: 10px; display: block; margin-top: 4px; color: #666;">💡 Install globally: npm install -g rapidkit</span>';
        npmActions.style.display = 'flex';
        npmUpgrade.style.display = 'none';
      } else {
        npmStep.classList.remove('installed');
        npmStep.classList.add('not-installed');
        npmStatus.textContent = '⚠';
        npmStatus.classList.remove('loading');
        npmDetails.innerHTML = '<span style="color: #FF5722; font-weight: 600;">Not installed</span> <span style="font-size: 10px; display: block; margin-top: 4px;">Workspace & project manager</span>';
        npmActions.style.display = 'flex';
        npmUpgrade.style.display = 'none';
      }

      const coreStep = document.getElementById('coreStep');
      const coreStatus = document.getElementById('coreStatus');
      const coreDetails = document.getElementById('coreDetails');
      const coreActions = document.getElementById('coreActions');
      const coreUpgrade = document.getElementById('coreUpgrade');
      const coreActionsNoPipx = document.getElementById('coreActionsNoPipx');
      const coreVerify = document.getElementById('coreVerify');

      if (status.coreInstalled) {
        coreStep.classList.remove('not-installed');
        let coreDisplay = '<span class="step-version">v' + status.coreVersion + '</span>';

        if (status.coreInstallType === 'global') {
          coreStep.classList.add('installed');
          coreStatus.textContent = '✓';
          coreStatus.classList.remove('loading');

          const installedIsRC = /rc|alpha|beta/i.test(status.coreVersion);
          const stableAvailable = status.latestCoreStable;
          const prereleaseAvailable = status.latestCorePrerelease;

          // Logic: if stable newer than installed -> strong upgrade
          if (stableAvailable && isNewerVersion(status.coreVersion, stableAvailable)) {
            coreStep.classList.add('needs-upgrade');
            coreStep.classList.remove('installed');
            coreStatus.textContent = '⬆';
            coreDisplay += ' <span style="color: #FF9800; margin-left: 8px;">→ v' + stableAvailable + '</span>';
            coreActions.style.display = 'none';
            if (coreActionsNoPipx) coreActionsNoPipx.style.display = 'none';
            if (coreVerify) coreVerify.style.display = 'none';
            coreUpgrade.style.display = 'flex';
          }
          // Installed is RC and stable exists for same/newer base -> suggest stable
          else if (installedIsRC && stableAvailable && isNewerVersion(status.coreVersion, stableAvailable)) {
            coreStep.classList.add('needs-upgrade');
            coreStep.classList.remove('installed');
            coreStatus.textContent = '⬆';
            coreDisplay += ' <span style="color: #FF9800; margin-left: 8px;">→ v' + stableAvailable + ' (Stable)</span>';
            coreActions.style.display = 'none';
            if (coreActionsNoPipx) coreActionsNoPipx.style.display = 'none';
            if (coreVerify) coreVerify.style.display = 'none';
            coreUpgrade.style.display = 'flex';
          }
          // Up to date stable, but RC available -> informational only
          else if (!installedIsRC && prereleaseAvailable && isNewerVersion(status.coreVersion, prereleaseAvailable)) {
            coreStep.classList.remove('needs-upgrade');
            coreStep.classList.add('installed');
            coreStatus.textContent = '✓';
            coreDisplay += ' <span style="color: #4CAF50; margin-left: 8px; font-size: 10px;">✓ Ready (Global)</span>';
            coreDisplay += ' <span style="color: #888; margin-left: 8px; font-size: 9px;">🧪 v' + prereleaseAvailable + ' available</span>';
            coreActions.style.display = 'none';
            if (coreActionsNoPipx) coreActionsNoPipx.style.display = 'none';
            coreUpgrade.style.display = 'none';
            if (coreVerify) coreVerify.style.display = 'flex';
          }
          // Up to date
          else {
            coreStep.classList.remove('needs-upgrade');
            coreStep.classList.add('installed');
            coreStatus.textContent = '✓';
            const label = installedIsRC ? '✓ Ready (RC)' : '✓ Ready (Global)';
            coreDisplay += ' <span style="color: #4CAF50; margin-left: 8px; font-size: 10px;">' + label + '</span>';
            coreActions.style.display = 'none';
            if (coreActionsNoPipx) coreActionsNoPipx.style.display = 'none';
            coreUpgrade.style.display = 'none';
            if (coreVerify) coreVerify.style.display = 'flex';
          }
        } else if (status.coreInstallType === 'workspace') {
          coreStep.classList.add('installed');
          coreStep.style.borderLeft = '3px solid #FF9800';
          coreStatus.textContent = '⚠️';
          coreStatus.classList.remove('loading');

          coreDisplay += ' <span style="color: #FF9800; margin-left: 8px; font-size: 10px;">⚠️ In workspace only</span>';
          coreDisplay += '<div style="font-size: 9px; color: #999; margin-top: 4px; line-height: 1.4;">' +
            '💡 Install globally with pipx for faster workspace creation<br/>' +
            '<code style="font-size: 8px; background: rgba(255,255,255,0.05); padding: 2px 4px; border-radius: 2px;">pipx install rapidkit-core</code>' +
          '</div>';

          coreActions.style.display = 'flex';
          if (coreActionsNoPipx) coreActionsNoPipx.style.display = 'none';
          coreUpgrade.style.display = 'none';
        } else {
          coreStep.classList.add('installed');
          coreStatus.textContent = '✓';
          coreStatus.classList.remove('loading');
          coreDisplay += ' <span style="color: #4CAF50; margin-left: 8px; font-size: 10px;">✓ Ready</span>';
          coreActions.style.display = 'none';
          if (coreActionsNoPipx) coreActionsNoPipx.style.display = 'none';
          coreUpgrade.style.display = 'none';
        }

        coreDetails.innerHTML = coreDisplay;
      } else {
        coreStep.classList.remove('installed');
        coreStep.classList.add('not-installed');
        coreStep.style.borderLeft = '';
        coreStatus.textContent = '⚠';
        coreStatus.classList.remove('loading');

        if (status.pipxInstalled) {
          coreDetails.innerHTML = '<span style="color: #FF5722; font-weight: 600;">Not installed</span> <span style="font-size: 10px; display: block; margin-top: 4px;">Python Framework (40+ commands)</span>';
          coreActions.style.display = 'flex';
          if (coreActionsNoPipx) coreActionsNoPipx.style.display = 'none';
        } else {
          coreDetails.innerHTML = '<span style="color: #FF5722; font-weight: 600;">pipx required</span> <span style="font-size: 10px; display: block; margin-top: 4px;">Install pipx first, or use fallback</span>';
          coreActions.style.display = 'none';
          if (coreActionsNoPipx) coreActionsNoPipx.style.display = 'flex';
        }
        coreUpgrade.style.display = 'none';
      }

      const pythonOk = status.pythonInstalled && !status.pythonNeedsUpgrade ? 1 : 0;
      const npmOk = status.npmInstalled ? 1 : 0;
      const pipxOk = status.pipxInstalled ? 1 : 0;
      const coreOk = status.coreInstalled ? 1 : 0;
      const requiredInstalled = pythonOk + npmOk + pipxOk + coreOk;
      const requiredTotal = 4;

      const toolchainBadge = document.getElementById('toolchainBadge');
      if (requiredInstalled === requiredTotal) {
        if (toolchainBadge) toolchainBadge.style.display = 'inline-flex';
        document.getElementById('finishBtn').disabled = false;
      } else {
        if (toolchainBadge) toolchainBadge.style.display = 'none';
        document.getElementById('finishBtn').disabled = true;
      }
    }

    function openPythonDownload() {
      vscode.postMessage({ command: 'openUrl', url: 'https://www.python.org/downloads/' });
    }

    function showPipInstall() {
      vscode.postMessage({ command: 'showInfo', message: 'pip is usually included with Python. If missing, reinstall Python or run: python -m ensurepip' });
    }

    function installPoetry() {
      showProgress('poetryProgress', 'poetryTime');
      vscode.postMessage({ command: 'installPoetry' });
      autoRefreshAfterInstall(12000);
    }

    function installPipx() {
      showProgress('pipxProgress', 'pipxTime');
      vscode.postMessage({ command: 'installPipx' });
      autoRefreshAfterInstall(8000);
    }

    function installPipxThenCore() {
      vscode.postMessage({ command: 'installPipxThenCore' });
      setTimeout(checkInstallationStatus, 15000);
    }

    function installCoreFallback() {
      vscode.postMessage({ command: 'installCoreFallback' });
      setTimeout(checkInstallationStatus, 8000);
    }

    function installNpmCLI() {
      showProgress('npmProgress', 'npmTime');
      vscode.postMessage({ command: 'installNpmGlobal' });
      autoRefreshAfterInstall(8000);
    }

    function upgradeNpm() {
      vscode.postMessage({ command: 'upgradeNpmGlobal' });
      setTimeout(checkInstallationStatus, 5000);
    }

    function installPythonCore() {
      showProgress('coreProgress', 'coreTime');
      vscode.postMessage({ command: 'installPipCore' });
      autoRefreshAfterInstall(10000);
    }

    function upgradeCore() {
      vscode.postMessage({ command: 'upgradePipCore' });
      setTimeout(checkInstallationStatus, 5000);
    }

    function goBackToWelcome() {
      vscode.postMessage({ command: 'showWelcome' });
    }

    function clearCache() {
      vscode.postMessage({ command: 'clearRequirementCache' });
    }

    function refreshWizard() {
      // Hide toolchain ready badge during refresh
      const toolchainBadge = document.getElementById('toolchainBadge');
      if (toolchainBadge) toolchainBadge.style.display = 'none';

      // Add spinning animation to refresh button only (not back button)
      const refreshBtns = document.querySelectorAll('.wizard-header .wizard-btn');
      let refreshBtn = null;
      refreshBtns.forEach(btn => {
        if (btn.textContent.includes('Refresh')) {
          refreshBtn = btn;
        }
      });
      const refreshIcon = refreshBtn?.querySelector('svg');
      if (refreshIcon) {
        refreshIcon.style.animation = 'spin 1s linear infinite';
      }

      const statuses = ['pythonStatus', 'pipStatus', 'poetryStatus', 'npmStatus', 'coreStatus', 'pipxStatus'];
      statuses.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          el.textContent = '';
          el.classList.add('loading');
        }
      });
      
      checkInstallationStatus();
      
      // Remove spinning animation after check completes
      setTimeout(() => {
        if (refreshIcon) {
          refreshIcon.style.animation = '';
        }
      }, 2000);
    }

    function finishSetup() {
      vscode.postMessage({ command: 'doctor' });
    }

    function getPoetryInstallCommand() {
      if (isWindowsEnv) {
        return '(Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | python -';
      }
      return 'curl -sSL https://install.python-poetry.org | python3 -';
    }

    function getPipxInstallCommand() {
      if (isWindowsEnv) {
        return 'python -m pip install --user pipx';
      }
      return 'python3 -m pip install --user pipx';
    }

    function showProgress(progressId, timeId) {
      const progressEl = document.getElementById(progressId);
      const timeEl = document.getElementById(timeId);
      if (progressEl) progressEl.classList.add('active');
      if (timeEl) timeEl.style.display = 'flex';
    }

    function hideProgress(progressId, timeId) {
      const progressEl = document.getElementById(progressId);
      const timeEl = document.getElementById(timeId);
      if (progressEl) progressEl.classList.remove('active');
      if (timeEl) timeEl.style.display = 'none';
    }

    function autoRefreshAfterInstall(delay) {
      setTimeout(() => {
        checkInstallationStatus();
        hideProgress('pythonProgress', 'pythonTime');
        hideProgress('pipxProgress', 'pipxTime');
        hideProgress('coreProgress', 'coreTime');
        hideProgress('npmProgress', 'npmTime');
        hideProgress('poetryProgress', 'poetryTime');
      }, delay);
    }

    function verifyPython() {
      vscode.postMessage({ command: 'verifyPython' });
    }

    function verifyPip() {
      vscode.postMessage({ command: 'verifyPip' });
    }

    function verifyPipx() {
      vscode.postMessage({ command: 'verifyPipx' });
    }

    function verifyCore() {
      vscode.postMessage({ command: 'verifyCore' });
    }

    function verifyNpm() {
      vscode.postMessage({ command: 'verifyNpm' });
    }

    function verifyPoetry() {
      vscode.postMessage({ command: 'verifyPoetry' });
    }
  </script>
</body>
</html>`;
  }
}
