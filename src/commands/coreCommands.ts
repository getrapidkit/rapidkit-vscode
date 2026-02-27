import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { createWorkspaceCommand } from './createWorkspace';
import { createProjectCommand } from './createProject';
import { addModuleCommand } from './addModule';
import { previewTemplateCommand } from './previewTemplate';
import { doctorCommand } from './doctor';
import { checkSystemCommand } from './checkSystem';
import { showWelcomeCommand } from './showWelcome';
import { WelcomePanel } from '../ui/panels/welcomePanel';
import { SetupPanel } from '../ui/panels/setupPanel';

type WorkspaceLike = { path: string };

type WorkspaceExplorerLike = {
  refresh: () => void;
  getSelectedWorkspace: () => WorkspaceLike | null | undefined;
};

type ProjectExplorerLike = {
  refresh: () => void;
};

export function registerCoreCommands(options: {
  context: vscode.ExtensionContext;
  logger: Logger;
  getWorkspaceExplorer: () => WorkspaceExplorerLike | undefined;
  getProjectExplorer: () => ProjectExplorerLike | undefined;
}): vscode.Disposable[] {
  const { context, logger, getWorkspaceExplorer, getProjectExplorer } = options;

  return [
    vscode.commands.registerCommand('rapidkit.test', () => {
      vscode.window.showInformationMessage('✅ RapidKit commands are working!');
    }),

    vscode.commands.registerCommand(
      'rapidkit.createWorkspace',
      async (workspaceInput?: string | Record<string, unknown>) => {
        try {
          logger.info(
            'Executing createWorkspace command',
            workspaceInput ? `with input: ${JSON.stringify(workspaceInput)}` : ''
          );
          await createWorkspaceCommand(workspaceInput as any);
          getWorkspaceExplorer()?.refresh();
        } catch (error) {
          logger.error('Failed to create workspace', error);
          vscode.window.showErrorMessage(
            `Failed to create workspace: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    ),

    vscode.commands.registerCommand(
      'rapidkit.createProject',
      async (workspacePathOrUri?: string | vscode.Uri) => {
        try {
          logger.info('Executing createProject command');
          const workspaceExplorer = getWorkspaceExplorer();
          if (!workspaceExplorer) {
            vscode.window.showErrorMessage('Extension not fully initialized');
            return;
          }

          let workspacePath: string | undefined;
          if (typeof workspacePathOrUri === 'string') {
            workspacePath = workspacePathOrUri;
          } else if (workspacePathOrUri instanceof vscode.Uri) {
            workspacePath = workspacePathOrUri.fsPath;
          }

          if (!workspacePath) {
            const selectedWorkspace = workspaceExplorer.getSelectedWorkspace();
            workspacePath = selectedWorkspace?.path;
          }

          await createProjectCommand(workspacePath);
          getProjectExplorer()?.refresh();
        } catch (error) {
          logger.error('Failed to create project', error);
          vscode.window.showErrorMessage(
            `Failed to create project: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    ),

    vscode.commands.registerCommand(
      'rapidkit.createFastAPIProject',
      async (projectName?: string) => {
        try {
          logger.info('Executing createFastAPIProject command', { projectName });
          const workspaceExplorer = getWorkspaceExplorer();
          if (!workspaceExplorer) {
            vscode.window.showErrorMessage('Extension not fully initialized');
            return;
          }

          const selectedWorkspace = workspaceExplorer.getSelectedWorkspace();
          await createProjectCommand(selectedWorkspace?.path, 'fastapi', projectName);
          getProjectExplorer()?.refresh();
        } catch (error) {
          logger.error('Failed to create FastAPI project', error);
          vscode.window.showErrorMessage(
            `Failed to create FastAPI project: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    ),

    vscode.commands.registerCommand(
      'rapidkit.createNestJSProject',
      async (projectName?: string) => {
        try {
          logger.info('Executing createNestJSProject command', { projectName });
          const workspaceExplorer = getWorkspaceExplorer();
          if (!workspaceExplorer) {
            vscode.window.showErrorMessage('Extension not fully initialized');
            return;
          }

          const selectedWorkspace = workspaceExplorer.getSelectedWorkspace();
          await createProjectCommand(selectedWorkspace?.path, 'nestjs', projectName);
          getProjectExplorer()?.refresh();
        } catch (error) {
          logger.error('Failed to create NestJS project', error);
          vscode.window.showErrorMessage(
            `Failed to create NestJS project: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    ),

    vscode.commands.registerCommand('rapidkit.openDocs', async () => {
      await vscode.env.openExternal(vscode.Uri.parse('https://getrapidkit.com/docs'));
    }),

    vscode.commands.registerCommand('rapidkit.addModule', addModuleCommand),
    vscode.commands.registerCommand('rapidkit.previewTemplate', previewTemplateCommand),
    vscode.commands.registerCommand('rapidkit.doctor', doctorCommand),
    vscode.commands.registerCommand('rapidkit.checkSystem', checkSystemCommand),

    vscode.commands.registerCommand('rapidkit.clearRequirementCache', async () => {
      try {
        const { requirementCache } = await import('../utils/requirementCache.js');
        requirementCache.invalidateAll();
        logger.info('Requirement cache cleared (Python & Poetry)');
        vscode.window.showInformationMessage(
          '✅ Cache Cleared\n\nPython and Poetry checks will be performed fresh on next workspace creation.'
        );
      } catch (error) {
        logger.error('Failed to clear cache', error);
        vscode.window.showErrorMessage('Failed to clear cache');
      }
    }),

    vscode.commands.registerCommand('rapidkit.showWelcome', () => showWelcomeCommand(context)),

    vscode.commands.registerCommand(
      'rapidkit.openProjectModal',
      (framework: 'fastapi' | 'nestjs' | 'go') => {
        WelcomePanel.openProjectModal(context, framework);
      }
    ),

    vscode.commands.registerCommand('rapidkit.openWorkspaceModal', () => {
      WelcomePanel.openWorkspaceModal(context);
    }),

    vscode.commands.registerCommand('rapidkit.openSetup', () => SetupPanel.show(context)),
  ];
}
