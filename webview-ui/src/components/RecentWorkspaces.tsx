import { RefreshCw, Folder, X, CheckCircle2, AlertCircle, XCircle, ArrowUpCircle } from 'lucide-react';
import { useState } from 'react';
import type { Workspace } from '@/types';

interface RecentWorkspacesProps {
    workspaces: Workspace[];
    onRefresh: () => void;
    onSelect: (workspace: Workspace) => void;
    onRemove: (workspace: Workspace) => void;
}

const getStatusIcon = (status?: string) => {
    switch (status) {
        case 'ok':
            return <span title="RapidKit Core installed and up to date"><CheckCircle2 className="w-4 h-4 text-green-500" /></span>;
        case 'update-available':
            return <span title="Update available for RapidKit Core"><ArrowUpCircle className="w-4 h-4 text-yellow-500" /></span>;
        case 'outdated':
            return <span title="RapidKit Core is outdated"><AlertCircle className="w-4 h-4 text-orange-500" /></span>;
        case 'not-installed':
            return <span title="RapidKit Core not installed"><XCircle className="w-4 h-4 text-red-500" /></span>;
        case 'error':
            return <span title="Error checking RapidKit Core status"><AlertCircle className="w-4 h-4 text-gray-500" /></span>;
        default:
            return null;
    }
};

const formatDate = (timestamp?: number): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
};

const getProjectTypeEmoji = (type: 'fastapi' | 'nestjs'): string => {
    return type === 'fastapi' ? '⚡' : '🐱';
};

export function RecentWorkspaces({ workspaces, onRefresh, onSelect, onRemove }: RecentWorkspacesProps) {
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = () => {
        setIsRefreshing(true);
        onRefresh();
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    return (
        <div className="section">
            <div className="section-title">
                <Folder className="w-4 h-4" />
                Recent Workspaces
                <button className="refresh-btn" onClick={handleRefresh} title="Refresh workspaces">
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'spinning' : ''}`} />
                </button>
            </div>

            <div className="workspace-list">
                {workspaces.length === 0 ? (
                    <div className="empty-state">
                        <div className="workspace-empty-icon">📂</div>
                        No recent workspaces found.
                    </div>
                ) : (
                    workspaces.slice(0, 5).map((workspace, index) => (
                        <div
                            key={index}
                            className="ws-card"
                            onClick={() => onSelect(workspace)}
                        >
                            <div className="ws-row-top">
                                <span className="ws-name">{workspace.name}</span>
                                {workspace.coreVersion && (
                                    <span className="ws-tag ws-tag--version" title={`RapidKit Core ${workspace.coreVersion} (${workspace.coreLocation || 'unknown'})`}>
                                        Core v{workspace.coreVersion}
                                    </span>
                                )}
                                {workspace.projectStats?.fastapi && (
                                    <span className="ws-tag ws-tag--fastapi" title={`${workspace.projectStats.fastapi} FastAPI project${workspace.projectStats.fastapi > 1 ? 's' : ''}`}>
                                        {workspace.projectStats.fastapi} FastAPI ⚡
                                    </span>
                                )}
                                {workspace.projectStats?.nestjs && (
                                    <span className="ws-tag ws-tag--nestjs" title={`${workspace.projectStats.nestjs} NestJS project${workspace.projectStats.nestjs > 1 ? 's' : ''}`}>
                                        {workspace.projectStats.nestjs} NestJS 🐱
                                    </span>
                                )}
                                {workspace.projectCount === 0 && (
                                    <span className="ws-tag ws-tag--empty" title="No projects">
                                        0 projects
                                    </span>
                                )}
                                <span className="ws-fill" />
                                {workspace.lastModified && (
                                    <span className="ws-time" title={new Date(workspace.lastModified).toLocaleString()}>
                                        {formatDate(workspace.lastModified)}
                                    </span>
                                )}
                                {getStatusIcon(workspace.coreStatus)}
                                <button
                                    className="ws-close"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemove(workspace);
                                    }}
                                    title="Remove from list"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                            <div className="ws-row-bottom">
                                {workspace.path}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
