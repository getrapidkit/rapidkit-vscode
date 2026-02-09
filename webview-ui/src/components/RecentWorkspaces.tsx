import { RefreshCw, Folder, X, CheckCircle2, AlertCircle, XCircle, ArrowUpCircle, Clock, Boxes } from 'lucide-react';
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
            return <CheckCircle2 className="w-4 h-4 text-green-500" title="RapidKit Core installed and up to date" />;
        case 'update-available':
            return <ArrowUpCircle className="w-4 h-4 text-yellow-500" title="Update available for RapidKit Core" />;
        case 'outdated':
            return <AlertCircle className="w-4 h-4 text-orange-500" title="RapidKit Core is outdated" />;
        case 'not-installed':
            return <XCircle className="w-4 h-4 text-red-500" title="RapidKit Core not installed" />;
        case 'error':
            return <AlertCircle className="w-4 h-4 text-gray-500" title="Error checking RapidKit Core status" />;
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
                            className="workspace-item"
                            onClick={() => onSelect(workspace)}
                        >
                            <Folder className="workspace-icon" size={20} />
                            <div className="workspace-info">
                                <div className="workspace-name">
                                    {workspace.name}
                                    {workspace.coreVersion && (
                                        <span className="workspace-version" title={`RapidKit Core ${workspace.coreVersion} (${workspace.coreLocation || 'unknown'})`}>
                                            v{workspace.coreVersion}
                                        </span>
                                    )}
                                    {workspace.projectCount !== undefined && workspace.projectCount > 0 && (
                                        <span className="workspace-projects-badge" title={`${workspace.projectCount} project${workspace.projectCount > 1 ? 's' : ''}`}>
                                            <Boxes className="w-3 h-3" />
                                            {workspace.projectCount}
                                            {workspace.projectTypes && workspace.projectTypes.length > 0 && (
                                                <span className="project-types">
                                                    {workspace.projectTypes.map(type => getProjectTypeEmoji(type)).join('')}
                                                </span>
                                            )}
                                        </span>
                                    )}
                                </div>
                                <div className="workspace-path">{workspace.path}</div>
                                <div className="workspace-meta">
                                    {workspace.lastModified && (
                                        <span className="workspace-meta-item" title={new Date(workspace.lastModified).toLocaleString()}>
                                            <Clock className="w-3 h-3" />
                                            {formatDate(workspace.lastModified)}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="workspace-actions">
                                {getStatusIcon(workspace.coreStatus)}
                                <button
                                    className="workspace-remove"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemove(workspace);
                                    }}
                                    title="Remove from list"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
