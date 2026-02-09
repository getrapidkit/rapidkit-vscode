import { useEffect, useState } from 'react';
import { vscode } from '@/vscode';
import type { ModuleData, CategoryInfo, Workspace, WorkspaceStatus, InstallStatus } from '@/types';
import { Header } from '@/components/Header';
import { SetupCard } from '@/components/SetupCard';
import { HeroAction } from '@/components/HeroAction';
import { QuickLinks } from '@/components/QuickLinks';
import { Features } from '@/components/Features';
import { RecentWorkspaces } from '@/components/RecentWorkspaces';
import { ModuleBrowser } from '@/components/ModuleBrowser';
import { CommandReference } from '@/components/CommandReference';
import { KeyboardShortcuts } from '@/components/KeyboardShortcuts';
import { Footer } from '@/components/Footer';

export function App() {
    const [version] = useState('0.8.2');
    const [recentWorkspaces, setRecentWorkspaces] = useState<Workspace[]>([]);
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
                case 'updateWorkspaceStatus':
                    console.log('[React Webview] Updating workspace status:', message.data);
                    setWorkspaceStatus(message.data);
                    break;
                case 'updateRecentWorkspaces':
                    console.log('[React Webview] Updating workspaces:', message.data);
                    setRecentWorkspaces(message.data);
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
            }
        };

        window.addEventListener('message', messageHandler);

        // Request initial data
        vscode.postMessage('ready');

        return () => window.removeEventListener('message', messageHandler);
    }, []);

    return (
        <div className="container">
            <Header version={version} />

            <SetupCard onClick={() => vscode.postMessage('openSetup')} />

            <div className="mb-8">
                <HeroAction onClick={() => vscode.postMessage('createWorkspace')} />
                <QuickLinks />
            </div>

            <Features />

            <RecentWorkspaces
                workspaces={recentWorkspaces}
                onRefresh={() => vscode.postMessage('refreshWorkspaces')}
                onSelect={(workspace) => vscode.postMessage('openWorkspaceFolder', { path: workspace.path })}
                onRemove={(workspace) => vscode.postMessage('removeWorkspace', { path: workspace.path })}
            />

            <ModuleBrowser
                modules={modulesCatalog}
                workspaceStatus={workspaceStatus}
                categoryInfo={categoryInfo}
                onRefresh={() => vscode.postMessage('refreshModules')}
                onInstall={(module) => vscode.postMessage('installModule', module)}
                onShowDetails={(moduleId) => vscode.postMessage('showModuleDetails', moduleId)}
            />

            <CommandReference />

            <KeyboardShortcuts />

            <Footer />
        </div>
    );
}
