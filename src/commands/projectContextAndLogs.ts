import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { openProjectFolder, copyProjectPath, deleteProject } from './projectContextMenu';

export function registerProjectContextAndLogCommands(): vscode.Disposable[] {
  return [
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

    vscode.commands.registerCommand('rapidkit.openProjectDashboard', async (projectItem: any) => {
      vscode.window.showInformationMessage(
        `Dashboard for ${projectItem?.label ?? 'Project'} - Coming soon!`
      );
    }),

    vscode.commands.registerCommand('rapidkit.showLogs', () => {
      Logger.getInstance().show();
    }),

    vscode.commands.registerCommand('rapidkit.closeLogs', () => {
      Logger.getInstance().hide();
    }),

    vscode.commands.registerCommand('rapidkit.clearLogs', () => {
      Logger.getInstance().clear();
    }),
  ];
}
