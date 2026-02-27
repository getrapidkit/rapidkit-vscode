import { useEffect, useState } from 'react';
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
                case 'openProjectModal':
                    // Triggered from sidebar or external command
                    console.log('[React Webview] openProjectModal:', message.data?.framework);
                    if (message.data?.framework) {
                        setSelectedFramework(message.data.framework);
                        setShowProjectModal(true);
                    }
                    break;
                case 'openWorkspaceModal':
                    // Triggered from sidebar Workspace button
                    console.log('[React Webview] openWorkspaceModal');
                    setShowCreateModal(true);
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
        // Only block if we've received a confirmed status from the extension AND it's not installed.
        // Do NOT block on the initial false default — the message may not have arrived yet.
        if (installStatusChecked && !installStatus.coreInstalled) {
            vscode.postMessage('openSetup');
            return;
        }
        setSelectedFramework(framework);
        setShowProjectModal(true);
    };

    const handleCreateProject = (projectName: string, framework: 'fastapi' | 'nestjs' | 'go', kitName: string) => {
        console.log('[React Webview] Creating project:', projectName, framework, kitName);
        vscode.postMessage('createProjectWithKit', { name: projectName, framework, kit: kitName });
    };

    const handleOpenInstallModal = (module: ModuleData) => {
        setSelectedModule(module);
        setShowInstallModal(true);
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
                    onClick={() => setShowCreateModal(true)}
                    isLoading={isCreatingWorkspace}
                />
                <QuickLinks onOpenProjectModal={handleOpenProjectModal} />
            </div>

            <RecentWorkspaces
                workspaces={recentWorkspaces}
                isRefreshing={isRefreshingWorkspaces}
                onRefresh={() => { setIsRefreshingWorkspaces(true); vscode.postMessage('refreshWorkspaces'); }}
                onSelect={(workspace) => vscode.postMessage('openWorkspaceFolder', { path: workspace.path })}
                onRemove={(workspace) => vscode.postMessage('removeWorkspace', { path: workspace.path })}
                onUpgrade={(workspace) => vscode.postMessage('upgradeCore', { path: workspace.path, version: workspace.coreLatestVersion })}
                onCheckHealth={(workspace) => vscode.postMessage('checkWorkspaceHealth', { path: workspace.path })}
                onExport={(workspace) => vscode.postMessage('exportWorkspace', { path: workspace.path })}
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
            />
            <CreateProjectModal
                isOpen={showProjectModal}
                framework={selectedFramework}
                availableKits={availableKits}
                onClose={() => setShowProjectModal(false)}
                onCreate={handleCreateProject}
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
