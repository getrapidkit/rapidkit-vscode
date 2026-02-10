/**
 * Create Workspace Command
 * Interactive wizard for creating a new RapidKit workspace
 */

import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { WorkspaceWizard } from '../ui/wizards/workspaceWizard';
import { Logger } from '../utils/logger';
import { parseRapidKitError, formatErrorMessage, logDetailedError } from '../utils/errorParser';
import { RapidKitCLI } from '../core/rapidkitCLI';
import { WorkspaceManager } from '../core/workspaceManager';
import { isFirstTimeSetup, showFirstTimeSetupMessage } from '../utils/firstTimeSetup';
import { updateWorkspaceMetadata } from '../utils/workspaceMarker';
import { WelcomePanel } from '../ui/panels/welcomePanel';
import { isPoetryInstalledCached } from '../utils/poetryHelper';
import { checkPythonEnvironmentCached } from '../utils/pythonChecker';

export async function createWorkspaceCommand(workspaceName?: string) {
  const logger = Logger.getInstance();
  logger.info(
    'Create Workspace command initiated',
    workspaceName ? `with name: ${workspaceName}` : ''
  );

  try {
    // Show progress notification while checking system requirements
    let pythonCheck: any;
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Preparing workspace creation',
        cancellable: false,
      },
      async (progress) => {
        progress.report({ increment: 0, message: 'Checking system requirements...' });

        // Check Python 3.10+ BEFORE Poetry (Python is more fundamental)
        logger.info('Checking for Python 3.10+ installation...');

        // Check if cache available
        const { requirementCache } = await import('../utils/requirementCache.js');
        const cacheStats = requirementCache.getStats();
        const pythonCached = cacheStats.pythonCached;

        progress.report({
          increment: 30,
          message: pythonCached ? 'Checking Python (cached)...' : 'Checking Python installation...',
        });

        pythonCheck = await checkPythonEnvironmentCached();

        if (!pythonCheck.available) {
          logger.error('Python not installed');
          progress.report({ increment: 100, message: 'Python not found' });
        }
      }
    );

    // Redirect to Setup Panel if Python is missing
    if (!pythonCheck.available) {
      logger.warn('Python not installed - redirecting to Setup Panel');

      vscode.window
        .showInformationMessage(
          '⚙️ Setup Required\n\n' +
            'Python 3.10+ is required to create workspaces. Opening setup panel...',
          'Open Setup'
        )
        .then((choice) => {
          if (choice === 'Open Setup') {
            vscode.commands.executeCommand('rapidkit.openSetup');
          }
        });

      // Also auto-open Setup Panel
      await vscode.commands.executeCommand('rapidkit.openSetup');
      return;
    }

    if (!pythonCheck.meetsMinimumVersion) {
      logger.warn('Python version too old - redirecting to Setup Panel');

      vscode.window
        .showWarningMessage(
          '⚙️ Python Upgrade Required\n\n' +
            `Found: ${pythonCheck.version}\n` +
            'Required: Python 3.10+\n\n' +
            'Opening setup panel for details...',
          'Open Setup'
        )
        .then((choice) => {
          if (choice === 'Open Setup') {
            vscode.commands.executeCommand('rapidkit.openSetup');
          }
        });

      await vscode.commands.executeCommand('rapidkit.openSetup');
      return;
    }

    if (!pythonCheck.venvSupport) {
      logger.warn('Python venv missing - redirecting to Setup Panel');

      vscode.window
        .showWarningMessage(
          '⚙️ Python venv Required\n\n' +
            `${pythonCheck.error}\n\n` +
            'Opening setup panel for installation guidance...',
          'Open Setup'
        )
        .then((choice) => {
          if (choice === 'Open Setup') {
            vscode.commands.executeCommand('rapidkit.openSetup');
          }
        });

      await vscode.commands.executeCommand('rapidkit.openSetup');
      return;
    }

    logger.info(`Python ${pythonCheck.version} is available with venv support`);

    // Check Poetry with progress
    let hasPoetry = false;
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Checking Poetry installation',
        cancellable: false,
      },
      async (progress) => {
        // Check if cache available
        const { requirementCache } = await import('../utils/requirementCache.js');
        const cacheStats = requirementCache.getStats();
        const poetryCached = cacheStats.poetryCached;

        progress.report({
          increment: 0,
          message: poetryCached ? 'Verifying Poetry (cached)...' : 'Verifying Poetry...',
        });
        logger.info('Checking for Poetry installation...');
        hasPoetry = await isPoetryInstalledCached();
        progress.report({
          increment: 100,
          message: hasPoetry ? 'Poetry found' : 'Poetry not found',
        });
      }
    );

    if (!hasPoetry) {
      logger.warn('Poetry not installed - redirecting to Setup Panel');

      vscode.window
        .showInformationMessage(
          '⚙️ Poetry Required\n\n' +
            'Poetry is required to create RapidKit workspaces.\n' +
            'Opening setup panel to install...',
          'Open Setup'
        )
        .then((choice) => {
          if (choice === 'Open Setup') {
            vscode.commands.executeCommand('rapidkit.openSetup');
          }
        });

      await vscode.commands.executeCommand('rapidkit.openSetup');
      return;
    }

    logger.info('Poetry is installed, proceeding with workspace creation');

    // Check if this is first-time setup and show guidance (only if name not provided from modal)
    if (!workspaceName) {
      const isFirstTime = await isFirstTimeSetup();
      if (isFirstTime) {
        logger.info('First-time setup detected, showing guidance');
        const shouldContinue = await showFirstTimeSetupMessage();
        if (!shouldContinue) {
          logger.info('User cancelled first-time setup');
          return;
        }
      }
    }

    // Get workspace configuration
    let config: any;

    if (workspaceName) {
      // Name provided from modal - skip wizard
      logger.info('Using provided workspace name:', workspaceName);
      const defaultPath = path.join(os.homedir(), 'RapidKit', 'rapidkits');
      config = {
        name: workspaceName,
        path: path.join(defaultPath, workspaceName),
        initGit: true,
      };
    } else {
      // Show wizard to collect user input
      const wizard = new WorkspaceWizard();
      config = await wizard.show();

      if (!config) {
        logger.info('Workspace creation cancelled by user');
        return;
      }
    }

    // Execute with progress
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Creating RapidKit workspace',
        cancellable: false,
      },
      async (progress) => {
        progress.report({
          increment: 0,
          message: 'Initializing... (First time setup may take 30-60 seconds)',
        });

        try {
          const cli = new RapidKitCLI();

          progress.report({ increment: 10, message: 'Preparing workspace directory...' });

          // Don't create the workspace directory here - let npm package handle it
          // Only ensure parent directory exists so npm package can create the workspace
          const parentDir = path.dirname(config.path);
          await fs.ensureDir(parentDir);
          logger.info('Parent directory ensured:', parentDir);

          // Check if it's a default location (~/.RapidKit/rapidkits/<name>)
          const homeDir = require('os').homedir();
          const defaultWorkspacePath = path.join(homeDir, 'RapidKit', 'rapidkits', config.name);
          const isDefaultLocation = config.path === defaultWorkspacePath;

          if (isDefaultLocation) {
            // Use npm package directly for default location
            progress.report({
              increment: 20,
              message: 'Setting up RapidKit CLI (downloading if needed)...',
            });

            const createResult = await cli.createWorkspace({
              name: config.name,
              parentPath: path.dirname(config.path),
              skipGit: !config.initGit,
            });

            // Check if creation was successful
            if (createResult.exitCode !== 0) {
              // Log detailed error information
              logDetailedError(
                createResult.stderr || '',
                createResult.stdout || '',
                createResult.exitCode
              );

              // Parse error for user-friendly message
              const parsedError = parseRapidKitError(
                createResult.stderr || '',
                createResult.stdout || ''
              );

              if (parsedError.canFallback) {
                logger.warn(`Workspace creation failed: ${parsedError.type} - offering fallback`);

                // Show informative message with fallback options
                const actions = ['View Details'];
                if (parsedError.type === 'core_missing') {
                  actions.unshift('Create Basic Workspace', 'Use Demo Mode');
                } else if (parsedError.canRetry) {
                  actions.unshift('Retry');
                }
                actions.push('Cancel');

                const choice = await vscode.window.showWarningMessage(
                  `⚠️ ${parsedError.title}\n\n${parsedError.message}\n\n` +
                    `⚠️ Fallback Option Available:\n` +
                    `• Creates basic workspace structure (marker + README)\n` +
                    `• Does NOT include Poetry setup or CLI tools\n` +
                    `• You'll need to install rapidkit npm package to create projects`,
                  { modal: true },
                  ...actions
                );

                if (choice === 'Create Basic Workspace') {
                  // Create basic workspace structure manually
                  await createBasicWorkspace(config.path, config.name, config.initGit);
                  logger.info('Basic workspace created as fallback');

                  // Show post-creation notification with action items
                  const installAction = 'Install npm Package';
                  const openReadme = 'Open README';
                  const selected = await vscode.window.showWarningMessage(
                    `⚠️ Basic Workspace Created\n\n` +
                      `This is a minimal workspace. To create projects:\n\n` +
                      `1️⃣ Install: npm install -g rapidkit\n` +
                      `2️⃣ Create projects with Extension commands\n\n` +
                      `⚠️ Note: Some features require rapidkit-core (not yet on PyPI)`,
                    installAction,
                    openReadme,
                    'OK'
                  );

                  if (selected === installAction) {
                    // Open terminal with install command
                    const terminal = vscode.window.createTerminal('Install RapidKit');
                    terminal.show();
                    terminal.sendText('npm install -g rapidkit');
                  } else if (selected === openReadme) {
                    const readmePath = path.join(config.path, 'README.md');
                    const doc = await vscode.workspace.openTextDocument(readmePath);
                    await vscode.window.showTextDocument(doc);
                  }

                  // Don't throw, continue to finalization
                } else if (choice === 'Use Demo Mode') {
                  vscode.window.showInformationMessage(
                    '💡 Demo Mode\n\n' +
                      'You can create standalone projects without a workspace using the npm package.\n\n' +
                      'Use "RapidKit: Create Project" from the command palette to get started.'
                  );
                  return;
                } else if (choice === 'Retry') {
                  // Retry the same operation
                  return createWorkspaceCommand();
                } else if (choice === 'View Details') {
                  // Show detailed error in output panel
                  const output = vscode.window.createOutputChannel('RapidKit Error');
                  output.clear();
                  output.appendLine(`# ${parsedError.title}\n`);
                  output.appendLine(parsedError.message);
                  output.appendLine(`\n## Suggestions\n${parsedError.suggestion}`);
                  output.appendLine(`\n## Technical Details\n`);
                  output.appendLine(`Exit Code: ${createResult.exitCode}`);
                  if (createResult.stderr) {
                    output.appendLine(`\nSTDERR:\n${createResult.stderr}`);
                  }
                  if (createResult.stdout) {
                    output.appendLine(`\nSTDOUT:\n${createResult.stdout}`);
                  }
                  output.show();
                  return;
                } else {
                  throw new Error('Workspace creation cancelled');
                }
              } else {
                // Non-recoverable error
                throw new Error(formatErrorMessage(parsedError));
              }
            }
          } else {
            // For custom paths, create directly in the target directory
            // IMPORTANT: Don't create in default location and move - this breaks virtualenv shebangs!
            progress.report({
              increment: 20,
              message: 'Setting up RapidKit CLI (downloading if needed)...',
            });

            const createResult = await cli.createWorkspace({
              name: config.name,
              parentPath: path.dirname(config.path), // Use actual parent path, not default
              skipGit: !config.initGit,
            });

            // Check if creation was successful
            if (createResult.exitCode !== 0) {
              const stderr = createResult.stderr || createResult.stdout || '';
              logger.error('Workspace creation failed', {
                exitCode: createResult.exitCode,
                stderr,
              });

              throw new Error(`Workspace creation failed: ${stderr || 'Unknown error'}`);
            }

            logger.info('Workspace created directly at custom path (no move needed)');
          }

          logger.info('Workspace creation via npm package completed');

          progress.report({ increment: 50, message: 'Finalizing workspace...' });

          // Note: We skip detailed validation here because:
          // 1. npm package already validates during creation
          // 2. Poetry venvs may not be immediately ready for inspection
          // 3. The marker file existence is sufficient proof of successful creation

          logger.info('Workspace creation successful (validation skipped - npm handles it)');

          progress.report({ increment: 65, message: 'Verifying workspace...' });

          // Verify workspace was created
          const workspaceExists = await fs.pathExists(config.path);
          if (!workspaceExists) {
            throw new Error(`Workspace directory not created at ${config.path}`);
          }

          // Check for workspace marker (.rapidkit directory)
          const rapidkitDir = path.join(config.path, '.rapidkit');
          const rapidkitDirExists = await fs.pathExists(rapidkitDir);

          if (!rapidkitDirExists) {
            logger.warn('Workspace created but .rapidkit directory not found');
          }

          // Verify workspace marker exists (created by npm package)
          const markerPath = path.join(config.path, '.rapidkit-workspace');
          if (!(await fs.pathExists(markerPath))) {
            logger.warn('Workspace marker not found - npm package should have created it');
          } else {
            // Add VS Code metadata to the marker
            const { getExtensionVersion } = await import('../utils/constants.js');
            await updateWorkspaceMetadata(config.path, {
              vscode: {
                extensionVersion: getExtensionVersion(),
                createdViaExtension: true,
                lastOpenedAt: new Date().toISOString(),
                openCount: 1,
              },
            });
            logger.info('Workspace marker verified and VS Code metadata added');
          }

          progress.report({ increment: 80, message: 'Registering workspace...' });

          // Add workspace to manager
          const workspaceManager = WorkspaceManager.getInstance();
          await workspaceManager.addWorkspace(config.path);

          progress.report({ increment: 90, message: 'Refreshing views...' });

          // Wait for file system sync
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Refresh workspace explorer
          await vscode.commands.executeCommand('rapidkit.refreshWorkspaces');

          progress.report({ increment: 100, message: 'Complete!' });

          // Check if this was a fallback workspace
          const fallbackMarkerPath = path.join(config.path, '.rapidkit-workspace');
          let isFallback = false;
          try {
            const markerData = await fs.readJSON(fallbackMarkerPath);
            isFallback = markerData.fallbackMode === true;
          } catch {
            // Marker doesn't exist or invalid
          }

          // Show success message with appropriate actions
          const openAction = 'Open Workspace';
          const docsAction = 'View Docs';
          const installNpmAction = isFallback ? 'Install npm Package' : null;

          const actions = [openAction, docsAction];
          if (installNpmAction) {
            actions.unshift(installNpmAction);
          }
          actions.push('Close');

          let message =
            `✅ Workspace "${config.name}" created successfully!\n\n` +
            `📁 Location: ${config.path}\n`;

          if (isFallback) {
            message +=
              `\n⚠️ Note: This is a basic workspace (fallback mode)\n` +
              `To create projects, install: npm install -g rapidkit\n` +
              `See README.md for full setup instructions`;
          } else {
            message += `💡 Tip: Add projects with \`rapidkit create\` or use Extension commands`;
          }

          const selected = await vscode.window.showInformationMessage(message, ...actions);

          if (selected === 'Install npm Package') {
            // Open terminal with install command
            const terminal = vscode.window.createTerminal('Install RapidKit');
            terminal.show();
            terminal.sendText('npm install -g rapidkit');

            // Also open README for reference
            const readmePath = path.join(config.path, 'README.md');
            if (await fs.pathExists(readmePath)) {
              const doc = await vscode.workspace.openTextDocument(readmePath);
              await vscode.window.showTextDocument(doc, { preview: false });
            }
          } else if (selected === openAction) {
            const workspaceUri = vscode.Uri.file(config.path);
            await vscode.commands.executeCommand('vscode.openFolder', workspaceUri, {
              forceNewWindow: false,
            });
          } else if (selected === docsAction) {
            await vscode.env.openExternal(vscode.Uri.parse('https://getrapidkit.com/docs'));
          }

          // Refresh welcome page if it's open
          const context = (global as any).extensionContext;
          if (context) {
            WelcomePanel.refreshRecentWorkspaces();
          }
        } catch (error) {
          logger.error('Failed to create workspace', error);

          const errorMessage = error instanceof Error ? error.message : String(error);
          const helpAction = 'Get Help';
          const selected = await vscode.window.showErrorMessage(
            `Failed to create workspace: ${errorMessage}`,
            helpAction,
            'Close'
          );

          if (selected === helpAction) {
            await vscode.env.openExternal(
              vscode.Uri.parse('https://getrapidkit.com/docs/troubleshooting')
            );
          }
        }
      }
    );
  } catch (error) {
    logger.error('Error in createWorkspaceCommand', error);
    vscode.window.showErrorMessage(
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Create a basic workspace structure when RapidKit Core is not available
 * This fallback creates a structure compatible with npm package workspace
 * Should be as close as possible to the real workspace structure
 */
async function createBasicWorkspace(workspacePath: string, name: string, initGit: boolean) {
  const logger = Logger.getInstance();

  try {
    // Ensure workspace directory exists
    await fs.ensureDir(workspacePath);

    // 1. Create .rapidkit directory
    const rapidkitDir = path.join(workspacePath, '.rapidkit');
    await fs.ensureDir(rapidkitDir);
    logger.info('Created .rapidkit directory');

    // 2. Create .rapidkit/config.json (same as npm package)
    const { getExtensionVersion } = await import('../utils/constants.js');
    const config = {
      workspace_name: name,
      author: 'user',
      rapidkit_version: getExtensionVersion(),
      created_at: new Date().toISOString(),
      type: 'workspace',
      fallbackMode: true, // Indicates fallback creation
    };
    await fs.writeJSON(path.join(rapidkitDir, 'config.json'), config, { spaces: 2 });
    logger.info('Created .rapidkit/config.json');

    // 3. Create .rapidkit-workspace marker (for Extension compatibility)
    const markerPath = path.join(workspacePath, '.rapidkit-workspace');
    const { MARKERS } = await import('../utils/constants.js');

    await fs.writeJSON(
      markerPath,
      {
        signature: MARKERS.WORKSPACE_SIGNATURE,
        createdBy: MARKERS.CREATED_BY_VSCODE,
        version: getExtensionVersion(),
        createdAt: new Date().toISOString(),
        name,
        engine: 'npm-fallback', // Indicates fallback mode but npm-compatible structure
        fallbackMode: true,
      },
      { spaces: 2 }
    );
    logger.info('Created .rapidkit-workspace marker');

    // 4. Create rapidkit CLI script (shell script for Unix)
    const cliScriptPath = path.join(workspacePath, 'rapidkit');
    const cliScript = `#!/usr/bin/env bash
#
# RapidKit CLI - Fallback workspace wrapper
# This workspace was created without RapidKit Python Core
#
# To use RapidKit features:
#   1. Install: npm install -g rapidkit
#   2. Run: npx rapidkit <command>
#

set -e

echo "⚠️  This is a fallback workspace created without RapidKit Core"
echo ""
echo "To create projects:"
echo "  1. Install npm package: npm install -g rapidkit"
echo "  2. Create project: npx rapidkit create project fastapi.standard my-api --output ."
echo ""
echo "Or use VS Code Extension: 'RapidKit: Create Project'"
echo ""
`;
    await fs.writeFile(cliScriptPath, cliScript, { mode: 0o755 });
    logger.info('Created rapidkit CLI script');

    // 5. Create README.md (comprehensive guide)
    const readmePath = path.join(workspacePath, 'README.md');
    const readmeContent = `# ${name}

> ⚠️ **NOTICE**: This workspace was created in **fallback mode** without RapidKit Python Core

## 🔄 Workspace Structure

This workspace follows the standard RapidKit structure but requires manual setup:

\`\`\`
${name}/
├── rapidkit              # CLI wrapper (requires npm package)
├── .rapidkit/            # Workspace configuration
│   └── config.json       # Workspace settings
├── .rapidkit-workspace   # Workspace marker (for VS Code Extension)
├── README.md             # This file
├── .gitignore            # Git ignore rules
└── [your-projects]/      # Add projects here
\`\`\`

## ⚠️ Limitations

**Missing Components:**
- ❌ RapidKit Python Core (not yet on PyPI)
- ❌ Templates directory (.rapidkit/templates/)
- ❌ Full CLI functionality

**What Works:**
- ✅ Workspace detection in VS Code Extension
- ✅ Manual project creation
- ✅ npm package integration

## 🚀 Quick Start

### Option 1: Use npm Package (Recommended)

1. **Install RapidKit npm package:**
   \`\`\`bash
   npm install -g rapidkit
   \`\`\`

2. **Verify installation:**
   \`\`\`bash
   rapidkit --version
   \`\`\`

3. **Create projects:**
   \`\`\`bash
   # FastAPI project
   npx rapidkit create project fastapi.standard my-api --output .
   
   # NestJS project
   npx rapidkit create project nestjs.standard my-app --output .
   \`\`\`

4. **Or use VS Code Extension:**
   - Open Command Palette (\`Ctrl+Shift+P\`)
   - Run: \`RapidKit: Create Project\`
   - Select this workspace

### Option 2: Manual Project Setup

Create projects manually following standard structures:

**FastAPI Project:**
\`\`\`bash
mkdir my-api && cd my-api
poetry init --name my-api --python "^3.10"
poetry add fastapi uvicorn
# Add your code
\`\`\`

**NestJS Project:**
\`\`\`bash
npx @nestjs/cli new my-app
cd my-app
npm install
# Add your code
\`\`\`

### Option 3: Wait for Full Release

When \`rapidkit-core\` is published to PyPI:

\`\`\`bash
# Install Python Core
pip install rapidkit-core

# Re-create workspace with full features
rapidkit ${name}

# Move projects to new workspace
mv ${name}/* new-workspace/
\`\`\`

## 📚 Available Templates

| Template | Stack | Description |
|----------|-------|-------------|
| \`fastapi.standard\` | Python + FastAPI | High-performance Python API |
| \`nestjs.standard\` | TypeScript + NestJS | Enterprise Node.js framework |

## 🛠️ Commands

With npm package installed:

\`\`\`bash
# Create project in workspace
npx rapidkit create project <template> <name> --output .

# Examples
npx rapidkit create project fastapi.standard my-api --output .
npx rapidkit create project nestjs.standard my-app --output .
\`\`\`

## 🆘 Need Help?

- 📖 Documentation: https://getrapidkit.com/docs
- 💬 GitHub Issues: https://github.com/yourusername/rapidkit
- 🔧 VS Code Extension: Run \`RapidKit: Run System Check\`

## 🔄 Upgrade to Full Workspace

To upgrade when RapidKit Core becomes available:

1. **Install rapidkit-core:**
   \`\`\`bash
   pip install rapidkit-core
   \`\`\`

2. **Create new workspace:**
   \`\`\`bash
   rapidkit new-workspace
   \`\`\`

3. **Migrate projects:**
   \`\`\`bash
   mv ${name}/* new-workspace/
   \`\`\`

4. **Or continue using this workspace** with npm package

---

**Created:** ${new Date().toISOString()}  
**Mode:** Fallback (npm-compatible structure)  
**Created By:** VS Code RapidKit Extension  
**Structure Version:** Compatible with rapidkit npm v0.16.x
`;
    await fs.writeFile(readmePath, readmeContent);
    logger.info('Created README.md');

    // 6. Create .gitignore (same as npm package)
    const gitignorePath = path.join(workspacePath, '.gitignore');
    const gitignoreContent = `# RapidKit workspace
.env
.env.*
!.env.example

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
.venv/
ENV/
build/
dist/
*.egg-info/

# Node
node_modules/
npm-debug.log
yarn-error.log
.npm/
.yarn/

# IDEs
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
*.log

# RapidKit
.rapidkit/templates/
`;
    await fs.writeFile(gitignorePath, gitignoreContent);
    logger.info('Created .gitignore');

    // 7. Initialize git if requested (same as npm package)
    if (initGit) {
      try {
        const { execa } = await import('execa');
        await execa('git', ['init'], { cwd: workspacePath });
        await execa('git', ['add', '.'], { cwd: workspacePath });
        await execa('git', ['commit', '-m', 'Initial commit: RapidKit workspace (fallback mode)'], {
          cwd: workspacePath,
        });
        logger.info('Initialized git repository');
      } catch (gitError) {
        logger.warn('Failed to initialize git:', gitError);
      }
    }

    logger.info('Basic workspace created successfully with npm-compatible structure');
  } catch (error) {
    logger.error('Failed to create basic workspace:', error);
    throw error;
  }
}
