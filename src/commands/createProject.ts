/**
 * Create Project Command
 * Interactive wizard for creating a new RapidKit project
 */

import * as vscode from 'vscode';
import { ProjectWizard } from '../ui/wizards/projectWizard';
import { Logger } from '../utils/logger';
import { WorkspaceManager } from '../core/workspaceManager';

export async function createProjectCommand(selectedWorkspacePath?: string) {
  const logger = Logger.getInstance();
  logger.info('Create Project command initiated');

  try {
    // Get the selected workspace path
    let workspaceRoot: string | undefined;
    
    if (selectedWorkspacePath) {
      // Use the provided workspace path (from UI)
      workspaceRoot = selectedWorkspacePath;
    } else {
      // Try to get from WorkspaceManager
      const workspaceManager = WorkspaceManager.getInstance();
      const workspaces = workspaceManager.getWorkspaces();
      
      if (workspaces.length === 0) {
        vscode.window.showErrorMessage('No RapidKit workspace found. Please create a workspace first.');
        return;
      }
      
      // If only one workspace, use it
      if (workspaces.length === 1) {
        workspaceRoot = workspaces[0].path;
      } else {
        // Let user select workspace
        const selected = await vscode.window.showQuickPick(
          workspaces.map(ws => ({
            label: ws.name,
            description: ws.path,
            workspace: ws,
          })),
          {
            placeHolder: 'Select workspace for the new project',
          }
        );
        
        if (!selected) {
          return;
        }
        
        workspaceRoot = selected.workspace.path;
      }
    }

    if (!workspaceRoot) {
      vscode.window.showErrorMessage('No workspace selected');
      return;
    }

    // Show wizard
    const wizard = new ProjectWizard();
    const config = await wizard.show();

    if (!config) {
      logger.info('Project creation cancelled by user');
      return;
    }

    // Execute with progress (like workspace creation)
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Creating ${config.name} project`,
        cancellable: false,
      },
      async (progress) => {
        progress.report({ increment: 0, message: 'Generating project...' });

        try {
          const { execa } = await import('execa');
          const path = require('path');
          const fs = require('fs-extra');
          
          progress.report({ increment: 30, message: 'Running RapidKit CLI...' });
          
          // Find Python RapidKit CLI installed in workspace
          const poetryRapidkit = path.join(workspaceRoot, '.venv', 'bin', 'rapidkit');
          const globalRapidkit = 'rapidkit';
          
          // Check which rapidkit command is available
          let rapidkitCmd = globalRapidkit;
          try {
            if (await fs.pathExists(poetryRapidkit)) {
              rapidkitCmd = poetryRapidkit;
              logger.info('Using Poetry-installed RapidKit:', poetryRapidkit);
            } else {
              logger.info('Using global RapidKit');
            }
          } catch (error) {
            logger.warn('Error checking RapidKit path, using global:', error);
          }
          
          // Build command args for Python RapidKit CLI
          const args = [
            'create',
            'project',
            config.kit,     // e.g., 'fastapi.minimal'
            config.name,    // e.g., 'my-project'
            '--skip-essentials', // Skip additional prompts
          ];

          // Add package manager for NestJS projects as a variable
          if (config.packageManager) {
            args.push('--variable', `package_manager=${config.packageManager}`);
          }
          
          logger.info('Running command:', rapidkitCmd, args.join(' '));
          
          const result = await execa(
            rapidkitCmd,
            args,
            {
              cwd: workspaceRoot,
              timeout: 120000,
              stdio: ['pipe', 'pipe', 'pipe'], // Allow stdin
              input: config.packageManager ? `${config.packageManager}\n\n\n` : '\n\n\n', // Send package manager + newlines
              reject: false,
              env: {
                ...process.env,
                PYTHONUNBUFFERED: '1', // Force immediate output
              },
            }
          );
          
          logger.info('RapidKit CLI stdout:', result.stdout);
          logger.info('RapidKit CLI stderr:', result.stderr);
          logger.info('RapidKit CLI exitCode:', result.exitCode);
          
          progress.report({ increment: 70, message: 'Verifying project...' });
          
          if (result.exitCode !== 0) {
            logger.error('RapidKit CLI failed:', result.stderr || result.stdout);
            throw new Error(`RapidKit CLI failed: ${result.stderr || result.stdout}`);
          }
          
          // Wait a moment for file system
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check if project was created (use actual project name)
          const projectPath = path.join(workspaceRoot, config.name);
          
          if (!(await fs.pathExists(projectPath))) {
            logger.error('Project not created. Output:', result.all || result.stdout);
            throw new Error(`Project was not created. The CLI might not support non-interactive mode properly.`);
          }
          
          progress.report({ increment: 90, message: 'Refreshing workspace...' });
          
          // Refresh project explorer
          await vscode.commands.executeCommand('rapidkit.refreshProjects');

          // Update workspace in manager
          const manager = WorkspaceManager.getInstance();
          await manager.updateWorkspace(workspaceRoot);
          await vscode.commands.executeCommand('rapidkit.refreshWorkspaces');

          progress.report({ increment: 100, message: 'Done!' });
          
          // Show success
          vscode.window.showInformationMessage(
            `✅ Project "${config.name}" created successfully!`
          );
        } catch (error: any) {
          logger.error('Failed to create project:', {
            message: error.message,
            stdout: error.stdout,
            stderr: error.stderr,
          });
          
          vscode.window.showErrorMessage(
            `Failed to create project: ${error.message}`
          );
        }
      }
    );

  } catch (error) {
    logger.error('Error in createProjectCommand', error);
    vscode.window.showErrorMessage(
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
