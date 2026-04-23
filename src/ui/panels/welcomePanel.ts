/**
 * Welcome Panel - React Version
 * Uses React for webview UI with postMessage communication
 */

import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { WorkspaceManager } from '../../core/workspaceManager';
import { ModulesCatalogService } from '../../core/modulesCatalogService';
import { CoreVersionService } from '../../core/coreVersionService';
import { ExamplesService } from '../../core/examplesService';
import { KitsService } from '../../core/kitsService';
import { MODULES, ModuleData } from '../../data/modules';
import { runningServers } from '../../extension';
import { run } from '../../utils/exec';
import { getWorkspaceVenvRapidkitCandidates } from '../../utils/platformCapabilities';
import { isPoetryInstalledCached } from '../../utils/poetryHelper';
import { checkPythonEnvironmentCached } from '../../utils/pythonChecker';
import {
  runCommandsInTerminal,
  runRapidkitCommandsInTerminal,
  runShellCommandInTerminal,
} from '../../utils/terminalExecutor';
import { WorkspaceUsageTracker } from '../../utils/workspaceUsageTracker';
import type { WorkspaceExplorerProvider } from '../treeviews/workspaceExplorer';

export class WelcomePanel {
  private static readonly UI_PREFS_KEY = 'rapidkit.welcome.uiPreferences';
  public static currentPanel: WelcomePanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _aiQueryTokenSource?: vscode.CancellationTokenSource;
  private _activeAIQueryRequestId?: number;
  private static _selectedProject: { name: string; path: string } | null = null;
  private _modulesCatalog: ModuleData[] = MODULES;
  private static _workspaceExplorer: WorkspaceExplorerProvider | undefined;
  /** Framework name queued to open as a modal after the webview becomes ready */
  private static _pendingModal: string | null = null;
  private static _pendingAICreateMode: 'workspace' | 'project' = 'workspace';
  /** Module data queued to show as install modal after webview becomes ready */
  private static _pendingModuleModal: any | null = null;
  /** AI modal context queued to show after webview becomes ready */
  private static _pendingAIModal: import('../../core/aiService').AIModalContext | null = null;
  /** Cached extension context so static methods can open the panel */
  private static _extensionContext: vscode.ExtensionContext | undefined;

  /**
   * Open the welcome panel and immediately trigger the Create Project modal
   * for the given framework. Safe to call whether the panel is open or not.
   */
  public static openProjectModal(
    context: vscode.ExtensionContext,
    framework: 'fastapi' | 'nestjs' | 'go'
  ): void {
    WelcomePanel._pendingModal = framework;
    WelcomePanel.createOrShow(context);
    // If the panel was already visible the 'ready' event won't fire again,
    // so also try posting directly after a short delay.
    setTimeout(() => {
      if (WelcomePanel._pendingModal && WelcomePanel.currentPanel) {
        WelcomePanel._pendingModal = null;
        WelcomePanel.currentPanel._panel.webview.postMessage({
          command: 'openProjectModal',
          data: { framework },
        });
      }
    }, 350);
  }

  /**
   * Open the welcome panel and immediately trigger the Create Workspace modal.
   * Safe to call whether the panel is open or not.
   */
  /**
   * Open the welcome panel and immediately show the module install modal.
   * Safe to call whether the panel is open or not.
   */
  public static showModuleInstallModal(moduleData: any): void {
    const context = WelcomePanel._extensionContext;
    if (!context) {
      return;
    }
    WelcomePanel._pendingModuleModal = moduleData;
    WelcomePanel.createOrShow(context);
    // If panel was already visible the 'ready' event won't fire again — post directly after short delay
    setTimeout(() => {
      if (WelcomePanel._pendingModuleModal && WelcomePanel.currentPanel) {
        const data = WelcomePanel._pendingModuleModal;
        WelcomePanel._pendingModuleModal = null;
        WelcomePanel.currentPanel._panel.webview.postMessage({
          command: 'openModuleInstallModal',
          data,
        });
      }
    }, 350);
  }

  /**
   * Open the welcome panel and immediately show the AI assistant modal for a given context.
   */
  public static showAIModal(
    context: vscode.ExtensionContext,
    aiContext: import('../../core/aiService').AIModalContext
  ): void {
    WelcomePanel._pendingAIModal = aiContext;
    WelcomePanel._extensionContext = context;
    WelcomePanel.createOrShow(context);
    setTimeout(() => {
      if (WelcomePanel._pendingAIModal && WelcomePanel.currentPanel) {
        const data = WelcomePanel._pendingAIModal;
        WelcomePanel._pendingAIModal = null;
        WelcomePanel.currentPanel._panel.webview.postMessage({
          command: 'openAIModal',
          data,
        });
      }
    }, 350);
  }

  public static openWorkspaceModal(context: vscode.ExtensionContext): void {
    WelcomePanel._pendingModal = '__workspace__';
    WelcomePanel.createOrShow(context);
    setTimeout(() => {
      if (WelcomePanel._pendingModal === '__workspace__' && WelcomePanel.currentPanel) {
        WelcomePanel._pendingModal = null;
        WelcomePanel.currentPanel._panel.webview.postMessage({
          command: 'openWorkspaceModal',
        });
      }
    }, 350);
  }

  /**
   * Open the welcome panel and immediately show the AI Create modal (workspace mode).
   * Called from the sidebar Quick Actions "Create with AI" button.
   */
  public static openAICreateModal(
    context: vscode.ExtensionContext,
    mode: 'workspace' | 'project' = 'workspace'
  ): void {
    WelcomePanel._pendingModal = '__ai_create__';
    WelcomePanel._pendingAICreateMode = mode;
    WelcomePanel.createOrShow(context);
    setTimeout(() => {
      if (WelcomePanel._pendingModal === '__ai_create__' && WelcomePanel.currentPanel) {
        WelcomePanel._pendingModal = null;
        const selectedWs =
          mode === 'project' ? WelcomePanel._workspaceExplorer?.getSelectedWorkspace() : undefined;
        WelcomePanel.currentPanel._panel.webview.postMessage({
          command: 'openAICreateModal',
          data: {
            mode,
            targetWorkspaceName: selectedWs?.name,
            targetWorkspacePath: selectedWs?.path,
          },
        });
      }
    }, 350);
  }

  /**
   * Set workspace explorer reference (called from extension.ts)
   */
  public static setWorkspaceExplorer(explorer: WorkspaceExplorerProvider) {
    WelcomePanel._workspaceExplorer = explorer;
  }

  public static setExtensionContext(context: vscode.ExtensionContext) {
    WelcomePanel._extensionContext = context;
  }

  /**
   * Called from extension.ts when user selects a project in the sidebar tree view
   */
  public static async updateWithProject(projectPath: string, projectName: string) {
    console.log('[WelcomePanel] updateWithProject called:', projectName, projectPath);

    WelcomePanel._selectedProject = { name: projectName, path: projectPath };

    if (WelcomePanel.currentPanel) {
      const installedModules = await WelcomePanel._readInstalledModules(projectPath);
      console.log('[WelcomePanel] Found', installedModules.length, 'installed modules');

      // Check if server is running and extract port
      let isRunning = false;
      let runningPort: number | undefined;
      const runningTerminal = runningServers.get(projectPath);
      if (runningTerminal) {
        isRunning = true;
        // Extract port from terminal name like "🚀 project [:8001]"
        const match = runningTerminal.name.match(/:([0-9]+)/);
        if (match) {
          runningPort = parseInt(match[1], 10);
          console.log('[WelcomePanel] Server running on port:', runningPort);
        }
      }

      // Detect project type for UI adaptation (e.g., hide modules for Go)
      const projectType = await WelcomePanel._detectProjectTypeStatic(projectPath);

      WelcomePanel.currentPanel._panel.webview.postMessage({
        command: 'updateWorkspaceStatus',
        data: {
          hasWorkspace: true,
          hasProjectSelected: true,
          workspaceName: projectName,
          workspacePath: projectPath,
          projectType: projectType ?? undefined,
          installedModules,
          isRunning,
          runningPort,
        },
      });
      console.log('[WelcomePanel] ✅ Workspace status sent to webview');

      // Refresh modules catalog to get correct versions for the new project
      await WelcomePanel.currentPanel._refreshModulesCatalog();
      console.log('[WelcomePanel] ✅ Modules catalog refreshed for project switch');
    } else {
      console.log('[WelcomePanel] ❌ No currentPanel - stored for later');
    }
  }

