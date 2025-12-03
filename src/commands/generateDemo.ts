/**
 * Generate Demo Command
 * Generate a demo FastAPI project
 */

import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import * as path from 'path';
import * as fs from 'fs-extra';

export async function generateDemoCommand(workspace?: { path: string; mode: string }) {
  const logger = Logger.getInstance();
  logger.info('Generate Demo command initiated');

  try {
    // If no workspace provided, try to get the selected workspace from context
    let targetWorkspace = workspace;

    if (!targetWorkspace) {
      // Try to get from rapidkit.selectedWorkspace context
      const workspaceData = await vscode.commands.executeCommand('rapidkit.getSelectedWorkspace');
      if (workspaceData && typeof workspaceData === 'object') {
        targetWorkspace = workspaceData as { path: string; mode: string };
        logger.info('Retrieved workspace from context', targetWorkspace);
      }
    }

    // Get project name
    const projectName = await vscode.window.showInputBox({
      prompt: 'Enter project name',
      placeHolder: 'my-demo-project',
      validateInput: (value) => {
        if (!value) {
          return 'Project name is required';
        }
        if (!/^[a-z][a-z0-9-]*$/.test(value)) {
          return 'Use lowercase letters, numbers, and hyphens only';
        }
        return null;
      },
    });

    if (!projectName) {
      return;
    }

    // Determine destination path
    let destinationPath: string;
    let isDemoWorkspace = false;

    // If workspace is provided/retrieved and is demo mode, use it directly
    if (targetWorkspace && targetWorkspace.mode === 'demo') {
      destinationPath = targetWorkspace.path;
      isDemoWorkspace = true;
      logger.info(`Using demo workspace: ${destinationPath}`);
    } else if (targetWorkspace) {
      // Use regular workspace path
      destinationPath = targetWorkspace.path;
      isDemoWorkspace = await fs.pathExists(path.join(destinationPath, 'generate-demo.js'));
      logger.info(`Using workspace: ${destinationPath}, isDemoWorkspace: ${isDemoWorkspace}`);
    } else {
      // Get destination folder from user
      logger.warn('No workspace selected - asking user to select destination');
      const folderUri = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Select Destination',
        title: 'Select destination folder for demo project',
      });

      if (!folderUri || folderUri.length === 0) {
        logger.info('User cancelled folder selection');
        return;
      }

      destinationPath = folderUri[0].fsPath;
      logger.info(`User selected destination: ${destinationPath}`);

      // Check if selected folder is a demo workspace
      isDemoWorkspace = await fs.pathExists(path.join(destinationPath, 'generate-demo.js'));
      logger.info(`Is demo workspace: ${isDemoWorkspace}`);
    }

    // Generate with progress
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Generating demo project: ${projectName}`,
        cancellable: false,
      },
      async (progress) => {
        progress.report({ increment: 0, message: 'Creating project structure...' });

        try {
          if (isDemoWorkspace) {
            // Use generate-demo.js script from demo workspace
            logger.info('Using demo workspace generate-demo.js script');

            try {
              // Update progress
              progress.report({ increment: 50, message: 'Running generator...' });

              logger.info(`Executing: node generate-demo.js ${projectName} in ${destinationPath}`);

              // Execute synchronously to ensure it completes and capture output for debugging
              // Provide non-interactive stdin answers so the RapidKit CLI doesn't block on prompts
              const execOptions = { cwd: destinationPath, encoding: 'utf-8' } as const;
              const snakeName = projectName.replace(/-/g, '_');
              const authorName = process.env.USER || '';
              const description = 'FastAPI service generated with RapidKit';
              const inputPayload = `${snakeName}\n${authorName}\n${description}\n`;
              try {
                const stdout = require('child_process').execSync(
                  `node generate-demo.js ${projectName}`,
                  { ...execOptions, stdio: 'pipe', input: inputPayload }
                );
                logger.info('Generator stdout (demo workspace):', { output: String(stdout) });
              } catch (childErr: any) {
                // capture stderr if present
                try {
                  const out = childErr.stdout ? String(childErr.stdout) : undefined;
                  const err = childErr.stderr ? String(childErr.stderr) : undefined;
                  logger.error('Generator failed (demo workspace) - stdout:', out);
                  logger.error('Generator failed (demo workspace) - stderr:', err);
                } catch {
                  // Ignore errors when accessing stdout/stderr
                }
                throw childErr;
              }

              // Verify project was created
              const projectDir = path.join(destinationPath, projectName);
              const projectExists = await fs.pathExists(projectDir);
              logger.info(`Project directory exists after generation: ${projectExists}`, {
                path: projectDir,
              });
              if (!projectExists) {
                throw new Error(`Project directory was not created at ${projectDir}`);
              }

              logger.info('Demo project generated successfully');
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              logger.error('Failed to generate demo project with generate-demo.js', error);
              throw new Error(`Generator failed: ${errorMsg}`);
            }
          } else {
            // Use rapidkit CLI with --demo-only flag
            logger.info('Using rapidkit CLI with --demo-only');

            try {
              // Update progress
              progress.report({ increment: 50, message: 'Running RapidKit CLI...' });

              logger.info(
                `Executing: npx rapidkit "${projectName}" --demo-only in ${destinationPath}`
              );

              // Execute synchronously and capture output for debugging
              const execOptions = { cwd: destinationPath, encoding: 'utf-8' } as const;
              try {
                // Provide the same non-interactive answers to the CLI in case it prompts
                const snakeName = projectName.replace(/-/g, '_');
                const authorName = process.env.USER || '';
                const description = 'FastAPI service generated with RapidKit';
                const inputPayload = `${snakeName}\n${authorName}\n${description}\n`;
                const stdout = require('child_process').execSync(
                  `npx rapidkit "${projectName}" --demo-only`,
                  { ...execOptions, stdio: 'pipe', input: inputPayload }
                );
                logger.info('RapidKit CLI stdout:', { output: String(stdout) });
              } catch (childErr: any) {
                try {
                  const out = childErr.stdout ? String(childErr.stdout) : undefined;
                  const err = childErr.stderr ? String(childErr.stderr) : undefined;
                  logger.error('RapidKit CLI failed - stdout:', out);
                  logger.error('RapidKit CLI failed - stderr:', err);
                } catch {
                  // Ignore errors when accessing stdout/stderr
                }
                throw childErr;
              }

              // Verify project was created
              const projectDir = path.join(destinationPath, projectName);
              const projectExists = await fs.pathExists(projectDir);
              logger.info(`Project directory exists after generation: ${projectExists}`, {
                path: projectDir,
              });
              if (!projectExists) {
                throw new Error(`Project directory was not created at ${projectDir}`);
              }

              logger.info('Demo project generated successfully via CLI');
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              logger.error('Failed to generate demo project via CLI', error);
              throw new Error(`RapidKit CLI failed: ${errorMsg}`);
            }
          }

          progress.report({ increment: 100, message: 'Done!' });

          const projectPath = path.join(destinationPath, projectName);

          // Show success with actions
          const openAction = 'Open Project';
          const openFolderAction = 'Open in New Window';
          const selected = await vscode.window.showInformationMessage(
            `✅ Demo project "${projectName}" created successfully!`,
            openAction,
            openFolderAction,
            'Close'
          );

          if (selected === openAction) {
            const uri = vscode.Uri.file(projectPath);
            await vscode.commands.executeCommand('vscode.openFolder', uri, false);
          } else if (selected === openFolderAction) {
            const uri = vscode.Uri.file(projectPath);
            await vscode.commands.executeCommand('vscode.openFolder', uri, true);
          }
        } catch (error) {
          logger.error('Failed to generate demo project', error);
          vscode.window.showErrorMessage(
            `Failed to generate demo project: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    );
  } catch (error) {
    logger.error('Error in generateDemoCommand', error);
    vscode.window.showErrorMessage(
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
