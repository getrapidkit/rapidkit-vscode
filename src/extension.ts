/**
 * RapidKit VS Code Extension
 * Main extension entry point
 */

import * as vscode from 'vscode';
import { ActionsWebviewProvider } from './ui/webviews/actionsWebviewProvider';
import { WorkspaceExplorerProvider } from './ui/treeviews/workspaceExplorer';
import {
  ProjectExplorerProvider,
  ProjectTreeItem,
  setExtensionPath,
} from './ui/treeviews/projectExplorer';
import { setSelectedProjectPath } from './core/selectedProject';
import { ModuleExplorerProvider } from './ui/treeviews/moduleExplorer';
import { detectPythonVirtualenv } from './utils/poetryHelper';
import { checkAndNotifyUpdates } from './utils/updateChecker';
// templateExplorer removed in v0.4.3 (redundant with npm package)
import { createWorkspaceCommand } from './commands/createWorkspace';
import { createProjectCommand } from './commands/createProject';
import { addModuleCommand } from './commands/addModule';
import { previewTemplateCommand } from './commands/previewTemplate';
import { doctorCommand } from './commands/doctor';
import { checkSystemCommand } from './commands/checkSystem';
import { showWelcomeCommand } from './commands/showWelcome';
import { RapidKitStatusBar } from './ui/statusBar';
import { ConfigurationManager } from './core/configurationManager';
import { WorkspaceDetector } from './core/workspaceDetector';
import { Logger } from './utils/logger';
import { RapidKitCodeActionsProvider } from './providers/codeActionsProvider';
import { RapidKitCompletionProvider } from './providers/completionProvider';
import { RapidKitHoverProvider } from './providers/hoverProvider';
import { openWorkspaceFolder, copyWorkspacePath } from './commands/workspaceContextMenu';
import { openProjectFolder, copyProjectPath, deleteProject } from './commands/projectContextMenu';
import { WorkspaceUsageTracker } from './utils/workspaceUsageTracker';

let statusBar: RapidKitStatusBar;
let actionsWebviewProvider: ActionsWebviewProvider;
let workspaceExplorer: WorkspaceExplorerProvider;
let projectExplorer: ProjectExplorerProvider;
let moduleExplorer: ModuleExplorerProvider;
// templateExplorer removed

// Track running dev servers per project (exported for ProjectExplorer)
export const runningServers: Map<string, vscode.Terminal> = new Map();