  /**
   * Clear selected project
   */
  public static clearSelectedProject() {
    console.log('[WelcomePanel] clearSelectedProject called');
    WelcomePanel._selectedProject = null;

    if (WelcomePanel.currentPanel) {
      const selectedWorkspace = WelcomePanel._workspaceExplorer?.getSelectedWorkspace();
      WelcomePanel.currentPanel._panel.webview.postMessage({
        command: 'updateWorkspaceStatus',
        data: {
          hasWorkspace: Boolean(selectedWorkspace),
          hasProjectSelected: false,
          workspaceName: selectedWorkspace?.name,
          workspacePath: selectedWorkspace?.path,
          installedModules: [],
        },
      });
    }
  }

  /**
   * Refresh recent workspaces list in React panel
   */
  public static refreshRecentWorkspaces() {
    if (WelcomePanel.currentPanel) {
      WelcomePanel.currentPanel._sendRecentWorkspaces();
    }
  }

  /**
   * Refresh workspace status (installed modules) after module installation
   */
  public static async refreshWorkspaceStatus() {
    if (WelcomePanel.currentPanel) {
      await WelcomePanel.currentPanel._sendWorkspaceStatus();
      // Also refresh modules catalog to get latest versions
      await WelcomePanel.currentPanel._refreshModulesCatalog();
    }
  }

  private _getSelectedWorkspaceInfo(): { name: string; path: string } | null {
    const ws = WelcomePanel._workspaceExplorer?.getSelectedWorkspace();
    if (!ws) {
      return null;
    }
    return { name: ws.name, path: ws.path };
  }

  /**
   * Read installed modules from registry.json
   */
  private static async _readInstalledModules(
    projectPath: string
  ): Promise<{ slug: string; version: string; display_name: string }[]> {
    try {
      const primaryRegistryPath = path.join(projectPath, 'registry.json');
      const legacyRegistryPath = path.join(projectPath, '.rapidkit', 'registry.json');

      const primaryExists = await fs.pathExists(primaryRegistryPath);
      const legacyExists = await fs.pathExists(legacyRegistryPath);

      const registryPath = primaryExists ? primaryRegistryPath : legacyRegistryPath;
      const exists = primaryExists || legacyExists;

      if (exists) {
        const content = await fs.readFile(registryPath, 'utf-8');
        const registry = JSON.parse(content);
        return registry.installed_modules || [];
      }
    } catch (error) {
      console.error('[WelcomePanel] Error reading registry.json:', error);
    }
    return [];
  }

  private _context: vscode.ExtensionContext;

  private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    this._panel = panel;
    this._context = context;

    // Set webview content
    this._panel.webview.html = this._getHtmlContent(context);

