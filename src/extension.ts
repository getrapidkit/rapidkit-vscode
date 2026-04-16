/**
 * Workspai VS Code Extension
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
import {
  DoctorEvidenceProvider,
  type ProjectEvidence,
} from './ui/treeviews/doctorEvidenceProvider';
import { checkAndNotifyUpdates } from './utils/updateChecker';
// templateExplorer removed in v0.4.3 (redundant with npm package)
import { registerCoreCommands } from './commands/coreCommands';
import { registerFileManagementCommands } from './commands/fileManagement';
import { registerProjectContextAndLogCommands } from './commands/projectContextAndLogs';
import { registerProjectLifecycleCommands } from './commands/projectLifecycle';
import { showWelcomeCommand } from './commands/showWelcome';
import { registerWorkspaceSelectionCommands } from './commands/workspaceSelection';
import { registerWorkspaceOperationsCommands } from './commands/workspaceOperations';
import { WorkspaiStatusBar } from './ui/statusBar';
import { ConfigurationManager } from './core/configurationManager';
import { WorkspaceDetector } from './core/workspaceDetector';
import { Logger } from './utils/logger';
import { WorkspaiCodeActionsProvider } from './providers/codeActionsProvider';
import { WorkspaiCompletionProvider } from './providers/completionProvider';
import { WorkspaiHoverProvider } from './providers/hoverProvider';
import { WorkspaceUsageTracker } from './utils/workspaceUsageTracker';
import { WelcomePanel } from './ui/panels/welcomePanel';
import { ModulesCatalogService } from './core/modulesCatalogService';
import { runRapidkitCommandsInTerminal } from './utils/terminalExecutor';
import { ExamplesService } from './core/examplesService';
import { KitsService } from './core/kitsService';
import { registerAIDebuggerCommand } from './commands/aiDebugger';
import { registerWorkspaceBrainCommand } from './commands/workspaceBrain';

let statusBar: WorkspaiStatusBar;
let actionsWebviewProvider: ActionsWebviewProvider;
let workspaceExplorer: WorkspaceExplorerProvider;
let projectExplorer: ProjectExplorerProvider;
let moduleExplorer: ModuleExplorerProvider;
let doctorEvidenceExplorer: DoctorEvidenceProvider;
// templateExplorer removed

// Track running dev servers per project (exported for ProjectExplorer)
export const runningServers: Map<string, vscode.Terminal> = new Map();

export async function activate(context: vscode.ExtensionContext) {
  const logger = Logger.getInstance();
  logger.info('🚀 Workspai extension is activating...');

  // Store context globally for access from commands
  (global as any).extensionContext = context;

  // Set extension path for custom icons
  setExtensionPath(context.extensionPath);

  try {
    // Register commands FIRST - these MUST succeed
    logger.info('Step 1: Registering commands...');

    context.subscriptions.push(
      ...registerCoreCommands({
        context,
        logger,
        getWorkspaceExplorer: () => workspaceExplorer,
        getProjectExplorer: () => projectExplorer,
      }),
      ...registerWorkspaceSelectionCommands({
        logger,
        getWorkspaceExplorer: () => workspaceExplorer,
        getProjectExplorer: () => projectExplorer,
        getModuleExplorer: () => moduleExplorer,
      }),
      ...registerWorkspaceOperationsCommands({
        logger,
        getWorkspaceExplorer: () => workspaceExplorer,
        context,
      }),
      ...registerProjectContextAndLogCommands(),
      ...registerProjectLifecycleCommands({
        logger,
        runningServers,
        getProjectExplorer: () => projectExplorer,
      }),
      ...registerFileManagementCommands({
        logger,
        getProjectExplorer: () => projectExplorer,
      }),
      registerAIDebuggerCommand(context),
      registerWorkspaceBrainCommand(context)
    );

    // AI context commands — triggered from tree view inline buttons
    context.subscriptions.push(
      vscode.commands.registerCommand('rapidkit.aiForWorkspace', (item?: any) => {
        const ws = item?.workspace || workspaceExplorer?.getSelectedWorkspace();
        if (!ws) {
          vscode.window.showWarningMessage('Select a workspace first.');
          return;
        }
        WelcomePanel.showAIModal(context, {
          type: 'workspace',
          name: ws.name,
          path: ws.path,
        });
      }),
      vscode.commands.registerCommand('rapidkit.aiForProject', (item?: any) => {
        const project = item?.project || projectExplorer?.getSelectedProject();
        if (!project) {
          vscode.window.showWarningMessage('Select a project first.');
          return;
        }
        WelcomePanel.showAIModal(context, {
          type: 'project',
          name: project.name,
          path: project.path,
          framework: project.type,
        });
      }),
      vscode.commands.registerCommand('rapidkit.aiForModule', (item?: any) => {
        const mod = item?.module;
        const project = projectExplorer?.getSelectedProject();
        WelcomePanel.showAIModal(context, {
          type: 'module',
          name: mod?.displayName || mod?.name || 'Module',
          path: project?.path,
          framework: project?.type,
          moduleSlug: (mod as any)?.slug || mod?.id,
          moduleDescription: mod?.description,
        });
      }),
      // AI-powered workspace creation — triggered from sidebar Quick Actions panel
      vscode.commands.registerCommand('rapidkit.openAICreateWorkspace', () => {
        WelcomePanel.openAICreateModal(context, 'workspace');
      }),
      // AI-powered project creation — triggered from Projects panel title button
      vscode.commands.registerCommand('rapidkit.aiCreateProject', () => {
        WelcomePanel.openAICreateModal(context, 'project');
      }),
      // Quick switch workspace via QuickPick
      vscode.commands.registerCommand('rapidkit.quickSwitchWorkspace', () => {
        workspaceExplorer.quickSwitch();
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

    // Initialize modules catalog service
    ModulesCatalogService.initialize(context);

    // Initialize examples service
    ExamplesService.initialize(context);

    // Initialize kits service
    KitsService.initialize(context);

    // Ensure default workspace is registered
    logger.info('Step 3.5: Checking default workspace...');
    // NOTE: Do not auto-create default workspace - user should create workspace manually via command
    // await ensureDefaultWorkspace();

    // Initialize status bar
    logger.info('Step 4: Initializing status bar...');
    statusBar = new WorkspaiStatusBar();
    context.subscriptions.push(statusBar);

    // Initialize tree view providers
    logger.info('Step 5: Initializing tree view providers...');
    actionsWebviewProvider = new ActionsWebviewProvider(context.extensionUri);
    workspaceExplorer = new WorkspaceExplorerProvider();
    projectExplorer = new ProjectExplorerProvider();
    moduleExplorer = new ModuleExplorerProvider();
    doctorEvidenceExplorer = new DoctorEvidenceProvider(
      () => workspaceExplorer?.getSelectedWorkspace()?.path ?? null
    );

    // Set workspace explorer reference for WelcomePanel
    WelcomePanel.setWorkspaceExplorer(workspaceExplorer);
    WelcomePanel.setExtensionContext(context);

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
        // Update Module Explorer to show installed modules for this project
        moduleExplorer.setProjectPath(item.project.path, item.project.type);
      }
    });
    context.subscriptions.push(
      vscode.window.registerTreeDataProvider('rapidkitModules', moduleExplorer),
      vscode.window.registerTreeDataProvider('rapidkitDoctorEvidence', doctorEvidenceExplorer),
      // Refresh evidence panel whenever workspace tree changes (fires right after selectedWorkspace is updated)
      workspaceExplorer.onDidChangeTreeData(() => {
        doctorEvidenceExplorer.refresh();
      })
    );

    // Doctor Evidence commands
    context.subscriptions.push(
      vscode.commands.registerCommand('rapidkit.doctorEvidence.refresh', () => {
        doctorEvidenceExplorer.refresh();
      }),
      vscode.commands.registerCommand('rapidkit.doctorEvidence.rerun', async () => {
        const ws = workspaceExplorer.getSelectedWorkspace();
        if (!ws) {
          vscode.window.showWarningMessage('Select a workspace first.');
          return;
        }
        runRapidkitCommandsInTerminal({
          name: `Workspai Doctor - ${ws.name ?? ws.path}`,
          cwd: ws.path,
          commands: [['doctor', 'workspace']],
        });
        // Refresh evidence panel after a short delay so the new file is picked up
        setTimeout(() => doctorEvidenceExplorer.refresh(), 5000);
      }),
      vscode.commands.registerCommand('rapidkit.doctorEvidence.autofix', async () => {
        const ws = workspaceExplorer.getSelectedWorkspace();
        if (!ws) {
          vscode.window.showWarningMessage('Select a workspace first.');
          return;
        }
        runRapidkitCommandsInTerminal({
          name: `Workspai Doctor Fix - ${ws.name ?? ws.path}`,
          cwd: ws.path,
          commands: [['doctor', 'workspace', '--fix']],
        });
        setTimeout(() => doctorEvidenceExplorer.refresh(), 8000);
      }),
      vscode.commands.registerCommand(
        'rapidkit.doctorEvidence.fixIssueWithAI',
        async (issue: string, project: ProjectEvidence) => {
          if (!issue) {
            return;
          }
          const framework = project?.framework ?? 'unknown';
          const projectName = project?.name ?? 'project';
          const prefillQuestion = [
            `Project: ${projectName} (${framework})`,
            `Issue detected by Workspai Doctor:`,
            issue,
            project?.fixCommands?.length
              ? `Suggested fix commands:\n${project.fixCommands.map((c) => `  ${c}`).join('\n')}`
              : '',
          ]
            .filter(Boolean)
            .join('\n');

          WelcomePanel.showAIModal(context, {
            type: 'project',
            name: projectName,
            framework: framework === 'unknown' ? undefined : framework,
            prefillQuestion,
          });
        }
      ),
      // Refresh evidence panel whenever workspace selection changes
      vscode.commands.registerCommand('rapidkit.workspaceSelected', (workspace: any) => {
        projectExplorer?.setWorkspace(workspace);
        doctorEvidenceExplorer.refresh();
      })
    );

    // Register IntelliSense providers
    logger.info('Step 7: Registering IntelliSense providers...');
    context.subscriptions.push(
      // Code actions for configuration files + AI debug for source files
      vscode.languages.registerCodeActionsProvider(
        [
          { pattern: '**/.rapidkitrc.json' },
          { pattern: '**/rapidkit.json' },
          { pattern: '**/module.yaml' },
          { language: 'python' },
          { language: 'typescript' },
          { language: 'javascript' },
          { language: 'go' },
        ],
        new WorkspaiCodeActionsProvider(),
        {
          providedCodeActionKinds: WorkspaiCodeActionsProvider.providedCodeActionKinds,
        }
      ),

      // Completion provider
      vscode.languages.registerCompletionItemProvider(
        [
          { pattern: '**/.rapidkitrc.json' },
          { pattern: '**/rapidkit.json' },
          { pattern: '**/module.yaml' },
        ],
        new WorkspaiCompletionProvider(),
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
        new WorkspaiHoverProvider()
      )
    );

    logger.info('Step 8: IntelliSense providers registered');

    logger.info('✅ Workspai commands registered successfully!');
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

        // Sync evidence panel with whatever workspace was auto-selected on load
        const initialWs = workspaceExplorer.getSelectedWorkspace();
        doctorEvidenceExplorer.setWorkspacePath(initialWs?.path ?? null);

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

        logger.info('✅ Workspai extension initialized successfully!');

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
    logger.error('Failed to activate Workspai extension', error);
    vscode.window.showErrorMessage(
      `Failed to activate Workspai extension: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function refreshModuleExplorerStates(): Promise<void> {
  if (moduleExplorer) {
    await moduleExplorer.reloadModuleStates();
  }
}

export function deactivate() {
  Logger.getInstance().info('👋 Workspai extension is deactivating...');
  if (statusBar) {
    statusBar.dispose();
  }
  if (workspaceExplorer) {
    workspaceExplorer.dispose();
  }
}
