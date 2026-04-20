import { useEffect, useRef, useState } from 'react';
import { Eye } from 'lucide-react';
import { vscode } from '@/vscode';
import type {
    ModuleData,
    CategoryInfo,
    Workspace,
    WorkspaceStatus,
    InstallStatus,
    ExampleWorkspace,
    Kit,
    WorkspaceToolStatus,
} from '@/types';
import { Header } from '@/components/Header';
import { SetupCard } from '@/components/SetupCard';
import { HeroAction } from '@/components/HeroAction';
import { QuickLinks } from '@/components/QuickLinks';
import { Features } from '@/components/Features';
import { RecentWorkspaces } from '@/components/RecentWorkspaces';
import { ExampleWorkspaces } from '@/components/ExampleWorkspaces';
import { ModuleBrowser } from '@/components/ModuleBrowser';
import { CommandReference } from '@/components/CommandReference';
import { KeyboardShortcuts } from '@/components/KeyboardShortcuts';
import { Footer } from '@/components/Footer';
import { AIActions } from '@/components/AIActions';
import { AIModal, AIModalContext } from '@/components/AIModal';
import { AICreateModal, AICreationPlan, AICreateFramework } from '@/components/AICreateModal';
import { CreateWorkspaceModal, WorkspaceCreationConfig } from '@/components/CreateWorkspaceModal';
import { CreateProjectModal } from '@/components/CreateProjectModal';
import { InstallModuleModal } from '@/components/InstallModuleModal';
import { ModuleDetailsModal } from '@/components/ModuleDetailsModal';