    // Handle messages from webview
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'ready':
            // Send initial data to webview
            this._sendInitialData();
            // If a modal was queued (e.g. triggered from sidebar), open it now
            if (WelcomePanel._pendingModal) {
              const pending = WelcomePanel._pendingModal;
              WelcomePanel._pendingModal = null;
              setTimeout(() => {
                if (pending === '__workspace__') {
                  this._panel.webview.postMessage({ command: 'openWorkspaceModal' });
                } else if (pending === '__ai_create__') {
                  const selectedWs =
                    WelcomePanel._pendingAICreateMode === 'project'
                      ? WelcomePanel._workspaceExplorer?.getSelectedWorkspace()
                      : undefined;
                  this._panel.webview.postMessage({
                    command: 'openAICreateModal',
                    data: {
                      mode: WelcomePanel._pendingAICreateMode,
                      targetWorkspaceName: selectedWs?.name,
                      targetWorkspacePath: selectedWs?.path,
                    },
                  });
                } else {
                  this._panel.webview.postMessage({
                    command: 'openProjectModal',
                    data: { framework: pending },
                  });
                }
              }, 300);
            }
            // If a module install modal was queued (e.g. triggered from sidebar), open it now
            if (WelcomePanel._pendingModuleModal) {
              const moduleData = WelcomePanel._pendingModuleModal;
              WelcomePanel._pendingModuleModal = null;
              setTimeout(() => {
                this._panel.webview.postMessage({
                  command: 'openModuleInstallModal',
                  data: moduleData,
                });
              }, 300);
            }
            // If an AI modal was queued (triggered from tree view inline button), open it now
            if (WelcomePanel._pendingAIModal) {
              const aiCtx = WelcomePanel._pendingAIModal;
              WelcomePanel._pendingAIModal = null;
              setTimeout(() => {
                this._panel.webview.postMessage({
                  command: 'openAIModal',
                  data: aiCtx,
                });
              }, 300);
            }
            break;
          case 'createWorkspace':
            // Close the modal immediately — don't block on command execution
            this._panel.webview.postMessage({
              command: 'setCreatingWorkspace',
              data: { isLoading: false },
            });
            // Fire and forget — notifications/progress run in background
            if (message.data?.name) {
              vscode.commands.executeCommand('workspai.createWorkspace', message.data);
            } else {
              vscode.commands.executeCommand('workspai.createWorkspace');
            }
            break;
          case 'createFastAPIProject':
            // Close project modal immediately
            this._panel.webview.postMessage({ command: 'closeProjectModal' });
            if (message.data?.name) {
              vscode.commands.executeCommand('workspai.createFastAPIProject', message.data.name);
            } else {
              vscode.commands.executeCommand('workspai.createFastAPIProject');
            }
            break;
          case 'createNestJSProject':
            // Close project modal immediately
            this._panel.webview.postMessage({ command: 'closeProjectModal' });
            if (message.data?.name) {
              vscode.commands.executeCommand('workspai.createNestJSProject', message.data.name);
            } else {
              vscode.commands.executeCommand('workspai.createNestJSProject');
            }
            break;
          case 'createProjectWithKit':
            // New handler for kit-aware project creation from modal
            if (message.data?.name && message.data?.framework && message.data?.kit) {
              console.log('[WelcomePanel] Creating project with kit:', message.data);
              // Close modal immediately
              this._panel.webview.postMessage({ command: 'closeProjectModal' });

              // Get selected workspace path
              let workspacePath: string | undefined;
              if (WelcomePanel._workspaceExplorer) {
                const selectedWorkspace = WelcomePanel._workspaceExplorer.getSelectedWorkspace();
                workspacePath = selectedWorkspace?.path;
              }

              // Fire and forget
              (async () => {
                const { createProjectCommand } = await import('../../commands/createProject.js');
                await createProjectCommand(
                  workspacePath,
                  message.data.framework,
                  message.data.name,
                  message.data.kit
                );
              })();
            }
            break;
          case 'openSetup':
            await vscode.commands.executeCommand('workspai.openSetup');
            break;
          case 'debugWithAI':
            await vscode.commands.executeCommand('workspai.debugWithAI');
            break;
          case 'workspaceBrain':
            await vscode.commands.executeCommand('workspai.workspaceBrain');
            break;
          case 'aiSuggestModules': {
            // AI module recommendation based on framework + project name
            const { framework: fw, projectName: pn } = message.data || {};
            if (!fw) {
              break;
            }
            const panel = this._panel;
            try {
              const { selectModelWithPreference } = await import('../../core/aiService.js');
              const { model, modelId } = await selectModelWithPreference();
              panel.webview.postMessage({
                command: 'aiModuleSuggestions',
                data: { loading: true, modelId },
              });

              if (!this._modulesCatalog.length) {
                await this._refreshModulesCatalog();
              }
              const moduleList = this._modulesCatalog.length
                ? this._modulesCatalog
                    .map((m) => {
                      const tags =
                        m.tags && m.tags.length ? ` | tags: ${m.tags.slice(0, 4).join(', ')}` : '';
                      return `- ${m.slug}: ${m.description || m.name} | category: ${m.category} | status: ${m.status}${tags}`;
                    })
                    .join('\n')
                : '(module list not available)';

              const prompt = `You are a Workspai assistant. Recommend the top 5 most useful Workspai modules for a ${fw} project named "${pn || 'my-project'}".
Available modules:
${moduleList}

Reply ONLY with a JSON array of objects like: [{"slug": "free/auth/core", "reason": "short reason"}]
Use ONLY slugs from the list above. Prefer modules that fit the framework and avoid deprecated or invented slugs.
No markdown, no explanation outside the JSON.`;

              const token = new vscode.CancellationTokenSource().token;
              const response = await model.sendRequest(
                [vscode.LanguageModelChatMessage.User(prompt)],
                {},
                token
              );

              let raw = '';
              for await (const chunk of response.text) {
                raw += chunk;
              }

              // Extract and sanitize JSON from response
              const jsonMatch = raw.match(/\[[\s\S]*\]/);
              const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
              const allowedSlugs = new Set(this._modulesCatalog.map((m) => m.slug));
              const suggestions = Array.isArray(parsed)
                ? parsed
                    .filter(
                      (item): item is { slug: string; reason?: string } =>
                        item && typeof item === 'object' && typeof item.slug === 'string'
                    )
                    .map((item) => ({
                      slug: item.slug.trim(),
                      reason:
                        typeof item.reason === 'string' && item.reason.trim()
                          ? item.reason.trim().slice(0, 180)
                          : 'Recommended for this project',
                    }))
                    .filter((item) => allowedSlugs.has(item.slug))
                    .slice(0, 5)
                : [];
              panel.webview.postMessage({
                command: 'aiModuleSuggestions',
                data: { loading: false, modelId, suggestions },
              });
            } catch (err: any) {
              panel.webview.postMessage({
                command: 'aiModuleSuggestions',
                data: { loading: false, error: err?.message ?? 'AI unavailable' },
              });
            }
            break;
          }
          case 'aiGetModels': {
            // Return the list of language models available in this VS Code instance
            const panel = this._panel;
            try {
              const { listAvailableModels } = await import('../../core/aiService.js');
              const models = await listAvailableModels();
              panel.webview.postMessage({ command: 'aiModelsList', data: { models } });
            } catch {
              panel.webview.postMessage({ command: 'aiModelsList', data: { models: [] } });
            }
            break;
          }
          case 'aiCancelQuery': {
            const cancelRequestId =
              typeof message?.data?.requestId === 'number' ? message.data.requestId : undefined;
            if (
              typeof cancelRequestId === 'number' &&
              typeof this._activeAIQueryRequestId === 'number' &&
              cancelRequestId !== this._activeAIQueryRequestId
            ) {
              break;
            }
            this._aiQueryTokenSource?.cancel();
            this._aiQueryTokenSource?.dispose();
            this._aiQueryTokenSource = undefined;
            const doneRequestId =
              typeof cancelRequestId === 'number' ? cancelRequestId : this._activeAIQueryRequestId;
            if (typeof doneRequestId === 'number') {
              this._panel.webview.postMessage({
                command: 'aiStreamDone',
                data: { requestId: doneRequestId },
              });
            } else {
              this._panel.webview.postMessage({ command: 'aiStreamDone' });
            }
            this._activeAIQueryRequestId = undefined;
            break;
          }
          case 'aiQuery': {
            // Stream AI response for the AI modal queries
            const {
              mode,
              question,
              context: aiCtx,
              requestId,
              history,
              modelId: requestedModelId,
            } = message.data || {};
            const panel = this._panel;
            const queryRequestId = typeof requestId === 'number' ? requestId : Date.now();
            const normalizedMode = mode === 'debug' ? 'debug' : 'ask';
            const normalizedQuestion = typeof question === 'string' ? question : '';
            const aiContext =
              aiCtx && typeof aiCtx === 'object'
                ? (aiCtx as import('../../core/aiService').AIModalContext)
                : undefined;
            const conversationHistory = Array.isArray(history)
              ? history
                  .filter(
                    (h: any): h is { role: 'user' | 'assistant'; content: string } =>
                      h &&
                      typeof h === 'object' &&
                      (h.role === 'user' || h.role === 'assistant') &&
                      typeof h.content === 'string'
                  )
                  .slice(-8)
              : [];

            const canTrackTelemetry =
              typeof (vscode.window as { createOutputChannel?: unknown }).createOutputChannel ===
              'function';

            const trackAIModalOutcome = async (
              result: 'success' | 'empty' | 'prepare-error' | 'cancelled' | 'error',
              extraProps?: Record<string, unknown>
            ) => {
              if (!canTrackTelemetry) {
                return;
              }

              try {
                await WorkspaceUsageTracker.getInstance().trackCommandEvent(
                  `workspai.aimodal.${normalizedMode}`,
                  typeof aiContext?.path === 'string' ? aiContext.path : undefined,
                  {
                    source: 'ai-modal',
                    result,
                    hasPrompt: Boolean(normalizedQuestion.trim()),
                    historyTurns: conversationHistory.length,
                    ...extraProps,
                  }
                );
              } catch {
                // Telemetry should never interrupt AI modal UX.
              }
            };

            if (!normalizedQuestion.trim() || !aiContext) {
              await trackAIModalOutcome('empty', {
                hasContext: Boolean(aiContext),
              });
              panel.webview.postMessage({
                command: 'aiStreamDone',
                data: { requestId: queryRequestId },
              });
              break;
            }

            this._aiQueryTokenSource?.cancel();
            this._aiQueryTokenSource?.dispose();
            const tokenSource = new vscode.CancellationTokenSource();
            this._aiQueryTokenSource = tokenSource;
            this._activeAIQueryRequestId = queryRequestId;
            let currentStage: 'prepare' | 'stream' = 'prepare';
            try {
              const { streamAIResponse, prepareAIConversation } =
                await import('../../core/aiService.js');

              const prepared = await prepareAIConversation(
                normalizedMode,
                normalizedQuestion,
                aiContext,
                conversationHistory
              );
              currentStage = 'stream';

              const { modelId } = await streamAIResponse(
                prepared.messages,
                (() => {
                  // Buffer chunks and flush to webview every 50 ms.
                  // Without this, the extension host calls postMessage hundreds of
                  // times per second inside the same event-loop tick, causing VS Code's
                  // IPC layer to batch ALL messages into one delivery — the webview
                  // receives nothing until streaming finishes, then sees the full text
                  // appear all at once.  Explicit time-slicing breaks that batching.
                  let chunkBuffer = '';
                  let flushTimer: ReturnType<typeof setInterval> | null = setInterval(() => {
                    if (chunkBuffer && !tokenSource.token.isCancellationRequested) {
                      panel.webview.postMessage({
                        command: 'aiChunkUpdate',
                        data: { text: chunkBuffer, requestId: queryRequestId },
                      });
                      chunkBuffer = '';
                    }
                  }, 50);

                  return (chunk: { text: string; done: boolean }) => {
                    if (chunk.text) {
                      chunkBuffer += chunk.text;
                    }
                    if (chunk.done) {
                      // Clear the timer and flush any remaining buffered text
                      if (flushTimer !== null) {
                        clearInterval(flushTimer);
                        flushTimer = null;
                      }
                      if (chunkBuffer && !tokenSource.token.isCancellationRequested) {
                        panel.webview.postMessage({
                          command: 'aiChunkUpdate',
                          data: { text: chunkBuffer, requestId: queryRequestId },
                        });
                        chunkBuffer = '';
                      }
                      panel.webview.postMessage({
                        command: 'aiStreamDone',
                        data: { requestId: queryRequestId },
                      });
                    }
                  };
                })(),
                tokenSource.token,
                typeof requestedModelId === 'string' ? requestedModelId : undefined
              );

              if (tokenSource.token.isCancellationRequested) {
                await trackAIModalOutcome('cancelled', { stage: 'after-stream' });
              } else {
                await trackAIModalOutcome('success', {
                  modelId,
                });
              }

              // Notify the webview which model was used
              panel.webview.postMessage({
                command: 'aiModelUsed',
                data: { modelId, requestId: queryRequestId },
              });
            } catch (err) {
              if (tokenSource.token.isCancellationRequested) {
                await trackAIModalOutcome('cancelled', { stage: currentStage });
                panel.webview.postMessage({
                  command: 'aiStreamDone',
                  data: { requestId: queryRequestId },
                });
                break;
              }

              const errMsg = err instanceof Error ? err.message : String(err);
              await trackAIModalOutcome(currentStage === 'prepare' ? 'prepare-error' : 'error', {
                error: errMsg.slice(0, 180),
                stage: currentStage,
              });

              panel.webview.postMessage({
                command: 'aiStreamDone',
                data: { error: errMsg, requestId: queryRequestId },
              });
            } finally {
              if (this._aiQueryTokenSource === tokenSource) {
                this._aiQueryTokenSource = undefined;
              }
              if (this._activeAIQueryRequestId === queryRequestId) {
                this._activeAIQueryRequestId = undefined;
              }
              tokenSource.dispose();
            }
            break;
          }
          case 'aiParseCreation': {
            // Parse workspace/project creation intent via AI
            const {
              prompt: creationPrompt,
              mode: creationMode,
              framework: creationFw,
            } = message.data || {};
            if (!creationPrompt || creationPrompt === '__reset__') {
              this._panel.webview.postMessage({ command: 'aiCreationReset' });
              break;
            }
            const panel = this._panel;
            panel.webview.postMessage({ command: 'aiCreationThinking', data: { thinking: true } });
            try {
              const { parseCreationIntent } = await import('../../core/aiService.js');
              let workspacePath: string | undefined;
              if (WelcomePanel._selectedProject) {
                workspacePath = path.dirname(WelcomePanel._selectedProject.path);
              } else if (WelcomePanel._workspaceExplorer) {
                workspacePath = WelcomePanel._workspaceExplorer.getSelectedWorkspace()?.path;
              } else if (
                vscode.workspace.workspaceFolders &&
                vscode.workspace.workspaceFolders.length > 0
              ) {
                workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
              }
              const { plan, modelId } = await parseCreationIntent(
                creationPrompt,
                creationMode ?? 'workspace',
                creationFw,
                workspacePath
              );
              panel.webview.postMessage({ command: 'aiCreationPlan', data: { plan, modelId } });
            } catch (err) {
              const errMsg = err instanceof Error ? err.message : String(err);
              panel.webview.postMessage({ command: 'aiCreationError', data: { error: errMsg } });
            } finally {
              panel.webview.postMessage({
                command: 'aiCreationThinking',
                data: { thinking: false },
              });
            }
            break;
          }
          case 'aiCreateConfirm': {
            // Execute workspace + project creation from AI plan
            const plan = message.data;
            if (!plan) {
              break;
            }
            const panel = this._panel;
            panel.webview.postMessage({ command: 'aiCreationStarted' });
            try {
              if (plan.type === 'workspace') {
                // Create workspace with the AI-resolved config
                const wsConfig = {
                  name: plan.workspaceName,
                  profile: plan.profile,
                  installMethod: plan.installMethod ?? 'auto',
                  initGit: true,
                  policyMode: 'warn',
                  dependencySharing: 'isolated',
                };
                await vscode.commands.executeCommand('workspai.createWorkspace', wsConfig);

                // Compute the expected workspace path (always created under ~/Workspai/rapidkits/<name>)
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const os = require('os') as typeof import('os');
                const wsPath = path.join(os.homedir(), 'Workspai', 'rapidkits', plan.workspaceName);
                const wsExists = await fs.pathExists(wsPath);

                if (wsExists && plan.projectName) {
                  // Workspace was created — now create the first project inside it.
                  // Notify the UI that the workspace stage is complete BEFORE attempting
                  // project creation so the user always knows their workspace exists even
                  // if the project step fails.
                  panel.webview.postMessage({
                    command: 'aiCreationProgress',
                    data: { stage: 'workspace_done', workspacePath: wsPath },
                  });
                  try {
                    const { createProjectCommand } =
                      await import('../../commands/createProject.js');
                    await createProjectCommand(wsPath, plan.framework, plan.projectName, plan.kit);
                  } catch (projErr) {
                    // Workspace is intact — only project creation failed.
                    // Send a partial-success rather than a generic top-level error so the
                    // user knows exactly what happened and can retry from the sidebar.
                    const projErrMsg = projErr instanceof Error ? projErr.message : String(projErr);
                    panel.webview.postMessage({
                      command: 'aiCreationDone',
                      data: {
                        plan,
                        workspaceCreated: true,
                        projectError: projErrMsg,
                        workspacePath: wsPath,
                      },
                    });
                    return;
                  }
                }

                panel.webview.postMessage({
                  command: 'aiCreationDone',
                  data: { plan, workspaceCreated: wsExists },
                });
              } else {
                // Project-only creation (inside existing selected workspace).
                // Prefer the workspace path that was captured when the modal opened (passed from
                // the webview via plan.targetWorkspacePath) so we don't silently create in a
                // different workspace if the user changed the sidebar selection while the modal
                // was open.
                const workspacePath: string | undefined =
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (plan as any).targetWorkspacePath ||
                  WelcomePanel._workspaceExplorer?.getSelectedWorkspace()?.path;
                const { createProjectCommand } = await import('../../commands/createProject.js');
                await createProjectCommand(
                  workspacePath,
                  plan.framework,
                  plan.projectName,
                  plan.kit
                );
                panel.webview.postMessage({ command: 'aiCreationDone', data: { plan } });
              }
            } catch (err) {
              const errMsg = err instanceof Error ? err.message : String(err);
              panel.webview.postMessage({ command: 'aiCreationError', data: { error: errMsg } });
              panel.webview.postMessage({
                command: 'aiCreationThinking',
                data: { thinking: false },
              });
            }
            break;
          }
          case 'refreshWorkspaces':
            CoreVersionService.getInstance().clearCache();
            this._sendRecentWorkspaces();
            break;
          case 'getUiPreferences':
            this._sendUiPreferences();
            break;
          case 'setUiPreference':
            if (message.data?.key) {
              await this._setUiPreference(String(message.data.key), message.data.value);
            }
            break;
          case 'cloneExample':
            if (message.data) {
              await this._cloneExample(message.data);
            }
            break;
          case 'updateExample':
            if (message.data) {
              await this._updateExample(message.data);
            }
            break;
          case 'openWorkspaceFolder':
            if (message.data?.path) {
              const wsBaseName = path.basename(message.data.path);
              type OpenPick = vscode.QuickPickItem & { value: string };
              const openPick = await vscode.window.showQuickPick<OpenPick>(
                [
                  {
                    label: '$(folder-active) Select in Current Window',
                    description: 'Activate workspace here (updates sidebar + Projects tree)',
                    detail:
                      'Selects the workspace in the sidebar. Projects and modules update immediately.',
                    value: 'select',
                  },
                  {
                    label: '$(empty-window) Open in New Window',
                    description: 'Open workspace folder in a separate VS Code window',
                    detail: 'Current window stays unchanged.',
                    value: 'new',
                  },
                ],
                {
                  placeHolder: `What would you like to do with \u201c${wsBaseName}\u201d?`,
                  title: 'Open Workspace',
                  ignoreFocusOut: true,
                }
              );
              if (!openPick) {
                break;
              }
              if (openPick.value === 'select') {
                await vscode.commands.executeCommand('workspai.selectWorkspace', message.data.path);
              } else {
                const uri = vscode.Uri.file(message.data.path);
                await vscode.commands.executeCommand('vscode.openFolder', uri, {
                  forceNewWindow: true,
                });
              }
            }
            break;
          case 'selectWorkspace':
            if (message.data) {
              await vscode.commands.executeCommand('workspai.selectWorkspace', message.data);
              // Send updated workspace status
              await this._sendWorkspaceStatus();
            }
            break;
          case 'removeWorkspace':
            if (message.data) {
              await vscode.commands.executeCommand('workspai.removeWorkspace', message.data);
            }
            break;
          case 'refreshModules':
            this._sendModulesCatalog();
            break;
          case 'requestWorkspaceToolStatus':
            await this._sendWorkspaceToolStatus();
            break;
          case 'installModule': {
            if (message.data) {
              // Construct full module object like stable welcomePanel does
              const moduleData = message.data;
              const moduleObj = {
                id: moduleData.id,
                displayName: moduleData.display_name || moduleData.name,
                description: moduleData.description || '',
                category: moduleData.category || 'unknown',
                status: moduleData.status || 'stable',
                tags: moduleData.tags || [],
                dependencies: moduleData.dependencies || [],
                installed: false,
                slug: moduleData.slug || `unknown/${moduleData.id}`,
              };
              await vscode.commands.executeCommand('workspai.addModule', moduleObj);
            }
            break;
          }
          case 'showModuleDetails':
            if (message.data) {
              const moduleId = message.data;
              const moduleData = MODULES.find((m) => m.id === moduleId || m.slug === moduleId);
              if (moduleData) {
                await this._showModuleDetails(moduleData);
              } else {
                console.error('Module not found:', moduleId);
              }
            }
            break;
          case 'openDocs':
            await vscode.env.openExternal(vscode.Uri.parse('https://getrapidkit.com/docs'));
            break;
          case 'openGitHub':
            await vscode.env.openExternal(vscode.Uri.parse('https://github.com/rapidkit/rapidkit'));
            break;
          case 'openMarketplace':
            await vscode.env.openExternal(
              vscode.Uri.parse(
                'https://marketplace.visualstudio.com/items?itemName=rapidkit.rapidkit'
              )
            );
            break;
          case 'openUrl':
            if (message.data?.url) {
              await vscode.env.openExternal(vscode.Uri.parse(message.data.url));
            }
            break;
          case 'upgradeCore':
            if (message.data?.path) {
              const workspacePath = message.data.path;
              const targetVersion = message.data.version;

              // Detect if workspace has venv
              const venvPath = path.join(workspacePath, '.venv');
              const hasVenv = await fs.pathExists(venvPath);

              runCommandsInTerminal({
                name: `Upgrade RapidKit Core`,
                cwd: workspacePath,
                commands: [hasVenv ? 'poetry update rapidkit-core' : 'pipx upgrade rapidkit-core'],
              });

              vscode.window.showInformationMessage(
                `Upgrading RapidKit Core${targetVersion ? ` to v${targetVersion}` : ''}...`,
                'OK'
              );
            }
            break;

