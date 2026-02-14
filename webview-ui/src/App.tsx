import { useEffect, useState } from 'react';
import { vscode } from '@/vscode';
import type { ModuleData, CategoryInfo, Workspace, WorkspaceStatus, InstallStatus, ExampleWorkspace, Kit } from '@/types';
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
import { CreateWorkspaceModal } from '@/components/CreateWorkspaceModal';
import { CreateProjectModal } from '@/components/CreateProjectModal';
import { InstallModuleModal } from '@/components/InstallModuleModal';

export function App() {
    const [version, setVersion] = useState('0.0.0');
    const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [showInstallModal, setShowInstallModal] = useState(false);
    const [selectedFramework, setSelectedFramework] = useState<'fastapi' | 'nestjs'>('fastapi');
    const [selectedModule, setSelectedModule] = useState<ModuleData | null>(null);
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
            }
        };

        window.addEventListener('message', messageHandler);

        // Request initial data
        vscode.postMessage('ready');

        return () => window.removeEventListener('message', messageHandler);
    }, []);

    const handleCreateWorkspace = (workspaceName: string) => {
        console.log('[React Webview] Creating workspace:', workspaceName);
        vscode.postMessage('createWorkspace', { name: workspaceName });
    };

    const handleOpenProjectModal = (framework: 'fastapi' | 'nestjs', kitName?: string) => {
        setSelectedFramework(framework);
        // If kitName is provided, we can pass it to the modal or directly create project
        // For now, just open modal and let wizard handle kit selection
        setShowProjectModal(true);
    };

    const handleCreateProject = (projectName: string, framework: 'fastapi' | 'nestjs', kitName: string) => {
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

            <SetupCard onClick={() => vscode.postMessage('openSetup')} />

            <div className="mb-8">
                <HeroAction
                    onClick={() => setShowCreateModal(true)}
                    isLoading={isCreatingWorkspace}
                />
                <QuickLinks onOpenProjectModal={handleOpenProjectModal} />
            </div>

            <RecentWorkspaces
                workspaces={recentWorkspaces}
                onRefresh={() => vscode.postMessage('refreshWorkspaces')}
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
            />

            <Features />

            <CreateWorkspaceModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreate={handleCreateWorkspace}
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
            <CommandReference />

            <KeyboardShortcuts />

            <Footer />
        </div>
    );
}
