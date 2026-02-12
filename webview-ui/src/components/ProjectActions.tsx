import { Terminal, Package, Play, Square, TestTube, Globe, Hammer } from 'lucide-react';
import type { WorkspaceStatus } from '@/types';

interface ProjectActionsProps {
    workspaceStatus: WorkspaceStatus;
    onTerminal: () => void;
    onInit: () => void;
    onDev: () => void;
    onStop: () => void;
    onTest: () => void;
    onBrowser: () => void;
    onBuild: () => void;
}

export function ProjectActions({
    workspaceStatus,
    onTerminal,
    onInit,
    onDev,
    onStop,
    onTest,
    onBrowser,
    onBuild
}: ProjectActionsProps) {
    if (!workspaceStatus.hasWorkspace) {
        return null;
    }

    const isRunning = workspaceStatus.isRunning || false;

    return (
        <div className="project-actions-section">
            <div className="project-actions-header">
                <Package className="w-4 h-4" />
                <span>Project Actions</span>
                {workspaceStatus.workspaceName && (
                    <span className="project-actions-name">{workspaceStatus.workspaceName}</span>
                )}
            </div>
            <div className="project-actions-grid">
                <button
                    className="project-action-btn"
                    onClick={onTerminal}
                    title="Open Terminal"
                >
                    <Terminal size={18} />
                    <span>Terminal</span>
                </button>
                <button
                    className="project-action-btn"
                    onClick={onInit}
                    title="Install Dependencies"
                >
                    <Package size={18} />
                    <span>Init</span>
                </button>
                {!isRunning ? (
                    <button
                        className="project-action-btn project-action-btn--primary"
                        onClick={onDev}
                        title="Start Dev Server"
                    >
                        <Play size={18} />
                        <span>Dev</span>
                    </button>
                ) : (
                    <button
                        className="project-action-btn project-action-btn--danger"
                        onClick={onStop}
                        title="Stop Server"
                    >
                        <Square size={18} />
                        <span>Stop</span>
                    </button>
                )}
                <button
                    className="project-action-btn"
                    onClick={onTest}
                    title="Run Tests"
                >
                    <TestTube size={18} />
                    <span>Test</span>
                </button>
                <button
                    className="project-action-btn"
                    onClick={onBrowser}
                    title={isRunning ? `Open in Browser (port ${workspaceStatus.runningPort || 8000})` : "Start server first"}
                    disabled={!isRunning}
                >
                    <Globe size={18} />
                    <span>Browser</span>
                </button>
                <button
                    className="project-action-btn project-action-btn--build"
                    onClick={onBuild}
                    title="Build Project"
                >
                    <Hammer size={18} />
                    <span>Build</span>
                </button>
            </div>
        </div>
    );
}
