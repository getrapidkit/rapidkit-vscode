import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { ModulesCatalogService } from '../core/modulesCatalogService';
import { WelcomePanel } from '../ui/panels/welcomePanel';
import { openWorkspaceFolder, copyWorkspacePath } from './workspaceContextMenu';

type WorkspaceLike = { path: string; name?: string };
type ProjectLike = { path: string; name: string; type: string };

type WorkspaceExplorerLike = {
  refresh: () => void;
  getWorkspaceByPath: (workspacePath: string) => WorkspaceLike | null | undefined;
  selectWorkspace: (...args: any[]) => Promise<void>;
  getSelectedWorkspace?: () => WorkspaceLike | null | undefined;
  addWorkspace: () => Promise<void>;
  importWorkspace: () => Promise<void>;
  removeWorkspace: (...args: any[]) => Promise<void>;
  exportWorkspace: (...args: any[]) => Promise<void>;
  autoDiscover: () => Promise<void>;
};

type ProjectExplorerLike = {
  refresh: () => void;
  setWorkspace: (...args: any[]) => void;
  setSelectedProject: (...args: any[]) => void;
  getSelectedProject?: () => ProjectLike | null | undefined;
};

type ModuleExplorerLike = {
  refresh: () => void;
  setProjectPath: (projectPath: string, projectType: string) => void;
};

export function registerWorkspaceSelectionCommands(options: {
  logger: Logger;
  getWorkspaceExplorer: () => WorkspaceExplorerLike | undefined;
  getProjectExplorer: () => ProjectExplorerLike | undefined;
  getModuleExplorer: () => ModuleExplorerLike | undefined;
}): vscode.Disposable[] {
  const { logger, getWorkspaceExplorer, getProjectExplorer, getModuleExplorer } = options;

  return [
    vscode.commands.registerCommand('rapidkit.refreshWorkspaces', () => {
      getWorkspaceExplorer()?.refresh();
    }),

    vscode.commands.registerCommand('rapidkit.refreshProjects', () => {
      const projectExplorer = getProjectExplorer();
      const moduleExplorer = getModuleExplorer();

      projectExplorer?.refresh();
      moduleExplorer?.refresh();

      if (WelcomePanel.currentPanel) {
        const selectedProject = projectExplorer?.getSelectedProject?.();
        if (selectedProject) {
          WelcomePanel.updateWithProject(selectedProject.path, selectedProject.name);
        }
      }
    }),

    vscode.commands.registerCommand('rapidkit.selectWorkspace', async (workspacePath: string) => {
      logger.info('selectWorkspace command with path:', workspacePath);

      if (!workspacePath) {
        vscode.window.showErrorMessage('Invalid workspace path');
        return;
      }

      const workspaceExplorer = getWorkspaceExplorer();
      const projectExplorer = getProjectExplorer();

      if (workspaceExplorer) {
        const selectedWorkspace = workspaceExplorer.getWorkspaceByPath(workspacePath);
        if (selectedWorkspace) {
          await workspaceExplorer.selectWorkspace(selectedWorkspace);
        } else {
          logger.warn('Workspace not found for path:', workspacePath);
          vscode.window.showWarningMessage('Workspace not found');
        }
      }

      if (projectExplorer && workspaceExplorer) {
        const selectedWorkspace = workspaceExplorer.getWorkspaceByPath(workspacePath);
        if (selectedWorkspace) {
          projectExplorer.setWorkspace(selectedWorkspace);
        }
      }

      try {
        const catalogService = ModulesCatalogService.getInstance();
        await catalogService.invalidateCache(workspacePath);
      } catch (error) {
        void error;
      }

      await vscode.commands.executeCommand('setContext', 'rapidkit:workspaceSelected', true);
      await vscode.commands.executeCommand('setContext', 'rapidkit:noProjects', false);

      if (WelcomePanel.currentPanel) {
        await WelcomePanel.refreshWorkspaceStatus();
        WelcomePanel.refreshRecentWorkspaces();
      }
    }),

    vscode.commands.registerCommand('rapidkit.addWorkspace', async () => {
      await getWorkspaceExplorer()?.addWorkspace();
    }),

    vscode.commands.registerCommand('rapidkit.importWorkspace', async () => {
      await getWorkspaceExplorer()?.importWorkspace();
    }),

    vscode.commands.registerCommand('rapidkit.removeWorkspace', async (item: any) => {
      const workspacePath = item?.path || item?.workspace?.path || item;
      if (workspacePath && typeof workspacePath === 'string') {
        const workspaceExplorer = getWorkspaceExplorer();
        if (workspaceExplorer) {
          const workspace = workspaceExplorer.getWorkspaceByPath(workspacePath);
          if (workspace) {
            await workspaceExplorer.removeWorkspace(workspace);
            WelcomePanel.refreshRecentWorkspaces();
          }
        }
      }
    }),

    vscode.commands.registerCommand('rapidkit.exportWorkspace', async (item: any) => {
      const workspaceExplorer = getWorkspaceExplorer();
      let workspace = item?.workspace;

      if (!workspace && item?.path && workspaceExplorer) {
        workspace = workspaceExplorer.getWorkspaceByPath(item.path);
      }

      if (workspace && workspaceExplorer) {
        await workspaceExplorer.exportWorkspace(workspace);
      }
    }),

    vscode.commands.registerCommand('rapidkit.discoverWorkspaces', async () => {
      await getWorkspaceExplorer()?.autoDiscover();
    }),

    vscode.commands.registerCommand('rapidkit.selectProject', async (item: any) => {
      const projectExplorer = getProjectExplorer();
      const moduleExplorer = getModuleExplorer();

      if (item?.project && projectExplorer) {
        projectExplorer.setSelectedProject(item.project);
        logger.info('Project selected:', item.project.name);

        WelcomePanel.updateWithProject(item.project.path, item.project.name);
        moduleExplorer?.setProjectPath(item.project.path, item.project.type);
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
  ];
}
