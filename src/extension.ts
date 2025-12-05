/**
 * RapidKit VS Code Extension
 * Main extension entry point
 */

import * as vscode from 'vscode';
import { ActionsProvider } from './ui/actionsProvider';
import { WorkspaceExplorerProvider } from './ui/treeviews/workspaceExplorer';
import { ProjectExplorerProvider } from './ui/treeviews/projectExplorer';
import { ModuleExplorerProvider } from './ui/treeviews/moduleExplorer';
import { TemplateExplorerProvider } from './ui/treeviews/templateExplorer';
import { createWorkspaceCommand } from './commands/createWorkspace';
import { createProjectCommand } from './commands/createProject';
import { addModuleCommand } from './commands/addModule';
import { previewTemplateCommand } from './commands/previewTemplate';
import { doctorCommand } from './commands/doctor';
import { showWelcomeCommand } from './commands/showWelcome';
import { RapidKitStatusBar } from './ui/statusBar';
import { ConfigurationManager } from './core/configurationManager';
import { WorkspaceDetector } from './core/workspaceDetector';
import { WorkspaceManager } from './core/workspaceManager';
import { Logger } from './utils/logger';
import { RapidKitCodeActionsProvider } from './providers/codeActionsProvider';
import { RapidKitCompletionProvider } from './providers/completionProvider';
import { RapidKitHoverProvider } from './providers/hoverProvider';
import { openWorkspaceFolder, copyWorkspacePath } from './commands/workspaceContextMenu';
import { openProjectFolder, copyProjectPath, deleteProject } from './commands/projectContextMenu';

let statusBar: RapidKitStatusBar;
let actionsProvider: ActionsProvider;
let workspaceExplorer: WorkspaceExplorerProvider;
let projectExplorer: ProjectExplorerProvider;
let moduleExplorer: ModuleExplorerProvider;
let templateExplorer: TemplateExplorerProvider;

/**
 * Ensure default workspace exists and is registered in WorkspaceManager
 */
async function ensureDefaultWorkspace(): Promise<void> {
  const logger = Logger.getInstance();
  const path = require('path');
  const os = require('os');
  const fs = require('fs-extra');

  const defaultWorkspacePath = path.join(os.homedir(), 'RapidKit', 'rapidkits');

  // Check if default workspace exists
  if (await fs.pathExists(defaultWorkspacePath)) {
    // Add to WorkspaceManager if not already there
    const manager = WorkspaceManager.getInstance();
    const workspaces = manager.getWorkspaces();
    const isInManager = workspaces.some((ws: any) => ws.path === defaultWorkspacePath);

    if (!isInManager) {
      await manager.addWorkspace(defaultWorkspacePath);
      logger.info('✅ Default workspace registered:', defaultWorkspacePath);
    } else {
      logger.info('Default workspace already registered');
    }
  } else {
    logger.info('Default workspace does not exist yet, will be created on first project creation');
  }
}

export async function activate(context: vscode.ExtensionContext) {
  const logger = Logger.getInstance();
  logger.info('🚀 RapidKit extension is activating...');

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
      vscode.commands.registerCommand('rapidkit.createProject', async (workspacePath?: string) => {
        try {
          logger.info('Executing createProject command');
          if (!workspaceExplorer) {
            vscode.window.showErrorMessage('Extension not fully initialized');
            return;
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
      }),
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
        if (templateExplorer) {
          templateExplorer.refresh();
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
      })
    );

    logger.info('✅ Commands registered successfully');

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
    await ensureDefaultWorkspace();

    // Initialize status bar
    logger.info('Step 4: Initializing status bar...');
    statusBar = new RapidKitStatusBar();
    context.subscriptions.push(statusBar);

    // Initialize tree view providers
    logger.info('Step 5: Initializing tree view providers...');
    actionsProvider = new ActionsProvider();
    workspaceExplorer = new WorkspaceExplorerProvider();
    projectExplorer = new ProjectExplorerProvider();
    moduleExplorer = new ModuleExplorerProvider();
    templateExplorer = new TemplateExplorerProvider();

    // Register tree views
    logger.info('Step 6: Registering tree views...');
    context.subscriptions.push(
      vscode.window.registerTreeDataProvider('rapidkitActions', actionsProvider),
      vscode.window.registerTreeDataProvider('rapidkitWorkspaces', workspaceExplorer),
      vscode.window.registerTreeDataProvider('rapidkitProjects', projectExplorer),
      vscode.window.registerTreeDataProvider('rapidkitModules', moduleExplorer),
      vscode.window.registerTreeDataProvider('rapidkitTemplates', templateExplorer)
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

    // Initialize workspace selection ASYNCHRONOUSLY (non-blocking)
    // This allows commands to be available immediately even if initialization fails
    (async () => {
      try {
        logger.info('Step 9: Initializing workspace selection...');
        await workspaceExplorer.refresh();

        // Show welcome page on first activation
        logger.info('Step 10: Checking welcome page settings...');
        const config = vscode.workspace.getConfiguration('rapidkit');
        if (config.get('showWelcomeOnStartup', true)) {
          await showWelcomeCommand(context);
        }

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
