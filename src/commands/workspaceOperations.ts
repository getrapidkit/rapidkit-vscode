import * as vscode from 'vscode';
import path from 'path';
import { Logger } from '../utils/logger';
import {
  runRapidkitCommandsInTerminal,
  runShellCommandInTerminal,
} from '../utils/terminalExecutor';

type WorkspaceExplorerLike = {
  getSelectedWorkspace?: () => { path: string; name?: string } | null | undefined;
};

export function registerWorkspaceOperationsCommands(options: {
  logger: Logger;
  getWorkspaceExplorer: () => WorkspaceExplorerLike | undefined;
  context: vscode.ExtensionContext;
}): vscode.Disposable[] {
  const { logger, getWorkspaceExplorer, context } = options;

  return [
    vscode.commands.registerCommand('rapidkit.workspaceBootstrap', async (item?: any) => {
      const workspaceExplorer = getWorkspaceExplorer();
      const workspacePath =
        item?.workspace?.path || workspaceExplorer?.getSelectedWorkspace?.()?.path;
      if (!workspacePath) {
        vscode.window.showErrorMessage(
          'No workspace selected. Select a workspace in the sidebar first.'
        );
        return;
      }
      const wsName = path.basename(workspacePath);
      const profile = await vscode.window.showQuickPick(
        [
          {
            label: '$(zap) minimal',
            description: 'Foundation artifacts only (fastest)',
            value: 'minimal',
          },
          {
            label: '$(symbol-namespace) python-only',
            description: 'Python + Poetry bootstrap',
            value: 'python-only',
          },
          {
            label: '$(symbol-event) node-only',
            description: 'Node.js runtime bootstrap (no Python needed)',
            value: 'node-only',
          },
          {
            label: '$(go) go-only',
            description: 'Go runtime bootstrap (no Python needed)',
            value: 'go-only',
          },
          {
            label: '$(layers) polyglot',
            description: 'Python + Node + Go — multi-runtime workspace',
            value: 'polyglot',
          },
          {
            label: '$(shield) enterprise',
            description: 'Polyglot + governance + Sigstore verification',
            value: 'enterprise',
          },
        ],
        {
          placeHolder: 'Select a bootstrap profile',
          title: `Bootstrap Workspace: ${wsName}`,
          ignoreFocusOut: true,
        }
      );
      if (!profile) {
        return;
      }

      const manifestPath = path.join(workspacePath, '.rapidkit', 'workspace.json');
      try {
        const fsBootstrap = await import('fs-extra');
        if (await fsBootstrap.default.pathExists(manifestPath)) {
          const manifest = await fsBootstrap.default.readJSON(manifestPath);
          manifest.profile = (profile as any).value;
          await fsBootstrap.default.writeJSON(manifestPath, manifest, { spaces: 2 });
        }
      } catch (error) {
        void error;
      }

      runRapidkitCommandsInTerminal({
        name: `RapidKit Bootstrap — ${wsName}`,
        cwd: workspacePath,
        commands: [['bootstrap', '--profile', (profile as any).value]],
      });
    }),

    vscode.commands.registerCommand('rapidkit.workspaceSetup', async (item?: any) => {
      const workspaceExplorer = getWorkspaceExplorer();
      const workspacePath =
        item?.workspace?.path || workspaceExplorer?.getSelectedWorkspace?.()?.path;
      if (!workspacePath) {
        vscode.window.showErrorMessage(
          'No workspace selected. Select a workspace in the sidebar first.'
        );
        return;
      }
      const wsName = path.basename(workspacePath);
      const runtime = await vscode.window.showQuickPick(
        [
          {
            label: '$(symbol-namespace) python',
            description: 'Check Python prerequisites (version + venv)',
            value: 'python',
          },
          {
            label: '$(package) node',
            description: 'Check Node.js / npm prerequisites',
            value: 'node',
          },
          {
            label: '$(go) go',
            description: 'Check Go runtime prerequisites',
            value: 'go',
          },
        ],
        {
          placeHolder: 'Select runtime to verify',
          title: `Setup Runtime — ${wsName}`,
          ignoreFocusOut: true,
        }
      );
      if (!runtime) {
        return;
      }
      runRapidkitCommandsInTerminal({
        name: `RapidKit Setup — ${wsName}`,
        cwd: workspacePath,
        env: {
          RAPIDKIT_ENABLE_RUNTIME_ADAPTERS: '1',
        },
        commands: [['setup', (runtime as any).value]],
      });
    }),

    vscode.commands.registerCommand('rapidkit.workspaceInit', async (item?: any) => {
      const workspaceExplorer = getWorkspaceExplorer();
      const workspacePath =
        item?.workspace?.path || workspaceExplorer?.getSelectedWorkspace?.()?.path;
      if (!workspacePath) {
        vscode.window.showErrorMessage(
          'No workspace selected. Select a workspace in the sidebar first.'
        );
        return;
      }
      const wsName = path.basename(workspacePath);
      runRapidkitCommandsInTerminal({
        name: `RapidKit Init — ${wsName}`,
        cwd: workspacePath,
        commands: [['init']],
      });
    }),

    vscode.commands.registerCommand('rapidkit.workspacePolicyShow', async (item?: any) => {
      const workspaceExplorer = getWorkspaceExplorer();
      const workspacePath =
        item?.workspace?.path || workspaceExplorer?.getSelectedWorkspace?.()?.path;
      if (!workspacePath) {
        vscode.window.showErrorMessage('No workspace selected.');
        return;
      }

      const wsName = path.basename(workspacePath);
      runRapidkitCommandsInTerminal({
        name: `RapidKit Policy — ${wsName}`,
        cwd: workspacePath,
        commands: [['workspace', 'policy', 'show']],
      });
    }),

    vscode.commands.registerCommand('rapidkit.workspacePolicySet', async (item?: any) => {
      const workspaceExplorer = getWorkspaceExplorer();
      const workspacePath =
        item?.workspace?.path || workspaceExplorer?.getSelectedWorkspace?.()?.path;
      if (!workspacePath) {
        vscode.window.showErrorMessage('No workspace selected.');
        return;
      }

      const wsName = path.basename(workspacePath);
      const policyKey = await vscode.window.showQuickPick(
        [
          {
            label: 'mode',
            description: 'warn | strict',
          },
          {
            label: 'dependency_sharing_mode',
            description: 'isolated | shared-runtime-caches | shared-node-deps',
          },
          {
            label: 'rules.enforce_workspace_marker',
            description: 'true | false',
          },
          {
            label: 'rules.enforce_toolchain_lock',
            description: 'true | false',
          },
          {
            label: 'rules.disallow_untrusted_tool_sources',
            description: 'true | false',
          },
          {
            label: 'rules.enforce_compatibility_matrix',
            description: 'true | false',
          },
          {
            label: 'rules.require_mirror_lock_for_offline',
            description: 'true | false',
          },
        ],
        {
          placeHolder: 'Select workspace policy key to update',
          title: `Workspace Policy: ${wsName}`,
          ignoreFocusOut: true,
        }
      );

      if (!policyKey) {
        return;
      }

      let policyValue: string | undefined;

      if (policyKey.label === 'mode') {
        const selected = await vscode.window.showQuickPick(['warn', 'strict'], {
          placeHolder: 'Select mode value',
          title: `Workspace Policy: ${policyKey.label}`,
          ignoreFocusOut: true,
        });
        policyValue = selected;
      } else if (policyKey.label === 'dependency_sharing_mode') {
        const selected = await vscode.window.showQuickPick(
          ['isolated', 'shared-runtime-caches', 'shared-node-deps'],
          {
            placeHolder: 'Select dependency sharing mode',
            title: `Workspace Policy: ${policyKey.label}`,
            ignoreFocusOut: true,
          }
        );
        policyValue = selected;
      } else {
        const selected = await vscode.window.showQuickPick(['true', 'false'], {
          placeHolder: 'Select boolean value',
          title: `Workspace Policy: ${policyKey.label}`,
          ignoreFocusOut: true,
        });
        policyValue = selected;
      }

      if (!policyValue) {
        return;
      }

      runRapidkitCommandsInTerminal({
        name: `RapidKit Policy — ${wsName}`,
        cwd: workspacePath,
        commands: [
          ['workspace', 'policy', 'set', policyKey.label, policyValue],
          ['workspace', 'policy', 'show'],
        ],
      });
    }),

    vscode.commands.registerCommand('rapidkit.cacheStatus', async (item?: any) => {
      const workspaceExplorer = getWorkspaceExplorer();
      const workspacePath =
        item?.workspace?.path || workspaceExplorer?.getSelectedWorkspace?.()?.path;
      if (!workspacePath) {
        vscode.window.showErrorMessage('No workspace selected.');
        return;
      }
      runRapidkitCommandsInTerminal({
        name: `RapidKit Cache — ${path.basename(workspacePath)}`,
        cwd: workspacePath,
        commands: [['cache', 'status']],
      });
    }),

    vscode.commands.registerCommand('rapidkit.cacheClear', async (item?: any) => {
      const workspaceExplorer = getWorkspaceExplorer();
      const workspacePath =
        item?.workspace?.path || workspaceExplorer?.getSelectedWorkspace?.()?.path;
      if (!workspacePath) {
        vscode.window.showErrorMessage('No workspace selected.');
        return;
      }
      const confirm = await vscode.window.showWarningMessage(
        `Clear all caches for "${path.basename(workspacePath)}"? This cannot be undone.`,
        { modal: true },
        'Clear Cache',
        'Cancel'
      );
      if (confirm !== 'Clear Cache') {
        return;
      }
      runRapidkitCommandsInTerminal({
        name: `RapidKit Cache — ${path.basename(workspacePath)}`,
        cwd: workspacePath,
        commands: [['cache', 'clear']],
      });
    }),

    vscode.commands.registerCommand('rapidkit.cachePrune', async (item?: any) => {
      const workspaceExplorer = getWorkspaceExplorer();
      const workspacePath =
        item?.workspace?.path || workspaceExplorer?.getSelectedWorkspace?.()?.path;
      if (!workspacePath) {
        vscode.window.showErrorMessage('No workspace selected.');
        return;
      }
      runRapidkitCommandsInTerminal({
        name: `RapidKit Cache — ${path.basename(workspacePath)}`,
        cwd: workspacePath,
        commands: [['cache', 'prune']],
      });
    }),

    vscode.commands.registerCommand('rapidkit.cacheRepair', async (item?: any) => {
      const workspaceExplorer = getWorkspaceExplorer();
      const workspacePath =
        item?.workspace?.path || workspaceExplorer?.getSelectedWorkspace?.()?.path;
      if (!workspacePath) {
        vscode.window.showErrorMessage('No workspace selected.');
        return;
      }
      runRapidkitCommandsInTerminal({
        name: `RapidKit Cache — ${path.basename(workspacePath)}`,
        cwd: workspacePath,
        commands: [['cache', 'repair']],
      });
    }),

    vscode.commands.registerCommand('rapidkit.mirrorStatus', async (item?: any) => {
      const workspaceExplorer = getWorkspaceExplorer();
      const workspacePath =
        item?.workspace?.path || workspaceExplorer?.getSelectedWorkspace?.()?.path;
      if (!workspacePath) {
        vscode.window.showErrorMessage('No workspace selected.');
        return;
      }
      runRapidkitCommandsInTerminal({
        name: `RapidKit Mirror — ${path.basename(workspacePath)}`,
        cwd: workspacePath,
        commands: [['mirror', 'status']],
      });
    }),

    vscode.commands.registerCommand('rapidkit.mirrorSync', async (item?: any) => {
      const workspaceExplorer = getWorkspaceExplorer();
      const workspacePath =
        item?.workspace?.path || workspaceExplorer?.getSelectedWorkspace?.()?.path;
      if (!workspacePath) {
        vscode.window.showErrorMessage('No workspace selected.');
        return;
      }
      runRapidkitCommandsInTerminal({
        name: `RapidKit Mirror — ${path.basename(workspacePath)}`,
        cwd: workspacePath,
        commands: [['mirror', 'sync']],
      });
    }),

    vscode.commands.registerCommand('rapidkit.mirrorVerify', async (item?: any) => {
      const workspaceExplorer = getWorkspaceExplorer();
      const workspacePath =
        item?.workspace?.path || workspaceExplorer?.getSelectedWorkspace?.()?.path;
      if (!workspacePath) {
        vscode.window.showErrorMessage('No workspace selected.');
        return;
      }
      runRapidkitCommandsInTerminal({
        name: `RapidKit Mirror — ${path.basename(workspacePath)}`,
        cwd: workspacePath,
        commands: [['mirror', 'verify']],
      });
    }),

    vscode.commands.registerCommand('rapidkit.mirrorRotate', async (item?: any) => {
      const workspaceExplorer = getWorkspaceExplorer();
      const workspacePath =
        item?.workspace?.path || workspaceExplorer?.getSelectedWorkspace?.()?.path;
      if (!workspacePath) {
        vscode.window.showErrorMessage('No workspace selected.');
        return;
      }
      const wsName = path.basename(workspacePath);
      const confirm = await vscode.window.showWarningMessage(
        `Rotate signing keys for mirror in "${wsName}"?\n\nThis re-signs all pinned artifacts. Existing rotation snapshots will be archived.`,
        { modal: true },
        'Rotate Keys',
        'Cancel'
      );
      if (confirm !== 'Rotate Keys') {
        return;
      }
      runRapidkitCommandsInTerminal({
        name: `RapidKit Mirror — ${wsName}`,
        cwd: workspacePath,
        commands: [['mirror', 'rotate']],
      });
    }),

    vscode.commands.registerCommand('rapidkit.checkWorkspaceHealth', async (item: any) => {
      let workspacePath: string | undefined;
      let workspaceName: string | undefined;

      if (item?.workspace) {
        workspacePath = item.workspace.path;
        workspaceName = item.workspace.name;
      } else if (item?.path) {
        workspacePath = item.path;
      }

      if (!workspacePath) {
        vscode.window.showErrorMessage('No workspace selected');
        return;
      }

      if (!workspaceName) {
        workspaceName = path.basename(workspacePath);
      }

      logger.info('Running doctor check for workspace:', workspaceName);

      const { CoreVersionService } = await import('../core/coreVersionService.js');
      const versionService = CoreVersionService.getInstance();
      const versionInfo = await versionService.getVersionInfo(workspacePath);

      const actions = [
        { label: '$(pulse) Check Health', action: 'check' },
        { label: '$(tools) Check & Auto-fix', action: 'fix' },
        { label: '$(shield) View Compliance Reports', action: 'compliance' },
        { label: '$(info) Show Version Info', action: 'version' },
      ];

      if (versionInfo.status === 'update-available') {
        actions.splice(1, 0, {
          label: `$(arrow-up) Upgrade to v${versionInfo.latest}`,
          action: 'upgrade',
        });
      }

      const selection = await vscode.window.showQuickPick(actions, {
        placeHolder: `RapidKit Health & Version - ${workspaceName}`,
        title: versionService.getStatusMessage(versionInfo),
      });

      if (!selection) {
        return;
      }

      switch (selection.action) {
        case 'check':
          await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: `🩺 Checking health of workspace: ${workspaceName}`,
              cancellable: false,
            },
            async (progress) => {
              progress.report({ increment: 0, message: 'Starting health check...' });

              try {
                runRapidkitCommandsInTerminal({
                  name: `RapidKit Doctor - ${workspaceName}`,
                  cwd: workspacePath,
                  commands: [['doctor', 'workspace']],
                });
                progress.report({ increment: 50, message: 'Running diagnostics...' });
                progress.report({ increment: 100, message: 'Complete!' });

                vscode.window.showInformationMessage(
                  `Health check running for "${workspaceName}". Check the terminal for results.`,
                  'OK'
                );
              } catch (error) {
                logger.error('Error running doctor check:', error);
                vscode.window.showErrorMessage(
                  `Failed to run health check: ${error instanceof Error ? error.message : String(error)}`
                );
              }
            }
          );
          break;

        case 'fix':
          await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: `🛠️ Checking and fixing workspace: ${workspaceName}`,
              cancellable: false,
            },
            async (progress) => {
              progress.report({ increment: 0, message: 'Starting doctor --fix...' });

              try {
                runRapidkitCommandsInTerminal({
                  name: `RapidKit Doctor Fix - ${workspaceName}`,
                  cwd: workspacePath,
                  commands: [['doctor', 'workspace', '--fix']],
                });
                progress.report({ increment: 50, message: 'Applying safe fixes...' });
                progress.report({ increment: 100, message: 'Complete!' });

                vscode.window.showInformationMessage(
                  `Doctor fix is running for "${workspaceName}". Check the terminal for details.`,
                  'OK'
                );
              } catch (error) {
                logger.error('Error running doctor fix:', error);
                vscode.window.showErrorMessage(
                  `Failed to run doctor fix: ${error instanceof Error ? error.message : String(error)}`
                );
              }
            }
          );
          break;

        case 'compliance': {
          const fsCompat = await import('fs-extra');
          const reportsDir = path.join(workspacePath, '.rapidkit', 'reports');
          try {
            const dirExists = await fsCompat.default.pathExists(reportsDir);
            if (!dirExists) {
              const choice = await vscode.window.showInformationMessage(
                `No compliance reports found for "${workspaceName}".\n\nRun Bootstrap Workspace to generate reports.`,
                'Bootstrap Now'
              );
              if (choice === 'Bootstrap Now') {
                vscode.commands.executeCommand('rapidkit.workspaceBootstrap', {
                  workspace: { path: workspacePath },
                });
              }
              break;
            }

            const files: string[] = await fsCompat.default.readdir(reportsDir);
            const complianceFiles = files
              .filter((f: string) => f.startsWith('bootstrap-compliance'))
              .sort()
              .reverse();
            const mirrorFiles = files
              .filter((f: string) => f.startsWith('mirror-ops'))
              .sort()
              .reverse();

            if (complianceFiles.length === 0) {
              vscode.window.showInformationMessage(
                'No bootstrap-compliance reports found.\n\nRun "Bootstrap Workspace" to generate one.'
              );
              break;
            }

            const reportPath = path.join(reportsDir, complianceFiles[0]);
            const reportData = await fsCompat.default.readJSON(reportPath).catch(() => null);

            const output = vscode.window.createOutputChannel(
              `RapidKit Compliance — ${workspaceName}`
            );
            output.clear();
            output.appendLine(`=== Bootstrap Compliance Report: ${workspaceName} ===`);
            output.appendLine(`File: ${reportPath}`);
            output.appendLine('');

            if (reportData) {
              const rawResult =
                reportData.result || reportData.status || reportData.overall_status || 'unknown';
              const statusLabel =
                rawResult === 'ok'
                  ? 'PASSING'
                  : rawResult === 'ok_with_warnings'
                    ? 'PASSING (with warnings)'
                    : rawResult === 'failed'
                      ? 'FAILING'
                      : rawResult.toUpperCase();
              const statusIcon =
                rawResult === 'ok' || rawResult === 'ok_with_warnings' ? '✅' : '❌';

              const profile = reportData.profile || reportData.bootstrap_profile || 'unknown';
              const timestamp = reportData.generated_at || reportData.timestamp || '';

              output.appendLine(`Status:   ${statusIcon} ${statusLabel}`);
              output.appendLine(`Profile:  ${profile}`);
              if (timestamp) {
                output.appendLine(`Generated: ${timestamp}`);
              }

              const checks = reportData.checks || reportData.rules;
              if (checks) {
                output.appendLine('');
                output.appendLine('--- Rule Results ---');
                if (Array.isArray(checks)) {
                  for (const check of checks) {
                    const icon =
                      check.status === 'passed' ? '✅' : check.status === 'skipped' ? '⏭' : '❌';
                    output.appendLine(`  ${icon} [${check.status}] ${check.id}`);
                    if (check.message) {
                      output.appendLine(`       ${check.message}`);
                    }
                  }
                } else if (typeof checks === 'object') {
                  for (const [rule, result] of Object.entries(checks as Record<string, any>)) {
                    const pass =
                      result === true || result?.status === 'pass' || result?.passed === true;
                    output.appendLine(`  ${pass ? '✅' : '❌'} ${rule}`);
                  }
                }
              }

              if (mirrorFiles.length > 0) {
                output.appendLine('');
                output.appendLine(
                  `--- Mirror Reports (${mirrorFiles.length} found, latest: ${mirrorFiles[0]}) ---`
                );
                const latestMirror = await fsCompat.default
                  .readJSON(path.join(reportsDir, mirrorFiles[0]))
                  .catch(() => null);
                if (latestMirror) {
                  const mirrorStatus =
                    latestMirror.status || latestMirror.overall_status || 'unknown';
                  output.appendLine(`  Mirror status: ${mirrorStatus}`);
                }
              }
            } else {
              output.appendLine('(Could not parse report JSON — file may be malformed)');
            }

            output.appendLine('');
            output.appendLine(`All reports: ${reportsDir}`);
            output.show();
          } catch (error) {
            logger.error('Error reading compliance reports:', error);
            vscode.window.showErrorMessage(
              `Failed to read compliance reports: ${error instanceof Error ? error.message : String(error)}`
            );
          }
          break;
        }

        case 'version': {
          const locationText = versionInfo.location
            ? `\n\n**Location:** ${versionInfo.location}`
            : '';
          const pathText = versionInfo.path ? `\n**Path:** ${versionInfo.path}` : '';
          const updateText =
            versionInfo.status === 'update-available'
              ? `\n\n**💡 Update Available:** v${versionInfo.latest}`
              : '';

          await vscode.window.showInformationMessage(
            `**RapidKit Core**\n\n**Installed:** v${versionInfo.installed || 'Not installed'}${locationText}${pathText}${updateText}`,
            { modal: true },
            'OK'
          );
          break;
        }

        case 'upgrade': {
          const confirmUpgrade = await vscode.window.showInformationMessage(
            `Upgrade RapidKit Core from v${versionInfo.installed} to v${versionInfo.latest}?`,
            'Upgrade',
            'Cancel'
          );

          if (confirmUpgrade === 'Upgrade') {
            if (versionInfo.location === 'workspace') {
              runShellCommandInTerminal({
                name: `RapidKit Upgrade - ${workspaceName}`,
                cwd: workspacePath,
                command: 'poetry',
                args: ['update', 'rapidkit-core'],
              });
            } else {
              runShellCommandInTerminal({
                name: `RapidKit Upgrade - ${workspaceName}`,
                cwd: workspacePath,
                command: 'pipx',
                args: ['upgrade', 'rapidkit-core'],
              });
            }

            vscode.window.showInformationMessage(
              'Upgrading RapidKit Core... Check terminal for progress.',
              'OK'
            );

            versionService.clearCache(workspacePath);
          }
          break;
        }
      }
    }),

    vscode.commands.registerCommand('rapidkit.checkForUpdates', async () => {
      const { forceCheckForUpdates } = await import('../utils/updateChecker.js');
      await forceCheckForUpdates(context);
    }),
  ];
}