          case 'checkWorkspaceHealth':
            console.log('[WelcomePanel] Check Workspace Health requested for:', message.data?.path);
            if (message.data?.path) {
              vscode.commands.executeCommand('workspai.checkWorkspaceHealth', {
                path: message.data.path,
              });
            }
            break;

          case 'exportWorkspace':
            console.log('[WelcomePanel] Export Workspace requested for:', message.data?.path);
            if (message.data?.path) {
              vscode.commands.executeCommand('workspai.exportWorkspace', {
                path: message.data.path,
              });
            }
            break;
          case 'aiForWorkspace':
            WelcomePanel.showAIModal(WelcomePanel._extensionContext!, {
              type: 'workspace',
              name: message.data?.workspaceName || 'Workspace',
              path: message.data?.workspacePath,
            });
            break;
          case 'aiForModule':
            WelcomePanel.showAIModal(WelcomePanel._extensionContext!, {
              type: 'module',
              name: message.data?.moduleName || 'Module',
              moduleSlug: message.data?.moduleSlug,
            });
            break;
          case 'projectTerminal':
            if (WelcomePanel._selectedProject) {
              await vscode.commands.executeCommand('workspai.projectTerminal', {
                projectPath: WelcomePanel._selectedProject.path,
              });
            }
            break;
          case 'projectInit':
            if (WelcomePanel._selectedProject) {
              await vscode.commands.executeCommand('workspai.projectInit', {
                projectPath: WelcomePanel._selectedProject.path,
              });
            }
            break;
          case 'projectDev':
            if (WelcomePanel._selectedProject) {
              await vscode.commands.executeCommand('workspai.projectDev', {
                projectPath: WelcomePanel._selectedProject.path,
              });
            }
            break;
          case 'projectStop':
            if (WelcomePanel._selectedProject) {
              await vscode.commands.executeCommand('workspai.projectStop', {
                projectPath: WelcomePanel._selectedProject.path,
              });
            }
            break;
          case 'projectTest':
            if (WelcomePanel._selectedProject) {
              await vscode.commands.executeCommand('workspai.projectTest', {
                projectPath: WelcomePanel._selectedProject.path,
              });
            }
            break;
          case 'projectBrowser':
            if (WelcomePanel._selectedProject) {
              await vscode.commands.executeCommand('workspai.projectBrowser', {
                projectPath: WelcomePanel._selectedProject.path,
              });
            }
            break;
          case 'projectBuild':
            if (WelcomePanel._selectedProject) {
              runRapidkitCommandsInTerminal({
                name: `Build ${WelcomePanel._selectedProject.name}`,
                cwd: WelcomePanel._selectedProject.path,
                commands: [['build']],
              });
              vscode.window.showInformationMessage(
                `Building ${WelcomePanel._selectedProject.name}...`,
                'OK'
              );
            }
            break;
        }
      },
      null,
      this._disposables
    );

    // Clean up when panel is closed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  public static createOrShow(context: vscode.ExtensionContext) {
    // If panel exists, show it
    if (WelcomePanel.currentPanel) {
      WelcomePanel.currentPanel._panel.reveal();
      return;
    }

    // Create new panel
    const panel = vscode.window.createWebviewPanel(
      'rapidkitWelcomeReact',
      'Workspai Dashboard',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'dist'),
          vscode.Uri.joinPath(context.extensionUri, 'media'),
        ],
      }
    );

    panel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'icons', 'workspai.svg');

    WelcomePanel.currentPanel = new WelcomePanel(panel, context);
  }

  private _sendInitialData() {
    this._sendVersion();
    this._sendRecentWorkspaces();
    this._sendExampleWorkspaces();
    this._sendAvailableKits();
    this._sendModulesCatalog();
    this._sendWorkspaceStatus();
    this._sendWorkspaceToolStatus();
    this._sendUiPreferences();
  }

  private async _sendWorkspaceToolStatus() {
    const python = await checkPythonEnvironmentCached();
    const poetryAvailable = await isPoetryInstalledCached();

    let pipxAvailable = false;
    const pipxCandidates: Array<{ command: string; args: string[] }> =
      process.platform === 'win32'
        ? [
            { command: 'python', args: ['-m', 'pipx', '--version'] },
            { command: 'py', args: ['-m', 'pipx', '--version'] },
            { command: 'pipx', args: ['--version'] },
          ]
        : [
            { command: 'pipx', args: ['--version'] },
            { command: 'python3', args: ['-m', 'pipx', '--version'] },
            { command: 'python', args: ['-m', 'pipx', '--version'] },
          ];

    for (const candidate of pipxCandidates) {
      try {
        const result = await run(candidate.command, candidate.args, {
          timeout: 3000,
          stdio: 'pipe',
        });
        if (result.exitCode === 0) {
          pipxAvailable = true;
          break;
        }
      } catch {
        continue;
      }
    }

    const venvAvailable = python.available && python.venvSupport;
    const preferredInstallMethod = poetryAvailable ? 'poetry' : pipxAvailable ? 'pipx' : 'venv';

    this._panel.webview.postMessage({
      command: 'workspaceToolStatus',
      data: {
        pythonAvailable: python.available,
        venvAvailable,
        poetryAvailable,
        pipxAvailable,
        preferredInstallMethod,
      },
    });
  }

  private _getUiPreferences(): { setupStatusCardHidden: boolean } {
    const prefs = this._context.globalState.get<Record<string, unknown>>(
      WelcomePanel.UI_PREFS_KEY,
      {}
    );
    return {
      setupStatusCardHidden: prefs?.setupStatusCardHidden === true,
    };
  }

  private _sendUiPreferences() {
    this._panel.webview.postMessage({
      command: 'uiPreferences',
      data: this._getUiPreferences(),
    });
  }

  private async _setUiPreference(key: string, value: unknown) {
    const current = this._context.globalState.get<Record<string, unknown>>(
      WelcomePanel.UI_PREFS_KEY,
      {}
    );
    const next = {
      ...current,
      [key]: value,
    };
    await this._context.globalState.update(WelcomePanel.UI_PREFS_KEY, next);
    this._sendUiPreferences();
  }

  private _sendVersion() {
    const version = this._context.extension.packageJSON.version || '0.0.0';
    this._panel.webview.postMessage({
      command: 'updateVersion',
      data: version,
    });
  }

  private async _sendRecentWorkspaces() {
    const workspaces = await this._getRecentWorkspaces();
    this._panel.webview.postMessage({
      command: 'updateRecentWorkspaces',
      data: workspaces,
    });
  }

  private async _sendExampleWorkspaces() {
    try {
      const examplesService = ExamplesService.getInstance();
      const examples = await examplesService.getExamples();

      // Enrich each example with clone status
      const enrichedExamples = await Promise.all(
        examples.map(async (example) => {
          const isCloned = await examplesService.isExampleCloned(example.id);
          let cloneStatus: 'not-cloned' | 'cloned' | 'update-available' = 'not-cloned';

          if (isCloned) {
            cloneStatus = 'cloned';

            // Check for updates
            const updateInfo = await examplesService.checkForUpdates(example.id);
            if (updateInfo.hasUpdate) {
              cloneStatus = 'update-available';
            }
          }

          // repoUrl: URL used by the UI "Open on GitHub" button (workspace subfolder when available).
          // cloneUrl: URL used by `git clone` and must always be repository root.
          const repoUrl = example.path
            ? `https://github.com/getrapidkit/rapidkit-examples/tree/main/${example.path}`
            : 'https://github.com/getrapidkit/rapidkit-examples';
          const cloneUrl = 'https://github.com/getrapidkit/rapidkit-examples';

          return {
            ...example,
            repoUrl,
            cloneUrl,
            cloneStatus,
          };
        })
      );

      this._panel.webview.postMessage({
        command: 'updateExampleWorkspaces',
        data: enrichedExamples,
      });
    } catch (error) {
      console.error('[WelcomePanel] Failed to send example workspaces:', error);
    }
  }

  private async _sendAvailableKits() {
    try {
      const kitsService = KitsService.getInstance();
      const kits = await kitsService.getKits();

      this._panel.webview.postMessage({
        command: 'updateAvailableKits',
        data: kits,
      });

      console.log('[WelcomePanel] ✅ Available kits sent to webview:', kits.length);
    } catch (error) {
      console.error('[WelcomePanel] Failed to send available kits:', error);
      // Send empty array on error
      this._panel.webview.postMessage({
        command: 'updateAvailableKits',
        data: [],
      });
    }
  }

  private async _cloneExample(example: any) {
    try {
      // Notify webview we're cloning
      this._panel.webview.postMessage({
        command: 'setCloning',
        data: { exampleName: example.name },
      });

      // Ask user where to clone
      const result = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Select Clone Location',
        title: `Clone ${example.title}`,
      });

      if (!result || result.length === 0) {
        // User cancelled
        this._panel.webview.postMessage({
          command: 'setCloning',
          data: { exampleName: null },
        });
        return;
      }

      const parentFolder = result[0].fsPath;
      const targetPath = path.join(parentFolder, example.name);

      // Check if already exists
      if (await fs.pathExists(targetPath)) {
        const overwrite = await vscode.window.showWarningMessage(
          `Folder "${example.name}" already exists at this location.`,
          'Cancel',
          'Open Existing'
        );

        if (overwrite === 'Open Existing') {
          // Import existing workspace
          const workspaceManager = WorkspaceManager.getInstance();
          await workspaceManager.addWorkspace(targetPath);
          await this._sendRecentWorkspaces();
          vscode.window.showInformationMessage(`✅ Imported existing workspace: ${example.name}`);
        }

        this._panel.webview.postMessage({
          command: 'setCloning',
          data: { exampleName: null },
        });
        return;
      }

      // Clone the repository
      vscode.window.showInformationMessage(`🔄 Cloning ${example.title}...`);
      const cloneSource = example.cloneUrl || 'https://github.com/getrapidkit/rapidkit-examples';

      const terminal = runShellCommandInTerminal({
        name: `Clone ${example.name}`,
        cwd: parentFolder,
        command: 'git',
        args: ['clone', cloneSource, 'rapidkit-examples-temp'],
      });

      // Wait for clone to complete
      await new Promise((resolve) => setTimeout(resolve, 8000));

      // Move the specific workspace out
      const tempRepoPath = path.join(parentFolder, 'rapidkit-examples-temp');
      const sourceWorkspacePath = path.join(tempRepoPath, example.name);

      // Check if workspace exists in cloned repo
      if (await fs.pathExists(sourceWorkspacePath)) {
        // Move workspace to target location
        await fs.move(sourceWorkspacePath, targetPath);

        // Clean up temp repo
        await fs.remove(tempRepoPath);

        // Get commit hash for tracking
        const examplesService = ExamplesService.getInstance();
        const commitHash = await examplesService.getRepoCommitHash(targetPath);

        // Track the cloned example
        await examplesService.trackClonedExample(
          example.id || example.name,
          example.name,
          targetPath,
          commitHash || undefined
        );

        // Import to workspace list
        const workspaceManager = WorkspaceManager.getInstance();
        await workspaceManager.addWorkspace(targetPath);
        await this._sendRecentWorkspaces();

        // Refresh examples list to show new clone status
        await this._sendExampleWorkspaces();

        vscode.window
          .showInformationMessage(
            `✅ Successfully cloned and imported: ${example.name}`,
            'Open Workspace'
          )
          .then((selection) => {
            if (selection === 'Open Workspace') {
              const uri = vscode.Uri.file(targetPath);
              vscode.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: true });
            }
          });

        terminal.dispose();
      } else {
        // Cleanup on failure
        if (await fs.pathExists(tempRepoPath)) {
          await fs.remove(tempRepoPath);
        }
        vscode.window.showWarningMessage(
          `Clone completed but workspace "${example.name}" not found in repository. Check the terminal for details.`,
          'OK'
        );
      }
    } catch (error: any) {
      console.error('[WelcomePanel] Error cloning example:', error);
      vscode.window.showErrorMessage(`Failed to clone example: ${error.message}`);
    } finally {
      // Reset cloning state
      this._panel.webview.postMessage({
        command: 'setCloning',
        data: { exampleName: null },
      });
    }
  }

  private async _updateExample(example: any) {
    try {
      const examplesService = ExamplesService.getInstance();
      const info = await examplesService.getClonedExampleInfo(example.id || example.name);

      if (!info || !info.clonedPath) {
        vscode.window.showWarningMessage('Example is not cloned yet.');
        return;
      }

      // Check if path exists
      if (!(await fs.pathExists(info.clonedPath))) {
        vscode.window
          .showWarningMessage(`Cloned example not found at: ${info.clonedPath}`, 'Untrack')
          .then(async (action) => {
            if (action === 'Untrack') {
              await examplesService.untrackExample(example.id || example.name);
              await this._sendExampleWorkspaces();
            }
          });
        return;
      }

      // Notify user
      this._panel.webview.postMessage({
        command: 'setUpdating',
        data: { exampleName: example.name },
      });

      // Check if workspace has uncommitted changes
      const hasChanges = await this._checkGitStatus(info.clonedPath);

      if (hasChanges) {
        const action = await vscode.window.showWarningMessage(
          `The workspace "${example.name}" has uncommitted changes. Updating may cause conflicts.`,
          'Continue Anyway',
          'Cancel'
        );

        if (action !== 'Continue Anyway') {
          this._panel.webview.postMessage({
            command: 'setUpdating',
            data: { exampleName: null },
          });
          return;
        }
      }

      // Create terminal and run git pull
      runCommandsInTerminal({
        name: `Update ${example.name}`,
        cwd: info.clonedPath,
        commands: ['git fetch origin main', 'git pull origin main'],
      });

      vscode.window.showInformationMessage(
        `🔄 Updating ${example.name}... Check terminal for details.`,
        'OK'
      );

      // Wait for update to complete
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Update tracking with new commit hash
      const newCommitHash = await examplesService.getRepoCommitHash(info.clonedPath);
      if (newCommitHash) {
        await examplesService.trackClonedExample(
          example.id || example.name,
          example.name,
          info.clonedPath,
          newCommitHash
        );
      }

      // Refresh examples list
      await this._sendExampleWorkspaces();

      vscode.window.showInformationMessage(`✅ ${example.name} updated successfully!`);
    } catch (error: any) {
      console.error('[WelcomePanel] Error updating example:', error);
      vscode.window.showErrorMessage(`Failed to update example: ${error.message}`);
    } finally {
      this._panel.webview.postMessage({
        command: 'setUpdating',
        data: { exampleName: null },
      });
    }
  }

  private async _checkGitStatus(repoPath: string): Promise<boolean> {
    try {
      const result = await run('git', ['status', '--porcelain'], { cwd: repoPath });
      if (result.exitCode !== 0) {
        return false;
      }
      return result.stdout.trim().length > 0;
    } catch {
      return false;
    }
  }

  private async _sendModulesCatalog() {
    await this._refreshModulesCatalog();
  }

  private async _refreshModulesCatalog(): Promise<void> {
    try {
      const service = ModulesCatalogService.getInstance();
      // Get workspace path - use selected project's workspace or VS Code workspace folders
      let workspacePath: string | undefined;
      if (WelcomePanel._selectedProject) {
        // Extract workspace path from project path (project is inside workspace)
        const projectPath = WelcomePanel._selectedProject.path;
        // Workspace is parent of project (e.g., /path/to/my-wsps)
        workspacePath = path.dirname(projectPath);
      } else if (
        vscode.workspace.workspaceFolders &&
        vscode.workspace.workspaceFolders.length > 0
      ) {
        workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
      }

      const result = await service.getModulesCatalog(workspacePath);
      if (result.modules.length) {
        this._modulesCatalog = result.modules;
      } else {
        this._modulesCatalog = MODULES;
      }

      this._panel.webview.postMessage({
        command: 'updateModulesCatalog',
        data: this._modulesCatalog,
      });
    } catch (error) {
      console.error('[WelcomePanel] Failed to load modules catalog:', error);
      this._modulesCatalog = MODULES;
    }
  }

  private async _sendWorkspaceStatus() {
    const selectedWorkspace = this._getSelectedWorkspaceInfo();
    const hasWorkspace = selectedWorkspace !== null;
    let hasProjectSelected = false;
    let installedModules: { slug: string; version: string; display_name: string }[] = [];
    let projectType: 'fastapi' | 'nestjs' | 'go' | undefined;

    // Keep project-scoped details only when selected project belongs to selected workspace.
    if (
      WelcomePanel._selectedProject &&
      selectedWorkspace &&
      WelcomePanel._selectedProject.path.startsWith(`${selectedWorkspace.path}${path.sep}`)
    ) {
      hasProjectSelected = true;
      installedModules = await WelcomePanel._readInstalledModules(
        WelcomePanel._selectedProject.path
      );
      projectType =
        (await WelcomePanel._detectProjectTypeStatic(WelcomePanel._selectedProject.path)) ??
        undefined;
    }

    // If project selection is stale (from another workspace), clear project-scoped state.
    if (
      WelcomePanel._selectedProject &&
      selectedWorkspace &&
      !WelcomePanel._selectedProject.path.startsWith(`${selectedWorkspace.path}${path.sep}`)
    ) {
      WelcomePanel._selectedProject = null;
    }

    this._panel.webview.postMessage({
      command: 'updateWorkspaceStatus',
      data: {
        hasWorkspace,
        hasProjectSelected,
        workspaceName: selectedWorkspace?.name,
        workspacePath: selectedWorkspace?.path,
        projectType,
        installedModules,
      },
    });
  }

  private _getRecentWorkspaces(): Promise<
    Array<{
      name: string;
      path: string;
      lastAccessed?: number;
      coreVersion?: string;
      coreStatus?:
        | 'ok'
        | 'outdated'
        | 'not-installed'
        | 'update-available'
        | 'up-to-date'
        | 'error'
        | 'deprecated';
      coreLocation?: 'workspace' | 'global' | 'pipx';
      lastModified?: number;
      projectCount?: number;
      projectStats?: {
        fastapi?: number;
        nestjs?: number;
      };
      bootstrapProfile?:
        | 'minimal'
        | 'python-only'
        | 'node-only'
        | 'go-only'
        | 'polyglot'
        | 'enterprise';
      dependencySharingMode?: 'isolated' | 'shared-runtime-caches' | 'shared-node-deps';
      policyMode?: 'warn' | 'strict';
      complianceStatus?: 'passing' | 'failing' | 'unknown';
      mirrorStatus?: 'synced' | 'stale' | 'not-configured';
    }>
  > {
    try {
      const workspaceManager = WorkspaceManager.getInstance();
      const versionService = CoreVersionService.getInstance();
      const workspaces = workspaceManager.getWorkspaces();

      // Enrich workspaces with version info, last modified, and project info
      const enrichedWorkspaces = Promise.all(
        workspaces.map(async (ws) => {
          try {
            const versionInfo = await versionService.getVersionInfo(ws.path);

            // Get last modified time and project info
            let lastModified: number | undefined;
            let projectCount: number | undefined;
            let projectStats: { fastapi?: number; nestjs?: number } | undefined;
            try {
              const stats = await fs.stat(ws.path);
              lastModified = stats.mtimeMs;

              // Detect projects in workspace root (not projects/ subfolder!)
              const entries = await fs.readdir(ws.path, { withFileTypes: true });
              const stats_counter = { fastapi: 0, nestjs: 0 };
              let count = 0;

              for (const entry of entries) {
                if (entry.isDirectory() && !entry.name.startsWith('.')) {
                  const projectPath = path.join(ws.path, entry.name);

                  // Check for RapidKit project markers
                  const hasRapidKitMarker =
                    (await fs.pathExists(path.join(projectPath, '.rapidkit', 'project.json'))) ||
                    (await fs.pathExists(path.join(projectPath, '.rapidkit', 'context.json')));

                  if (hasRapidKitMarker) {
                    count++;
                    // Detect project type
                    const type = await this._detectProjectType(projectPath);
                    if (type === 'fastapi') {
                      stats_counter.fastapi++;
                    } else if (type === 'nestjs') {
                      stats_counter.nestjs++;
                    }
                  }
                  // Fallback: Check for FastAPI project
                  else if (await fs.pathExists(path.join(projectPath, 'pyproject.toml'))) {
                    count++;
                    stats_counter.fastapi++;
                  }
                  // Fallback: Check for NestJS project
                  else if (await fs.pathExists(path.join(projectPath, 'package.json'))) {
                    try {
                      const pkg = await fs.readJSON(path.join(projectPath, 'package.json'));
                      if (pkg.dependencies?.['@nestjs/core']) {
                        count++;
                        stats_counter.nestjs++;
                      }
                    } catch {
                      // Ignore invalid package.json
                    }
                  }
                }
              }

              projectCount = count;
              projectStats =
                count > 0
                  ? {
                      fastapi: stats_counter.fastapi > 0 ? stats_counter.fastapi : undefined,
                      nestjs: stats_counter.nestjs > 0 ? stats_counter.nestjs : undefined,
                    }
                  : undefined;
            } catch (err) {
              console.error(`Failed to get stats for ${ws.path}:`, err);
            }

            // --- Phase 4 enrichment ---
            let bootstrapProfile:
              | 'minimal'
              | 'python-only'
              | 'node-only'
              | 'go-only'
              | 'polyglot'
              | 'enterprise'
              | undefined;
            let dependencySharingMode:
              | 'isolated'
              | 'shared-runtime-caches'
              | 'shared-node-deps'
              | undefined;
            let policyMode: 'warn' | 'strict' | undefined;
            let complianceStatus: 'passing' | 'failing' | 'unknown' | undefined;
            let mirrorStatus: 'synced' | 'stale' | 'not-configured' | undefined;
            try {
              const manifestPath = path.join(ws.path, '.rapidkit', 'workspace.json');
              if (await fs.pathExists(manifestPath)) {
                const manifest = await fs.readJSON(manifestPath).catch(() => null);
                if (manifest) {
                  bootstrapProfile = manifest.profile;
                }
              }

              const policiesPath = path.join(ws.path, '.rapidkit', 'policies.yml');
              if (await fs.pathExists(policiesPath)) {
                const policyContent = await fs.readFile(policiesPath, 'utf-8');

                const modeMatch = policyContent.match(/^\s*mode:\s*(warn|strict)\s*$/m);
                if (modeMatch && (modeMatch[1] === 'warn' || modeMatch[1] === 'strict')) {
                  policyMode = modeMatch[1];
                }

                const depModeMatch = policyContent.match(
                  /^\s*dependency_sharing_mode:\s*(isolated|shared-runtime-caches|shared-node-deps)\s*$/m
                );
                if (
                  depModeMatch &&
                  (depModeMatch[1] === 'isolated' ||
                    depModeMatch[1] === 'shared-runtime-caches' ||
                    depModeMatch[1] === 'shared-node-deps')
                ) {
                  dependencySharingMode = depModeMatch[1];
                }
              }

              const reportsDir = path.join(ws.path, '.rapidkit', 'reports');
              if (await fs.pathExists(reportsDir)) {
                const reportFiles = await fs.readdir(reportsDir);
                const latestCompliance = reportFiles
                  .filter((f) => f.startsWith('bootstrap-compliance'))
                  .sort()
                  .reverse()[0];
                if (latestCompliance) {
                  const report = await fs
                    .readJSON(path.join(reportsDir, latestCompliance))
                    .catch(() => null);
                  // result field: 'ok' | 'ok_with_warnings' | 'failed'
                  const rawResult = report?.result || report?.status;
                  complianceStatus =
                    rawResult === 'ok' || rawResult === 'ok_with_warnings'
                      ? 'passing'
                      : rawResult === 'failed'
                        ? 'failing'
                        : 'unknown';
                }
                const latestMirror = reportFiles
                  .filter((f) => f.startsWith('mirror-ops'))
                  .sort()
                  .reverse()[0];
                mirrorStatus = latestMirror
                  ? ((await fs.readJSON(path.join(reportsDir, latestMirror)).catch(() => null))
                      ?.status ?? 'not-configured')
                  : 'not-configured';
              }
            } catch {
              // Phase 4 data unavailable — leave as undefined
            }
            // --- End Phase 4 enrichment ---

            return {
              ...ws,
              coreVersion: versionInfo.installed,
              coreLatestVersion: versionInfo.latest,
              coreStatus: versionInfo.status,
              coreLocation: versionInfo.location as 'workspace' | 'global' | 'pipx' | undefined,
              lastModified,
              projectCount,
              projectStats,
              bootstrapProfile,
              dependencySharingMode,
              policyMode,
              complianceStatus,
              mirrorStatus,
            };
          } catch (error) {
            console.error(`Failed to get version info for ${ws.path}:`, error);
            return {
              ...ws,
              coreVersion: undefined,
              coreStatus: 'error' as const,
              coreLocation: undefined,
              bootstrapProfile: undefined,
              dependencySharingMode: undefined,
              policyMode: undefined,
              complianceStatus: undefined,
              mirrorStatus: undefined,
            };
          }
        })
      );

      return enrichedWorkspaces;
    } catch (error) {
      console.error('Failed to get recent workspaces:', error);
      return Promise.resolve([]);
    }
  }

  private async _detectProjectType(
    projectPath: string
  ): Promise<'fastapi' | 'nestjs' | 'go' | null> {
    return WelcomePanel._detectProjectTypeStatic(projectPath);
  }

  static async _detectProjectTypeStatic(
    projectPath: string
  ): Promise<'fastapi' | 'nestjs' | 'go' | null> {
    try {
      // Check for Go indicators
      const goModPath = path.join(projectPath, 'go.mod');
      if (await fs.pathExists(goModPath)) {
        return 'go';
      }

      // Check for FastAPI indicators
      const pyprojectPath = path.join(projectPath, 'pyproject.toml');
      if (await fs.pathExists(pyprojectPath)) {
        const content = await fs.readFile(pyprojectPath, 'utf8');
        if (content.includes('fastapi') || content.includes('uvicorn')) {
          return 'fastapi';
        }
      }

      // Check for NestJS indicators
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (await fs.pathExists(packageJsonPath)) {
        const content = await fs.readFile(packageJsonPath, 'utf8');
        if (content.includes('@nestjs/core') || content.includes('@nestjs/common')) {
          return 'nestjs';
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  private _getHtmlContent(context: vscode.ExtensionContext): string {
    // Get URIs for webview resources
    const scriptUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview.js')
    );
    const cssUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview.css')
    );
    const iconUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'media', 'icons', 'workspai.svg')
    );
    const fontUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'media', 'fonts', 'MuseoModerno-Bold.ttf')
    );
    const fastapiIconUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'media', 'icons', 'fastapi.svg')
    );
    const nestjsIconUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'media', 'icons', 'nestjs.svg')
    );
    const goIconUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'media', 'icons', 'go.svg')
    );

    // Generate nonce for CSP
    const nonce = this._getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this._panel.webview.cspSource} 'unsafe-inline'; font-src ${this._panel.webview.cspSource}; img-src ${this._panel.webview.cspSource} https:; script-src 'nonce-${nonce}';">
    <title>Welcome to Workspai</title>
    <link rel="stylesheet" type="text/css" href="${cssUri}">
    <style>
        @font-face {
            font-family: 'MuseoModerno';
            src: url('${fontUri}') format('truetype');
            font-weight: bold;
            font-style: normal;
        }
        
        /* Inject icon URIs as CSS variables */
        :root {
            --icon-uri: url('${iconUri}');
            --fastapi-icon-uri: url('${fastapiIconUri}');
            --nestjs-icon-uri: url('${nestjsIconUri}');
            --go-icon-uri: url('${goIconUri}');
        }
    </style>
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}">
        // Inject URIs for React components to use
        window.ICON_URI = '${iconUri}';
        window.FASTAPI_ICON_URI = '${fastapiIconUri}';
        window.NESTJS_ICON_URI = '${nestjsIconUri}';
        window.GO_ICON_URI = '${goIconUri}';
    </script>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private _getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  private async _showModuleDetails(moduleData: any): Promise<void> {
    try {
      let workspacePath: string | undefined;
      if (WelcomePanel._selectedProject) {
        workspacePath = WelcomePanel._selectedProject.path;
      } else if (
        vscode.workspace.workspaceFolders &&
        vscode.workspace.workspaceFolders.length > 0
      ) {
        workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
      }

      const { run } = await import('../../utils/exec.js');

      let command = 'rapidkit';
      if (workspacePath) {
        const candidates = getWorkspaceVenvRapidkitCandidates(workspacePath);
        for (const candidate of candidates) {
          if (await fs.pathExists(candidate)) {
            command = candidate;
            break;
          }
        }
      }

      const candidates = [
        moduleData.slug,
        moduleData.id,
        moduleData.slug?.split('/').filter(Boolean).pop(),
      ].filter((value, index, self) => value && self.indexOf(value) === index) as string[];

      console.log('[WelcomePanel] Fetching module info for:', candidates);

      let moduleInfo: any = null;
      let foundMatch = false;

      for (const candidate of candidates) {
        try {
          // Try to get JSON output first
          const jsonResult = await run(command, ['modules', 'info', candidate, '--json'], {
            cwd: workspacePath,
            shell: false,
            timeout: 5000,
          });
          if (jsonResult.exitCode === 0 && jsonResult.stdout) {
            try {
              const parsed = JSON.parse(jsonResult.stdout);
              // Merge with moduleData but prefer fresh CLI data
              moduleInfo = { ...moduleData, ...parsed };
              foundMatch = true;
              console.log(
                '[WelcomePanel] Found module info (JSON) for:',
                candidate,
                'version:',
                parsed.version
              );
              console.log('[WelcomePanel] moduleInfo after merge:', {
                name: moduleInfo.display_name,
                version: moduleInfo.version,
                slug: moduleInfo.slug,
              });
              break;
            } catch {
              console.log('[WelcomePanel] Failed to parse JSON for:', candidate);
            }
          }
        } catch {
          console.log('[WelcomePanel] Failed to fetch JSON info for:', candidate);
        }
      }

      if (!foundMatch || !moduleInfo) {
        console.log('[WelcomePanel] Could not fetch module info from CLI, using card data');
        moduleInfo = { ...moduleData };
      }

      // Send module details to React webview for modal display
      console.log('[WelcomePanel] Sending showModuleDetailsModal message:', moduleInfo);
      WelcomePanel.currentPanel?._panel.webview.postMessage({
        command: 'showModuleDetailsModal',
        data: moduleInfo,
      });
    } catch (error) {
      console.error('[WelcomePanel] Error showing module details:', error);
      vscode.window.showErrorMessage('Failed to load module details');
    }
  }

  public dispose() {
    WelcomePanel.currentPanel = undefined;

    this._aiQueryTokenSource?.cancel();
    this._aiQueryTokenSource?.dispose();
    this._aiQueryTokenSource = undefined;
    this._activeAIQueryRequestId = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
