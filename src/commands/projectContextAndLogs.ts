import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { openProjectFolder, copyProjectPath, deleteProject } from './projectContextMenu';

export function registerProjectContextAndLogCommands(): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand('workspai.openProjectFolder', async (item: any) => {
      const projectPath = item?.project?.path || item?.projectPath;
      if (projectPath) {
        await openProjectFolder(projectPath);
      }
    }),

    vscode.commands.registerCommand('workspai.copyProjectPath', async (item: any) => {
      const projectPath = item?.project?.path || item?.projectPath;
      if (projectPath) {
        await copyProjectPath(projectPath);
      }
    }),

    vscode.commands.registerCommand('workspai.deleteProject', async (item: any) => {
      const projectPath = item?.project?.path || item?.projectPath;
      if (projectPath) {
        await deleteProject(projectPath);
      }
    }),

    vscode.commands.registerCommand('workspai.openProjectDashboard', async (projectItem: any) => {
      vscode.window.showInformationMessage(
        `Dashboard for ${projectItem?.label ?? 'Project'} - Coming soon!`
      );
    }),

    vscode.commands.registerCommand('workspai.showLogs', () => {
      Logger.getInstance().show();
    }),

    vscode.commands.registerCommand('workspai.closeLogs', () => {
      Logger.getInstance().hide();
    }),

    vscode.commands.registerCommand('workspai.clearLogs', () => {
      Logger.getInstance().clear();
    }),
  ];
}
