import * as vscode from 'vscode';
import { Logger } from '../utils/logger';

type ProjectExplorerLike = {
  refresh: () => void;
};

export function registerFileManagementCommands(options: {
  logger: Logger;
  getProjectExplorer: () => ProjectExplorerLike | undefined;
}): vscode.Disposable[] {
  const { logger, getProjectExplorer } = options;

  return [
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
          getProjectExplorer()?.refresh();
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
          getProjectExplorer()?.refresh();
          logger.info(`Created new folder: ${folderPath}`);
          vscode.window.showInformationMessage(`Created folder: ${folderName}`, 'OK');
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
          getProjectExplorer()?.refresh();
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
          getProjectExplorer()?.refresh();
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
  ];
}