export function App() {
    const [version, setVersion] = useState('0.0.0');
    const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [showInstallModal, setShowInstallModal] = useState(false);
    const [showModuleDetailsModal, setShowModuleDetailsModal] = useState(false);
    const [showAIModal, setShowAIModal] = useState(false);
    const [aiModalContext, setAIModalContext] = useState<AIModalContext | null>(null);
    const [aiStreamContent, setAIStreamContent] = useState('');
    const [aiIsStreaming, setAIIsStreaming] = useState(false);
    const [aiStreamError, setAIStreamError] = useState<string | null>(null);
    const [aiModelId, setAIModelId] = useState<string | null>(null);
    const [aiAvailableModels, setAIAvailableModels] = useState<{ id: string; name: string; vendor: string }[]>([]);
    const [aiSelectedModelId, setAISelectedModelId] = useState<string | null>(null);
    const [aiConversationHistory, setAIConversationHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
    // AI Create state
    const [showAICreateModal, setShowAICreateModal] = useState(false);
    const [aiCreateMode, setAICreateMode] = useState<'workspace' | 'project'>('workspace');
    const [aiCreateFramework, setAICreateFramework] = useState<AICreateFramework | undefined>(undefined);
    const [aiCreateTargetWorkspaceName, setAICreateTargetWorkspaceName] = useState<string | undefined>(undefined);
    const [aiCreateTargetWorkspacePath, setAICreateTargetWorkspacePath] = useState<string | undefined>(undefined);
    const [aiCreationPlan, setAICreationPlan] = useState<AICreationPlan | null>(null);
    const [aiCreationThinking, setAICreationThinking] = useState(false);
    const [aiCreationCreating, setAICreationCreating] = useState(false);
    const [aiCreationStage, setAICreationStage] = useState<'workspace_done' | null>(null);
    const [aiCreationError, setAICreationError] = useState<string | null>(null);
    const [aiCreateModelId, setAICreateModelId] = useState<string | null>(null);
    const [selectedFramework, setSelectedFramework] = useState<'fastapi' | 'nestjs' | 'go'>('fastapi');
    const [selectedModule, setSelectedModule] = useState<ModuleData | null>(null);
    const [moduleDetails, setModuleDetails] = useState<ModuleData | null>(null);
    const [recentWorkspaces, setRecentWorkspaces] = useState<Workspace[]>([]);
    const [exampleWorkspaces, setExampleWorkspaces] = useState<ExampleWorkspace[]>([]);
    const [availableKits, setAvailableKits] = useState<Kit[]>([]);
    const [cloningExample, setCloningExample] = useState<string | null>(null);
    const [updatingExample, setUpdatingExample] = useState<string | null>(null);
    const [modulesCatalog, setModulesCatalog] = useState<ModuleData[]>([]);
    const [categoryInfo] = useState<CategoryInfo>({});
    const [workspaceStatus, setWorkspaceStatus] = useState<WorkspaceStatus>({ hasWorkspace: false });
    const [installStatus, setInstallStatus] = useState<InstallStatus>({
        npmInstalled: false,
        coreInstalled: false
    });
    const [workspaceToolStatus, setWorkspaceToolStatus] = useState<WorkspaceToolStatus | null>(null);
    /** true once extension has sent at least one installStatusUpdate — before that, initial false values must not be trusted */
    const [installStatusChecked, setInstallStatusChecked] = useState(false);
    const [isRefreshingWorkspaces, setIsRefreshingWorkspaces] = useState(false);
    const [isSetupCardHidden, setIsSetupCardHidden] = useState(false);
    const aiRequestIdRef = useRef(0);

    const activeWorkspace =
        recentWorkspaces.find((workspace) => workspace.path === workspaceStatus.workspacePath) || null;
    const hasActiveWorkspace = Boolean(workspaceStatus.hasWorkspace && workspaceStatus.workspacePath);
    const activeWorkspaceProfile = activeWorkspace?.bootstrapProfile;
    const activeWorkspaceName = workspaceStatus.workspaceName || activeWorkspace?.name;

    const updateSetupCardHidden = (hidden: boolean) => {
        setIsSetupCardHidden(hidden);
        vscode.postMessage('setUiPreference', {
            key: 'setupStatusCardHidden',
            value: hidden,
        });
    };

    // Listen for messages from extension
    useEffect(() => {
        const messageHandler = (event: MessageEvent) => {
            const message = event.data;
            const messageRequestId =
                typeof message?.data?.requestId === 'number' ? message.data.requestId : undefined;

            console.log('[React Webview] Received message:', message.command, message.data);

            switch (message.command) {
                case 'updateVersion':
                    console.log('[React Webview] Updating version:', message.data);
                    setVersion(message.data);
                    break;
                case 'updateWorkspaceStatus':
                    console.log('[React Webview] Updating workspace status:', message.data);
                    setWorkspaceStatus(message.data);
                    break;
                case 'updateRecentWorkspaces':
                    console.log('[React Webview] Updating workspaces:', message.data);
                    setRecentWorkspaces(message.data);
                    setIsRefreshingWorkspaces(false);
                    break;
                case 'updateExampleWorkspaces':
                    console.log('[React Webview] Updating examples:', message.data);
                    setExampleWorkspaces(message.data);
                    break;
                case 'updateAvailableKits':
                    console.log('[React Webview] Updating available kits:', message.data);
                    setAvailableKits(message.data);
                    break;
                case 'setCloning':
                    console.log('[React Webview] Setting cloning state:', message.data);
                    setCloningExample(message.data.exampleName);
                    break;
                case 'setUpdating':
                    console.log('[React Webview] Setting updating state:', message.data);
                    setUpdatingExample(message.data.exampleName);
                    break;
                case 'updateModulesCatalog':
                    console.log('[React Webview] Updating modules catalog:', message.data?.length || 0, 'modules');
                    setModulesCatalog(message.data);
                    break;
                case 'installStatusUpdate':
                    setInstallStatus(message.data);
                    setInstallStatusChecked(true);
                    break;
                case 'installProgressUpdate':
                    // Handle progress updates
                    console.log('Install progress:', message.data);
                    break;
                case 'setCreatingWorkspace':
                    console.log('[React Webview] Setting creating workspace state:', message.data.isLoading);
                    setIsCreatingWorkspace(message.data.isLoading);
                    if (!message.data.isLoading) {
                        // Reset modal when workspace creation completes
                        setShowCreateModal(false);
                    }
                    break;
                case 'showModuleDetailsModal':
                    console.log('[React Webview] Showing module details modal:', message.data);
                    setModuleDetails(message.data);
                    setShowModuleDetailsModal(true);
                    break;
                case 'openModuleInstallModal':
                    // Triggered from sidebar AVAILABLE MODULES click
                    console.log('[React Webview] openModuleInstallModal:', message.data);
                    if (message.data) {
                        setSelectedModule(message.data);
                        setShowInstallModal(true);
                    }
                    break;
                case 'openProjectModal':
                    // Triggered from sidebar or external command
                    console.log('[React Webview] openProjectModal:', message.data?.framework);
                    if (message.data?.framework) {
                        setSelectedFramework(message.data.framework);
                        setShowProjectModal(true);
                    }
                    break;
                case 'closeProjectModal':
                    setShowProjectModal(false);
                    break;
                case 'openWorkspaceModal':
                    // Triggered from sidebar Workspace button
                    console.log('[React Webview] openWorkspaceModal');
                    setShowCreateModal(true);
                    break;
                case 'openAICreateModal':
                    // Triggered from sidebar — mode can be 'workspace' or 'project'
                    setAICreateMode(message.data?.mode ?? 'workspace');
                    setAICreateFramework(undefined);
                    setAICreationPlan(null);
                    setAICreationError(null);
                    setAICreationThinking(false);
                    setAICreationCreating(false);
                    setAICreationStage(null);
                    setAICreateModelId(null);
                    setAICreateTargetWorkspaceName(message.data?.targetWorkspaceName ?? undefined);
                    setAICreateTargetWorkspacePath(message.data?.targetWorkspacePath ?? undefined);
                    setShowAICreateModal(true);
                    break;
                case 'openAIModal':
                    // Triggered from tree view AI inline button
                    console.log('[React Webview] openAIModal:', message.data);
                    aiRequestIdRef.current = 0;
                    setAIModalContext(message.data);
                    setAIStreamContent('');
                    setAIStreamError(null);
                    setAIIsStreaming(false);
                    setAIModelId(null);
                    setAIConversationHistory([]);
                    setShowAIModal(true);
                    // Fetch available models for the selector
                    vscode.postMessage('aiGetModels');
                    break;
                case 'aiChunkUpdate':
                    if (
                        typeof messageRequestId === 'number' &&
                        messageRequestId !== aiRequestIdRef.current
                    ) {
                        break;
                    }
                    setAIStreamContent((prev) => prev + (message.data?.text || ''));
                    break;
                case 'aiStreamDone':
                    if (
                        typeof messageRequestId === 'number' &&
                        messageRequestId !== aiRequestIdRef.current
                    ) {
                        break;
                    }
                    setAIIsStreaming(false);
                    if (message.data?.error) {
                        setAIStreamError(message.data.error);
                    }
                    break;
                case 'aiModelUsed':
                    if (
                        typeof messageRequestId === 'number' &&
                        messageRequestId !== aiRequestIdRef.current
                    ) {
                        break;
                    }
                    if (message.data?.modelId) setAIModelId(message.data.modelId);
                    break;
                case 'aiModelsList':
                    if (Array.isArray(message.data?.models)) {
                        setAIAvailableModels(message.data.models);
                    }
                    break;
                // ── AI Create events ────────────────────────────────────────
                case 'aiCreationThinking':
                    setAICreationThinking(message.data?.thinking ?? false);
                    if (message.data?.thinking) setAICreationError(null);
                    break;
                case 'aiCreationPlan':
                    setAICreationPlan(message.data?.plan ?? null);
                    if (message.data?.modelId) setAICreateModelId(message.data.modelId);
                    break;
                case 'aiCreationError':
                    setAICreationError(message.data?.error ?? 'Unknown error');
                    setAICreationCreating(false);
                    break;
                case 'aiCreationReset':
                    setAICreationPlan(null);
                    setAICreationError(null);
                    setAICreationStage(null);
                    break;
                case 'aiCreationStarted':
                    setAICreationCreating(true);
                    setAICreationStage(null);
                    break;
                case 'aiCreationProgress':
                    setAICreationStage(message.data?.stage ?? null);
                    break;
                case 'aiCreationDone':
                    setAICreationCreating(false);
                    setAICreationStage(null);
                    if (message.data?.projectError && message.data?.workspaceCreated) {
                        const workspacePath =
                            typeof message.data?.workspacePath === 'string'
                                ? message.data.workspacePath
                                : 'the selected location';
                        setAICreationError(
                            `Workspace created successfully at ${workspacePath}, but project creation failed: ${message.data.projectError}`
                        );
                        if (message.data?.plan) {
                            setAICreationPlan(message.data.plan);
                        }
                    } else {
                        setShowAICreateModal(false);
                        setAICreationPlan(null);
                        setAICreationError(null);
                        setAICreateTargetWorkspaceName(undefined);
                        setAICreateTargetWorkspacePath(undefined);
                    }
                    break;
                case 'workspaceToolStatus':
                    setWorkspaceToolStatus(message.data);
                    break;
                case 'uiPreferences':
                    if (typeof message.data?.setupStatusCardHidden === 'boolean') {
                        setIsSetupCardHidden(message.data.setupStatusCardHidden);
                    }
                    break;
            }
        };

        window.addEventListener('message', messageHandler);

        // Request initial data
        vscode.postMessage('ready');
        vscode.postMessage('getUiPreferences');

        return () => window.removeEventListener('message', messageHandler);
    }, []);

    useEffect(() => {
        if (showCreateModal) {
            vscode.postMessage('requestWorkspaceToolStatus');
        }
    }, [showCreateModal]);

    const handleCreateWorkspace = (config: WorkspaceCreationConfig) => {
        console.log('[React Webview] Creating workspace:', config.name);
        vscode.postMessage('createWorkspace', config);
    };

    const handleOpenProjectModal = (framework: 'fastapi' | 'nestjs' | 'go', kitName?: string) => {
        if (installStatusChecked && !installStatus.coreInstalled) {
            vscode.postMessage('openSetup');
            return;
        }
        // Open AI create modal in project mode with pre-selected framework
        setAICreateMode('project');
        setAICreateFramework(framework);
        setAICreationPlan(null);
        setAICreationError(null);
        setAICreationThinking(false);
        setAICreationCreating(false);
        setAICreationStage(null);
        setAICreateModelId(null);
        setAICreateTargetWorkspaceName(activeWorkspaceName ?? undefined);
        setAICreateTargetWorkspacePath(workspaceStatus.workspacePath ?? undefined);
        setShowAICreateModal(true);
    };

    const handleOpenAICreateWorkspace = () => {
        setAICreateMode('workspace');
        setAICreateFramework(undefined);
        setAICreationPlan(null);
        setAICreationError(null);
        setAICreationThinking(false);
        setAICreationCreating(false);
        setAICreationStage(null);
        setAICreateModelId(null);
        setAICreateTargetWorkspaceName(undefined);
        setAICreateTargetWorkspacePath(undefined);
        setShowAICreateModal(true);
    };

    const handleAICreatePromptSubmit = (prompt: string, mode: 'workspace' | 'project', framework?: string) => {
        vscode.postMessage('aiParseCreation', { prompt, mode, framework });
    };

    const handleAICreateConfirm = (plan: AICreationPlan) => {
        vscode.postMessage('aiCreateConfirm', {
            ...plan,
            // Pass the workspace path captured at modal-open time so the backend
            // uses the workspace the user saw in the modal (not the current selection).
            targetWorkspacePath: aiCreateMode === 'project' ? aiCreateTargetWorkspacePath : undefined,
        });
    };

    const handleCreateProject = (projectName: string, framework: 'fastapi' | 'nestjs' | 'go', kitName: string) => {
        console.log('[React Webview] Creating project:', projectName, framework, kitName);
        vscode.postMessage('createProjectWithKit', { name: projectName, framework, kit: kitName });
    };

    const handleOpenInstallModal = (module: ModuleData) => {
        setSelectedModule(module);
        setShowInstallModal(true);
    };

    const handleAIQuery = (mode: 'debug' | 'ask', question: string, ctx: AIModalContext) => {
        const requestId = aiRequestIdRef.current + 1;
        aiRequestIdRef.current = requestId;
        // Snapshot current content as previous assistant response before clearing
        if (aiStreamContent.trim()) {
            setAIConversationHistory(prev => [...prev, { role: 'assistant', content: aiStreamContent }]);
        }
        setAIConversationHistory(prev => [...prev, { role: 'user', content: question }]);
        setAIStreamContent('');
        setAIStreamError(null);
        setAIIsStreaming(true);
        setAIModelId(null);
        vscode.postMessage('aiQuery', { mode, question, context: ctx, requestId, history: aiConversationHistory, modelId: aiSelectedModelId ?? undefined });
    };

    const handleAICancelQuery = () => {
        vscode.postMessage('aiCancelQuery', { requestId: aiRequestIdRef.current });
    };

    const handleConfirmInstall = () => {
        if (selectedModule) {
            console.log('[React Webview] Installing module:', selectedModule);
            vscode.postMessage('installModule', selectedModule);
            setShowInstallModal(false);
            setSelectedModule(null);
        }
    };

    return (
        <div className="container">
            <Header version={version} />

            {!isSetupCardHidden ? (
                <SetupCard
                    onClick={() => vscode.postMessage('openSetup')}
                    onHide={() => updateSetupCardHidden(true)}
                />
            ) : (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                    <button
                        type="button"
                        onClick={() => updateSetupCardHidden(false)}
                        title="Show Setup Status"
                        aria-label="Show Setup Status"
                        style={{
                            border: '1px solid var(--vscode-panel-border)',
                            background: 'var(--vscode-editor-inactiveSelectionBackground)',
                            color: 'var(--vscode-foreground)',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 600,
                        }}
                    >
                        <Eye size={14} />
                        Show Setup Status
                    </button>
                </div>
            )}

            <div className="mb-8">
                <HeroAction
                    onClick={handleOpenAICreateWorkspace}
                    isLoading={isCreatingWorkspace}
                />
                <QuickLinks onOpenProjectModal={handleOpenProjectModal} />
            </div>

            <AIActions />

            <RecentWorkspaces
                workspaces={recentWorkspaces}
                isRefreshing={isRefreshingWorkspaces}
                onRefresh={() => { setIsRefreshingWorkspaces(true); vscode.postMessage('refreshWorkspaces'); }}
                onSelect={(workspace) => vscode.postMessage('openWorkspaceFolder', { path: workspace.path })}
                onRemove={(workspace) => vscode.postMessage('removeWorkspace', { path: workspace.path })}
                onUpgrade={(workspace) => vscode.postMessage('upgradeCore', { path: workspace.path, version: workspace.coreLatestVersion })}
                onCheckHealth={(workspace) => vscode.postMessage('checkWorkspaceHealth', { path: workspace.path })}
                onExport={(workspace) => vscode.postMessage('exportWorkspace', { path: workspace.path })}
                onAI={(workspace) => vscode.postMessage('aiForWorkspace', { workspacePath: workspace.path, workspaceName: workspace.name })}
            />

            <ExampleWorkspaces
                examples={exampleWorkspaces}
                onClone={(example) => vscode.postMessage('cloneExample', example)}
                onUpdate={(example) => vscode.postMessage('updateExample', example)}
                cloningExample={cloningExample}
                updatingExample={updatingExample}
            />

            <ModuleBrowser
                modules={modulesCatalog}
                workspaceStatus={workspaceStatus}
                categoryInfo={categoryInfo}
                onRefresh={() => vscode.postMessage('refreshModules')}
                onInstall={handleOpenInstallModal}
                onShowDetails={(moduleId) => vscode.postMessage('showModuleDetails', moduleId)}
                onAI={(module) => vscode.postMessage('aiForModule', { moduleId: module.id, moduleName: module.display_name || module.name, moduleSlug: module.slug })}
                onProjectTerminal={() => vscode.postMessage('projectTerminal')}
                onProjectInit={() => vscode.postMessage('projectInit')}
                onProjectDev={() => vscode.postMessage('projectDev')}
                onProjectStop={() => vscode.postMessage('projectStop')}
                onProjectTest={() => vscode.postMessage('projectTest')}
                onProjectBrowser={() => vscode.postMessage('projectBrowser')}
                onProjectBuild={() => vscode.postMessage('projectBuild')}
                modulesDisabled={workspaceStatus.projectType === 'go'}
            />

            <Features />

            <CreateWorkspaceModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreate={handleCreateWorkspace}
                toolStatus={workspaceToolStatus}
                onSwitchToAI={() => {
                    setShowCreateModal(false);
                    handleOpenAICreateWorkspace();
                }}
            />
            <CreateProjectModal
                isOpen={showProjectModal}
                framework={selectedFramework}
                availableKits={availableKits}
                onClose={() => setShowProjectModal(false)}
                onCreate={handleCreateProject}
                onSwitchToAI={() => {
                    setShowProjectModal(false);
                    setAICreateMode('project');
                    setAICreateFramework(selectedFramework);
                    setAICreationPlan(null);
                    setAICreationError(null);
                    setAICreationThinking(false);
                    setAICreationCreating(false);
                    setAICreationStage(null);
                    setAICreateModelId(null);
                    setAICreateTargetWorkspaceName(activeWorkspaceName ?? undefined);
                    setAICreateTargetWorkspacePath(workspaceStatus.workspacePath ?? undefined);
                    setShowAICreateModal(true);
                }}
            />
            <AICreateModal
                isOpen={showAICreateModal}
                mode={aiCreateMode}
                framework={aiCreateFramework}
                targetWorkspaceName={aiCreateMode === 'project' ? aiCreateTargetWorkspaceName : undefined}
                plan={aiCreationPlan}
                isThinking={aiCreationThinking}
                isCreating={aiCreationCreating}
                creationStage={aiCreationStage}
                planError={aiCreationError}
                modelId={aiCreateModelId}
                onClose={() => {
                    if (!aiCreationThinking && !aiCreationCreating) {
                        setShowAICreateModal(false);
                        setAICreationPlan(null);
                        setAICreationError(null);
                        setAICreateTargetWorkspaceName(undefined);
                        setAICreateTargetWorkspacePath(undefined);
                    }
                }}
                onPromptSubmit={handleAICreatePromptSubmit}
                onConfirm={handleAICreateConfirm}
                onManualFallback={() => {
                    setShowAICreateModal(false);
                    if (aiCreateMode === 'workspace') {
                        setShowCreateModal(true);
                    } else {
                        setSelectedFramework(aiCreateFramework ?? 'fastapi');
                        setShowProjectModal(true);
                    }
                }}
            />
            <InstallModuleModal
                isOpen={showInstallModal}
                module={selectedModule}
                workspaceStatus={workspaceStatus}
                onClose={() => {
                    setShowInstallModal(false);
                    setSelectedModule(null);
                }}
                onConfirm={handleConfirmInstall}
            />
            {showModuleDetailsModal && (
                <ModuleDetailsModal
                    module={moduleDetails}
                    onClose={() => {
                        setShowModuleDetailsModal(false);
                        setModuleDetails(null);
                    }}
                />
            )}
            <AIModal
                isOpen={showAIModal}
                context={aiModalContext}
                isStreaming={aiIsStreaming}
                streamContent={aiStreamContent}
                streamError={aiStreamError}
                modelId={aiModelId}
                availableModels={aiAvailableModels}
                selectedModelId={aiSelectedModelId}
                onModelChange={setAISelectedModelId}
                onClose={() => {
                    if (!aiIsStreaming) {
                        aiRequestIdRef.current = 0;
                        setShowAIModal(false);
                        setAIStreamContent('');
                        setAIStreamError(null);
                        setAIModelId(null);
                        setAIConversationHistory([]);
                    }
                }}
                onCancel={handleAICancelQuery}
                onQuery={handleAIQuery}
            />
            <CommandReference
                workspaceProfile={activeWorkspaceProfile}
                hasActiveWorkspace={hasActiveWorkspace}
                workspaceName={activeWorkspaceName}
            />

            <KeyboardShortcuts />

            <Footer />
        </div>
    );
}