export async function activate(context: vscode.ExtensionContext) {
  const logger = Logger.getInstance();
  logger.info('🚀 RapidKit extension is activating...');

  // Set extension path for custom icons
  setExtensionPath(context.extensionPath);

  try {
    // Register commands FIRST - these MUST succeed
    logger.info('Step 1: Registering commands...');

    // Simple test command
    context.subscriptions.push(
      vscode.commands.registerCommand('rapidkit.test', () => {
        vscode.window.showInformationMessage('✅ RapidKit commands are working!');
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('rapidkit.createWorkspace', async () => {
        try {
          logger.info('Executing createWorkspace command');
          // Show that command was triggered
          vscode.window.showInformationMessage('Creating RapidKit Workspace...');
          await createWorkspaceCommand();
          if (workspaceExplorer) {
            workspaceExplorer.refresh();
          }
        } catch (error) {
          logger.error('Failed to create workspace', error);
          vscode.window.showErrorMessage(
            `Failed to create workspace: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }),
      vscode.commands.registerCommand(
        'rapidkit.createProject',
        async (workspacePathOrUri?: string | vscode.Uri) => {
          try {
            logger.info('Executing createProject command');
            if (!workspaceExplorer) {
              vscode.window.showErrorMessage('Extension not fully initialized');
              return;
            }

            // Handle different input types
            let workspacePath: string | undefined;
            if (typeof workspacePathOrUri === 'string') {
              workspacePath = workspacePathOrUri;
            } else if (workspacePathOrUri instanceof vscode.Uri) {
              workspacePath = workspacePathOrUri.fsPath;
            }

            // If workspace path not provided, get from selected workspace
            if (!workspacePath) {
              const selectedWorkspace = workspaceExplorer.getSelectedWorkspace();
              workspacePath = selectedWorkspace?.path;
            }
            await createProjectCommand(workspacePath);
            if (projectExplorer) {
              projectExplorer.refresh();
            }
          } catch (error) {
            logger.error('Failed to create project', error);
            vscode.window.showErrorMessage(
              `Failed to create project: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
      ),
      vscode.commands.registerCommand('rapidkit.createFastAPIProject', async () => {
        try {
          logger.info('Executing createFastAPIProject command');
          if (!workspaceExplorer) {
            vscode.window.showErrorMessage('Extension not fully initialized');
            return;
          }
          const selectedWorkspace = workspaceExplorer.getSelectedWorkspace();
          await createProjectCommand(selectedWorkspace?.path, 'fastapi');
          if (projectExplorer) {
            projectExplorer.refresh();
          }
        } catch (error) {
          logger.error('Failed to create FastAPI project', error);
          vscode.window.showErrorMessage(
            `Failed to create FastAPI project: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }),
      vscode.commands.registerCommand('rapidkit.createNestJSProject', async () => {
        try {
          logger.info('Executing createNestJSProject command');
          if (!workspaceExplorer) {
            vscode.window.showErrorMessage('Extension not fully initialized');
            return;
          }
          const selectedWorkspace = workspaceExplorer.getSelectedWorkspace();
          await createProjectCommand(selectedWorkspace?.path, 'nestjs');
          if (projectExplorer) {
            projectExplorer.refresh();
          }
        } catch (error) {
          logger.error('Failed to create NestJS project', error);
          vscode.window.showErrorMessage(
            `Failed to create NestJS project: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }),
      vscode.commands.registerCommand('rapidkit.openDocs', async () => {
        await vscode.env.openExternal(vscode.Uri.parse('https://getrapidkit.com/docs'));
      }),
      vscode.commands.registerCommand('rapidkit.addModule', addModuleCommand),
      vscode.commands.registerCommand('rapidkit.previewTemplate', previewTemplateCommand),
      vscode.commands.registerCommand('rapidkit.doctor', doctorCommand),
      vscode.commands.registerCommand('rapidkit.checkSystem', checkSystemCommand),
      vscode.commands.registerCommand('rapidkit.showWelcome', () => showWelcomeCommand(context)),
      vscode.commands.registerCommand('rapidkit.refreshWorkspaces', () => {
        if (workspaceExplorer) {
          workspaceExplorer.refresh();
        }
      }),
      vscode.commands.registerCommand('rapidkit.refreshProjects', () => {
        if (projectExplorer) {
          projectExplorer.refresh();
        }
        if (moduleExplorer) {
          moduleExplorer.refresh();
        }
      }),
      vscode.commands.registerCommand('rapidkit.selectWorkspace', async (workspacePath: string) => {
        logger.info('selectWorkspace command with path:', workspacePath);

        if (!workspacePath) {
          vscode.window.showErrorMessage('Invalid workspace path');
          return;
        }

        if (workspaceExplorer) {
          // Find workspace object by path and select it
          const selectedWorkspace = workspaceExplorer.getWorkspaceByPath(workspacePath);
          if (selectedWorkspace) {
            await workspaceExplorer.selectWorkspace(selectedWorkspace);
          } else {
            logger.warn('Workspace not found for path:', workspacePath);
            vscode.window.showWarningMessage('Workspace not found');
          }
        }

        if (projectExplorer) {
          // Get workspace to pass to project explorer
          const selectedWorkspace = workspaceExplorer
            ? workspaceExplorer.getWorkspaceByPath(workspacePath)
            : null;
          if (selectedWorkspace) {
            projectExplorer.setWorkspace(selectedWorkspace);
          }
        }

        // Set context key to enable project buttons
        await vscode.commands.executeCommand('setContext', 'rapidkit:workspaceSelected', true);
        await vscode.commands.executeCommand('setContext', 'rapidkit:noProjects', false);
      }),
      vscode.commands.registerCommand('rapidkit.addWorkspace', async () => {
        if (workspaceExplorer) {
          await workspaceExplorer.addWorkspace();
        }
      }),
      vscode.commands.registerCommand('rapidkit.removeWorkspace', async (item: any) => {
        const workspacePath = item?.workspace?.path || item;
        if (workspacePath && typeof workspacePath === 'string') {
          if (workspaceExplorer) {
            const workspace = workspaceExplorer.getWorkspaceByPath(workspacePath);
            if (workspace) {
              await workspaceExplorer.removeWorkspace(workspace);
            }
          }
        }
      }),
      vscode.commands.registerCommand('rapidkit.discoverWorkspaces', async () => {
        if (workspaceExplorer) {
          await workspaceExplorer.autoDiscover();
        }
      }),
      vscode.commands.registerCommand('rapidkit.selectProject', async (item: ProjectTreeItem) => {
        // Select project when user clicks on it in the tree
        if (item && item.project && projectExplorer) {
          projectExplorer.setSelectedProject(item.project);
          logger.info('Project selected:', item.project.name);
        }
      }),
      vscode.commands.registerCommand('rapidkit.openWorkspaceFolder', async (item: any) => {
        const workspacePath = item?.workspace?.path || item;
        if (workspacePath && typeof workspacePath === 'string') {
          await openWorkspaceFolder(workspacePath);
        }
      }),
      vscode.commands.registerCommand('rapidkit.copyWorkspacePath', async (item: any) => {
        const workspacePath = item?.workspace?.path || item;
        if (workspacePath && typeof workspacePath === 'string') {
          await copyWorkspacePath(workspacePath);
        }
      }),
      vscode.commands.registerCommand('rapidkit.openProjectFolder', async (item: any) => {
        const projectPath = item?.project?.path || item?.projectPath;
        if (projectPath) {
          await openProjectFolder(projectPath);
        }
      }),
      vscode.commands.registerCommand('rapidkit.copyProjectPath', async (item: any) => {
        const projectPath = item?.project?.path || item?.projectPath;
        if (projectPath) {
          await copyProjectPath(projectPath);
        }
      }),
      vscode.commands.registerCommand('rapidkit.deleteProject', async (item: any) => {
        const projectPath = item?.project?.path || item?.projectPath;
        if (projectPath) {
          await deleteProject(projectPath);
        }
      }),
      vscode.commands.registerCommand('rapidkit.openProjectDashboard', async (projectItem) => {
        // Dashboard implementation
        vscode.window.showInformationMessage(`Dashboard for ${projectItem.label} - Coming soon!`);
      }),
      vscode.commands.registerCommand('rapidkit.showLogs', () => {
        const logger = Logger.getInstance();
        logger.show();
      }),
      vscode.commands.registerCommand('rapidkit.closeLogs', () => {
        const logger = Logger.getInstance();
        logger.hide();
      }),
      vscode.commands.registerCommand('rapidkit.clearLogs', () => {
        const logger = Logger.getInstance();
        logger.clear();
      }),

      // Project Quick Actions - Init, Dev, Terminal
      vscode.commands.registerCommand('rapidkit.projectTerminal', async (item: any) => {
        const projectPath = item?.project?.path || item?.projectPath;
        if (projectPath) {
          const terminal = vscode.window.createTerminal({
            name: `RapidKit: ${item?.project?.name || 'Project'}`,
            cwd: projectPath,
          });
          terminal.show();
          logger.info(`Opened terminal for project: ${projectPath}`);
        }
      }),
      vscode.commands.registerCommand('rapidkit.projectInit', async (item: any) => {
        const projectPath = item?.project?.path || item?.projectPath;
        const projectName = item?.project?.name || 'Project';

        if (projectPath) {
          const terminal = vscode.window.createTerminal({
            name: `📦 ${projectName} [init]`,
            cwd: projectPath,
          });
          terminal.show();

          // Both frameworks use rapidkit init
          terminal.sendText('npx rapidkit init');

          logger.info(`Running init for project: ${projectPath}`);
        }
      }),
      vscode.commands.registerCommand('rapidkit.projectDev', async (item: any) => {
        const projectPath = item?.project?.path || item?.projectPath;
        const projectName = item?.project?.name || 'Project';
        const projectType = item?.project?.type || 'fastapi';

        if (projectPath) {
          const fs = await import('fs');
          const path = await import('path');

          // Check if project is initialized based on framework
          const isFastAPI = projectType === 'fastapi';

          let isInitialized = false;
          let missingText = '';

          if (isFastAPI) {
            // Smart detection: check both .venv and Poetry virtualenv
            const venvInfo = await detectPythonVirtualenv(projectPath);
            isInitialized = venvInfo.exists;
            missingText = venvInfo.exists ? '' : 'virtualenv (.venv or Poetry cache)';
          } else {
            // NestJS: check node_modules
            const checkPath = path.join(projectPath, 'node_modules');
            isInitialized = fs.existsSync(checkPath);
            missingText = 'node_modules';
          }

          if (!isInitialized) {
            // Different options for FastAPI vs NestJS
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
              const terminal = vscode.window.createTerminal({
                name: `🔧 ${projectName} [init → dev]`,
                cwd: projectPath,
              });
              terminal.show();

              // Both frameworks use rapidkit commands
              terminal.sendText('npx rapidkit init && npx rapidkit dev');

              runningServers.set(projectPath, terminal);
              projectExplorer?.refresh();

              vscode.window.showInformationMessage(`🔧 Initializing ${projectName}...`);
              logger.info(`Init + Dev for ${projectType} project: ${projectPath}`);
              return;
            } else if (action === 'Start Anyway' && isFastAPI) {
              const terminal = vscode.window.createTerminal({
                name: `🚀 ${projectName} [:8000]`,
                cwd: projectPath,
              });
              terminal.show();
              terminal.sendText('npx rapidkit dev --allow-global-runtime');

              runningServers.set(projectPath, terminal);
              projectExplorer?.refresh();

              logger.info(`Dev (global runtime) for project: ${projectPath}`);
              return;
            } else {
              return;
            }
          }

          // START the server - find available port
          const net = await import('net');
          const defaultPort = 8000; // Both FastAPI and NestJS use 8000
          let port = defaultPort;

          const findAvailablePort = (startPort: number): Promise<number> => {
            return new Promise((resolve) => {
              const server = net.createServer();
              server.listen(startPort, '0.0.0.0', () => {
                server.close(() => resolve(startPort));
              });
              server.on('error', () => {
                resolve(findAvailablePort(startPort + 1));
              });
            });
          };
          port = await findAvailablePort(defaultPort);

          const terminal = vscode.window.createTerminal({
            name: `🚀 ${projectName} [:${port}]`,
            cwd: projectPath,
          });
          terminal.show();

          if (isFastAPI) {
            if (port !== defaultPort) {
              terminal.sendText(`npx rapidkit dev --port ${port}`);
              vscode.window.showInformationMessage(
                `▶️ Started on port ${port} (${defaultPort} was busy)`
              );
            } else {
              terminal.sendText('npx rapidkit dev');
              vscode.window.showInformationMessage(`▶️ Started FastAPI server on port ${port}`);
            }
          } else {
            // NestJS
            if (port !== defaultPort) {
              terminal.sendText(`PORT=${port} npm run start:dev`);
              vscode.window.showInformationMessage(
                `▶️ Started on port ${port} (${defaultPort} was busy)`
              );
            } else {
              terminal.sendText('npm run start:dev');
              vscode.window.showInformationMessage(`▶️ Started NestJS server on port ${port}`);
            }
          }

          // Track running server
          runningServers.set(projectPath, terminal);

          // Refresh to update icon
          projectExplorer?.refresh();

          logger.info(
            `Running ${projectType} dev server for project: ${projectPath} on port ${port}`
          );
        }
      }),
      vscode.commands.registerCommand('rapidkit.projectStop', async (item: any) => {
        const projectPath = item?.project?.path || item?.projectPath;
        const projectName = item?.project?.name || 'Project';
        if (projectPath) {
          const existingTerminal = runningServers.get(projectPath);
          if (existingTerminal) {
            existingTerminal.sendText('\x03'); // Ctrl+C
            existingTerminal.show();
            vscode.window.showInformationMessage(`⏹️ Stopped server for ${projectName}`);

            runningServers.delete(projectPath);

            // Refresh to update icon
            projectExplorer?.refresh();

            logger.info(`Stopped dev server for: ${projectPath}`);
          }
        }
      }),
      vscode.commands.registerCommand('rapidkit.projectTest', async (item: any) => {
        const projectPath = item?.project?.path || item?.projectPath;
        const projectName = item?.project?.name || 'Project';

        if (projectPath) {
          const terminal = vscode.window.createTerminal({
            name: `🧪 ${projectName} [test]`,
            cwd: projectPath,
          });
          terminal.show();

          // Both frameworks use rapidkit test
          terminal.sendText('npx rapidkit test');

          logger.info(`Running tests for project: ${projectPath}`);
        }
      }),
      vscode.commands.registerCommand('rapidkit.projectBrowser', async (item: any) => {
        const projectPath = item?.project?.path || item?.projectPath;
        const projectType = item?.project?.type || 'fastapi';
        const isFastAPI = projectType === 'fastapi';

        // Try to get port from running terminal name
        let port = 8000; // Both FastAPI and NestJS use 8000
        const runningTerminal = projectPath ? runningServers.get(projectPath) : null;
        if (runningTerminal) {
          // Extract port from terminal name like "🚀 project [:8001]"
          const match = runningTerminal.name.match(/:([0-9]+)/);
          if (match) {
            port = parseInt(match[1], 10);
          }
        }

        // Both frameworks have /docs (Swagger)
        const url = `http://localhost:${port}/docs`;
        vscode.env.openExternal(vscode.Uri.parse(url));
        logger.info(`Opening browser: ${url}`);

        if (isFastAPI) {
          vscode.window
            .showInformationMessage(`Opening ${url}`, 'Open /redoc')
            .then((selection) => {
              if (selection === 'Open /redoc') {
                vscode.env.openExternal(vscode.Uri.parse(`http://localhost:${port}/redoc`));
              }
            });
        } else {
          vscode.window.showInformationMessage(`Opening ${url}`);
        }
      }),

      // File management commands
      vscode.commands.registerCommand('rapidkit.newFile', async (item: any) => {
        const targetPath = item?.filePath || item?.project?.path;
        if (!targetPath) {
          vscode.window.showErrorMessage('No target path selected');
          return;
        }

        const fileName = await vscode.window.showInputBox({
          prompt: 'Enter file name',
          placeHolder: 'example.py',
          validateInput: (value) => {
            if (!value || value.trim() === '') {
              return 'File name cannot be empty';
            }
            if (/[<>:"/\\|?*]/.test(value)) {
              return 'File name contains invalid characters';
            }
            return null;
          },
        });

        if (fileName) {
          const fs = await import('fs');
          const path = await import('path');
          const filePath = path.join(targetPath, fileName);

          try {
            fs.writeFileSync(filePath, '', 'utf-8');
            const doc = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(doc);
            projectExplorer?.refresh();
            logger.info(`Created new file: ${filePath}`);
          } catch (err) {
            vscode.window.showErrorMessage(`Failed to create file: ${err}`);
          }
        }
      }),

      vscode.commands.registerCommand('rapidkit.newFolder', async (item: any) => {
        const targetPath = item?.filePath || item?.project?.path;
        if (!targetPath) {
          vscode.window.showErrorMessage('No target path selected');
          return;
        }

        const folderName = await vscode.window.showInputBox({
          prompt: 'Enter folder name',
          placeHolder: 'new_folder',
          validateInput: (value) => {
            if (!value || value.trim() === '') {
              return 'Folder name cannot be empty';
            }
            if (/[<>:"/\\|?*]/.test(value)) {
              return 'Folder name contains invalid characters';
            }
            return null;
          },
        });

        if (folderName) {
          const fs = await import('fs');
          const path = await import('path');
          const folderPath = path.join(targetPath, folderName);

          try {
            fs.mkdirSync(folderPath, { recursive: true });
            projectExplorer?.refresh();
            logger.info(`Created new folder: ${folderPath}`);
            vscode.window.showInformationMessage(`Created folder: ${folderName}`);
          } catch (err) {
            vscode.window.showErrorMessage(`Failed to create folder: ${err}`);
          }
        }
      }),

      vscode.commands.registerCommand('rapidkit.deleteFile', async (item: any) => {
        const targetPath = item?.filePath;
        if (!targetPath) {
          vscode.window.showErrorMessage('No file/folder selected');
          return;
        }

        const fs = await import('fs');
        const path = await import('path');
        const name = path.basename(targetPath);

        const confirm = await vscode.window.showWarningMessage(
          `Are you sure you want to delete "${name}"?`,
          { modal: true },
          'Delete'
        );

        if (confirm === 'Delete') {
          try {
            const stats = fs.statSync(targetPath);
            if (stats.isDirectory()) {
              fs.rmSync(targetPath, { recursive: true, force: true });
            } else {
              fs.unlinkSync(targetPath);
            }
            projectExplorer?.refresh();
            logger.info(`Deleted: ${targetPath}`);
          } catch (err) {
            vscode.window.showErrorMessage(`Failed to delete: ${err}`);
          }
        }
      }),

      vscode.commands.registerCommand('rapidkit.renameFile', async (item: any) => {
        const targetPath = item?.filePath;
        if (!targetPath) {
          vscode.window.showErrorMessage('No file/folder selected');
          return;
        }

        const path = await import('path');
        const fs = await import('fs');
        const oldName = path.basename(targetPath);
        const dirPath = path.dirname(targetPath);

        const newName = await vscode.window.showInputBox({
          prompt: 'Enter new name',
          value: oldName,
          validateInput: (value) => {
            if (!value || value.trim() === '') {
              return 'Name cannot be empty';
            }
            if (/[<>:"/\\|?*]/.test(value)) {
              return 'Name contains invalid characters';
            }
            return null;
          },
        });

        if (newName && newName !== oldName) {
          const newPath = path.join(dirPath, newName);
          try {
            fs.renameSync(targetPath, newPath);
            projectExplorer?.refresh();
            logger.info(`Renamed: ${oldName} → ${newName}`);
          } catch (err) {
            vscode.window.showErrorMessage(`Failed to rename: ${err}`);
          }
        }
      }),

      vscode.commands.registerCommand('rapidkit.revealInExplorer', async (item: any) => {
        const targetPath = item?.filePath || item?.project?.path;
        if (targetPath) {
          vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(targetPath));
        }
      }),

      vscode.commands.registerCommand('rapidkit.checkForUpdates', async () => {
        const { forceCheckForUpdates } = await import('./utils/updateChecker.js');
        await forceCheckForUpdates(context);
      })
    );

    logger.info('✅ Commands registered successfully');

    // Listen for terminal close events to update running servers
    context.subscriptions.push(
      vscode.window.onDidCloseTerminal((closedTerminal) => {
        // Find and remove from runningServers
        for (const [projectPath, terminal] of runningServers.entries()) {
          if (terminal === closedTerminal) {
            runningServers.delete(projectPath);
            logger.info(`Terminal closed for project: ${projectPath}`);
            // Refresh tree to update icons
            projectExplorer?.refresh();
            break;
          }
        }
      })
    );

    // Initialize configuration manager
    logger.info('Step 2: Initializing configuration manager...');
    const configManager = ConfigurationManager.getInstance();
    await configManager.initialize(context);

    // Initialize workspace detector
    logger.info('Step 3: Initializing workspace detector...');
    const workspaceDetector = WorkspaceDetector.getInstance();
    await workspaceDetector.detectRapidKitProjects();

    // Ensure default workspace is registered
    logger.info('Step 3.5: Checking default workspace...');
    // NOTE: Do not auto-create default workspace - user should create workspace manually via command
    // await ensureDefaultWorkspace();

    // Initialize status bar
    logger.info('Step 4: Initializing status bar...');
    statusBar = new RapidKitStatusBar();
    context.subscriptions.push(statusBar);

    // Initialize tree view providers
    logger.info('Step 5: Initializing tree view providers...');
    actionsWebviewProvider = new ActionsWebviewProvider(context.extensionUri);
    workspaceExplorer = new WorkspaceExplorerProvider();
    projectExplorer = new ProjectExplorerProvider();
    moduleExplorer = new ModuleExplorerProvider();

    // Register tree views
    logger.info('Step 6: Registering tree views...');
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider('rapidkitActionsWebview', actionsWebviewProvider),
      vscode.window.registerTreeDataProvider('rapidkitWorkspaces', workspaceExplorer)
    );
    const projectsTreeView = vscode.window.createTreeView('rapidkitProjects', {
      treeDataProvider: projectExplorer,
    });
    context.subscriptions.push(projectsTreeView);
    projectsTreeView.onDidChangeSelection((e) => {
      const item = e.selection[0];
      if (item && item instanceof ProjectTreeItem && item.project?.path) {
        setSelectedProjectPath(item.project.path);
      }
    });
    context.subscriptions.push(
      vscode.window.registerTreeDataProvider('rapidkitModules', moduleExplorer)
    );

    // Register IntelliSense providers
    logger.info('Step 7: Registering IntelliSense providers...');
    context.subscriptions.push(
      // Code actions for configuration files
      vscode.languages.registerCodeActionsProvider(
        [
          { pattern: '**/.rapidkitrc.json' },
          { pattern: '**/rapidkit.json' },
          { pattern: '**/module.yaml' },
        ],
        new RapidKitCodeActionsProvider(),
        {
          providedCodeActionKinds: RapidKitCodeActionsProvider.providedCodeActionKinds,
        }
      ),

      // Completion provider
      vscode.languages.registerCompletionItemProvider(
        [
          { pattern: '**/.rapidkitrc.json' },
          { pattern: '**/rapidkit.json' },
          { pattern: '**/module.yaml' },
        ],
        new RapidKitCompletionProvider(),
        '"',
        ':',
        ' '
      ),

      // Hover provider
      vscode.languages.registerHoverProvider(
        [
          { pattern: '**/.rapidkitrc.json' },
          { pattern: '**/rapidkit.json' },
          { pattern: '**/module.yaml' },
        ],
        new RapidKitHoverProvider()
      )
    );

    logger.info('Step 8: IntelliSense providers registered');

    logger.info('✅ RapidKit commands registered successfully!');
    statusBar.updateStatus('ready');

    // Check for rapidkit npm updates (non-blocking, runs in background)
    checkAndNotifyUpdates(context).catch((err) => {
      logger.error('Update check failed', err);
    });

    // Initialize workspace selection ASYNCHRONOUSLY (non-blocking)
    // This allows commands to be available immediately even if initialization fails
    (async () => {
      try {
        logger.info('Step 9: Initializing workspace selection...');
        await workspaceExplorer.refresh();

        // Show welcome page on first activation
        logger.info('Step 10: Checking welcome page settings...');
        const config = vscode.workspace.getConfiguration('rapidkit');

        // Always show welcome page on first activation or if configured
        // Setup wizard is now integrated into welcome page
        if (config.get('showWelcomeOnStartup', true)) {
          await showWelcomeCommand(context);
        }

        // Step 11: Initialize workspace usage tracking
        logger.info('Step 11: Initializing workspace usage tracker...');
        const usageTracker = WorkspaceUsageTracker.getInstance();
        await usageTracker.initialize();

        logger.info('✅ RapidKit extension initialized successfully!');

        // Watch for workspace changes
        const fileWatcher = vscode.workspace.createFileSystemWatcher(
          '**/pyproject.toml',
          false,
          false,
          false
        );

        fileWatcher.onDidCreate(() => {
          if (config.get('autoRefresh', true)) {
            projectExplorer.refresh();
          }
        });

        fileWatcher.onDidChange(() => {
          if (config.get('autoRefresh', true)) {
            projectExplorer.refresh();
          }
        });

        fileWatcher.onDidDelete(() => {
          if (config.get('autoRefresh', true)) {
            projectExplorer.refresh();
          }
        });

        context.subscriptions.push(fileWatcher);
      } catch (error) {
        logger.error('Error during async initialization:', error);
      }
    })();
  } catch (error) {
    logger.error('Failed to activate RapidKit extension', error);
    vscode.window.showErrorMessage(
      `Failed to activate RapidKit extension: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export function deactivate() {
  Logger.getInstance().info('👋 RapidKit extension is deactivating...');
  if (statusBar) {
    statusBar.dispose();
  }
  if (workspaceExplorer) {
    workspaceExplorer.dispose();
  }
}
