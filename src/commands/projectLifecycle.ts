import * as vscode from 'vscode';
import { detectPythonVirtualenv } from '../utils/poetryHelper';
import { WelcomePanel } from '../ui/panels/welcomePanel';
import { Logger } from '../utils/logger';
import {
  interruptTerminal,
  openTerminal,
  runCommandsInTerminal,
  runRapidkitCommandsInTerminal,
} from '../utils/terminalExecutor';

type ProjectExplorerLike = {
  refresh: () => void;
};

export function registerProjectLifecycleCommands(options: {
  logger: Logger;
  runningServers: Map<string, vscode.Terminal>;
  getProjectExplorer: () => ProjectExplorerLike | undefined;
}): vscode.Disposable[] {
  const { logger, runningServers, getProjectExplorer } = options;

  return [
    vscode.commands.registerCommand('workspai.projectTerminal', async (item: any) => {
      const projectPath = item?.project?.path || item?.projectPath;
      if (projectPath) {
        openTerminal({
          name: `Workspai: ${item?.project?.name || 'Project'}`,
          cwd: projectPath,
        });
        logger.info(`Opened terminal for project: ${projectPath}`);
      }
    }),

    vscode.commands.registerCommand('workspai.projectInit', async (item: any) => {
      const projectPath = item?.project?.path || item?.projectPath;
      const projectName = item?.project?.name || 'Project';

      if (projectPath) {
        runRapidkitCommandsInTerminal({
          name: `📦 ${projectName} [init]`,
          cwd: projectPath,
          commands: [['init']],
        });

        logger.info(`Running init for project: ${projectPath}`);
      }
    }),

    vscode.commands.registerCommand('workspai.projectDev', async (item: any) => {
      const projectPath = item?.project?.path || item?.projectPath;
      const projectName = item?.project?.name || 'Project';
      const projectType = item?.project?.type || 'fastapi';

      if (projectPath) {
        const fs = await import('fs');
        const path = await import('path');

        const isFastAPI = projectType === 'fastapi';
        const isGoProject = projectType === 'go';

        let isInitialized = false;
        let missingText = '';

        if (isFastAPI) {
          const venvInfo = await detectPythonVirtualenv(projectPath);
          isInitialized = venvInfo.exists;
          missingText = venvInfo.exists ? '' : 'virtualenv (.venv or Poetry cache)';
        } else if (isGoProject) {
          const goSumPath = path.join(projectPath, 'go.sum');
          isInitialized = fs.existsSync(goSumPath);
          missingText = 'go.sum (run go mod tidy)';
        } else {
          const checkPath = path.join(projectPath, 'node_modules');
          isInitialized = fs.existsSync(checkPath);
          missingText = 'node_modules';
        }

        if (!isInitialized) {
          const action = isFastAPI
            ? await vscode.window.showWarningMessage(
                `Project "${projectName}" is not initialized (${missingText} not found)`,
                'Initialize & Start',
                'Start Anyway',
                'Cancel'
              )
            : await vscode.window.showWarningMessage(
                `Project "${projectName}" is not initialized (${missingText} not found)`,
                'Initialize & Start',
                'Cancel'
              );

          if (action === 'Initialize & Start') {
            const terminal = runRapidkitCommandsInTerminal({
              name: `🔧 ${projectName} [init → dev]`,
              cwd: projectPath,
              commands: [['init'], ['dev']],
            });

            runningServers.set(projectPath, terminal);
            getProjectExplorer()?.refresh();

            if (WelcomePanel.currentPanel) {
              WelcomePanel.updateWithProject(projectPath, projectName);
            }

            vscode.window.showInformationMessage(`🔧 Initializing ${projectName}...`);
            logger.info(`Init + Dev for ${projectType} project: ${projectPath}`);
            return;
          } else if (action === 'Start Anyway' && isFastAPI) {
            const terminal = runRapidkitCommandsInTerminal({
              name: `🚀 ${projectName} [:8000]`,
              cwd: projectPath,
              commands: [['dev', '--allow-global-runtime']],
            });

            runningServers.set(projectPath, terminal);
            getProjectExplorer()?.refresh();

            if (WelcomePanel.currentPanel) {
              WelcomePanel.updateWithProject(projectPath, projectName);
            }

            logger.info(`Dev (global runtime) for project: ${projectPath}`);
            return;
          } else {
            return;
          }
        }

        const net = await import('net');
        const defaultPort = isGoProject ? 3000 : 8000;
        let port = defaultPort;

        const MAX_PORT_SCAN_ATTEMPTS = 50;

        const canBindPort = (candidatePort: number): Promise<boolean> => {
          return new Promise((resolve) => {
            const server = net.createServer();
            server.once('error', () => {
              resolve(false);
            });
            server.listen(candidatePort, '0.0.0.0', () => {
              server.close(() => resolve(true));
            });
          });
        };

        const findAvailablePort = async (startPort: number): Promise<number> => {
          for (let i = 0; i < MAX_PORT_SCAN_ATTEMPTS; i += 1) {
            const candidatePort = startPort + i;
            if (await canBindPort(candidatePort)) {
              return candidatePort;
            }
          }

          throw new Error(
            `No available port found after ${MAX_PORT_SCAN_ATTEMPTS} attempts from ${startPort}`
          );
        };

        try {
          port = await findAvailablePort(defaultPort);
        } catch {
          vscode.window.showWarningMessage(
            `Could not find an open port near ${defaultPort}; starting with default port.`
          );
          port = defaultPort;
        }

        let terminal: vscode.Terminal;

        if (isFastAPI) {
          if (port !== defaultPort) {
            terminal = runRapidkitCommandsInTerminal({
              name: `🚀 ${projectName} [:${port}]`,
              cwd: projectPath,
              commands: [['dev', '--port', String(port)]],
            });
            vscode.window.showInformationMessage(
              `▶️ Started on port ${port} (${defaultPort} was busy)`
            );
          } else {
            terminal = runRapidkitCommandsInTerminal({
              name: `🚀 ${projectName} [:${port}]`,
              cwd: projectPath,
              commands: [['dev']],
            });
            vscode.window.showInformationMessage(`▶️ Started FastAPI server on port ${port}`);
          }
        } else if (isGoProject) {
          if (port !== defaultPort) {
            terminal = runRapidkitCommandsInTerminal({
              name: `🚀 ${projectName} [:${port}]`,
              cwd: projectPath,
              env: {
                PORT: String(port),
              },
              commands: [['dev']],
            });
            vscode.window.showInformationMessage(
              `▶️ Started on port ${port} (${defaultPort} was busy)`
            );
          } else {
            terminal = runRapidkitCommandsInTerminal({
              name: `🚀 ${projectName} [:${port}]`,
              cwd: projectPath,
              commands: [['dev']],
            });
            vscode.window.showInformationMessage(`▶️ Started Go server on port ${port}`);
          }
        } else {
          if (port !== defaultPort) {
            terminal = runCommandsInTerminal({
              name: `🚀 ${projectName} [:${port}]`,
              cwd: projectPath,
              env: {
                PORT: String(port),
              },
              commands: ['npm run start:dev'],
            });
            vscode.window.showInformationMessage(
              `▶️ Started on port ${port} (${defaultPort} was busy)`
            );
          } else {
            terminal = runCommandsInTerminal({
              name: `🚀 ${projectName} [:${port}]`,
              cwd: projectPath,
              commands: ['npm run start:dev'],
            });
            vscode.window.showInformationMessage(`▶️ Started NestJS server on port ${port}`);
          }
        }

        runningServers.set(projectPath, terminal);
        getProjectExplorer()?.refresh();

        if (WelcomePanel.currentPanel) {
          WelcomePanel.updateWithProject(projectPath, projectName);
        }

        logger.info(
          `Running ${projectType} dev server for project: ${projectPath} on port ${port}`
        );
      }
    }),

    vscode.commands.registerCommand('workspai.projectStop', async (item: any) => {
      const projectPath = item?.project?.path || item?.projectPath;
      const projectName = item?.project?.name || 'Project';
      if (projectPath) {
        const existingTerminal = runningServers.get(projectPath);
        if (existingTerminal) {
          interruptTerminal(existingTerminal);
          existingTerminal.show();
          vscode.window.showInformationMessage(`⏹️ Stopped server for ${projectName}`);

          runningServers.delete(projectPath);
          getProjectExplorer()?.refresh();

          if (WelcomePanel.currentPanel) {
            WelcomePanel.updateWithProject(projectPath, projectName);
          }

          logger.info(`Stopped dev server for: ${projectPath}`);
        }
      }
    }),

    vscode.commands.registerCommand('workspai.projectTest', async (item: any) => {
      const projectPath = item?.project?.path || item?.projectPath;
      const projectName = item?.project?.name || 'Project';

      if (projectPath) {
        runRapidkitCommandsInTerminal({
          name: `🧪 ${projectName} [test]`,
          cwd: projectPath,
          commands: [['test']],
        });

        logger.info(`Running tests for project: ${projectPath}`);
      }
    }),

    vscode.commands.registerCommand('workspai.projectBrowser', async (item: any) => {
      const projectPath = item?.project?.path || item?.projectPath;
      const projectType = item?.project?.type || 'fastapi';
      const isFastAPI = projectType === 'fastapi';

      let port = 8000;
      const runningTerminal = projectPath ? runningServers.get(projectPath) : null;
      if (runningTerminal) {
        const match = runningTerminal.name.match(/:([0-9]+)/);
        if (match) {
          port = parseInt(match[1], 10);
        }
      }

      const url = `http://localhost:${port}/docs`;
      vscode.env.openExternal(vscode.Uri.parse(url));
      logger.info(`Opening browser: ${url}`);

      if (isFastAPI) {
        vscode.window.showInformationMessage(`Opening ${url}`, 'Open /redoc').then((selection) => {
          if (selection === 'Open /redoc') {
            vscode.env.openExternal(vscode.Uri.parse(`http://localhost:${port}/redoc`));
          }
        });
      } else {
        vscode.window.showInformationMessage(`Opening ${url}`);
      }
    }),
  ];
}
