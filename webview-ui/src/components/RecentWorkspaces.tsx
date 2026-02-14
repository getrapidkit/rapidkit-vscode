import { RefreshCw, Folder, X, CheckCircle2, AlertCircle, XCircle, ArrowUpCircle, Stethoscope, Upload } from 'lucide-react';
import { useState } from 'react';
import type { Workspace } from '@/types';

interface RecentWorkspacesProps {
    workspaces: Workspace[];
    onRefresh: () => void;
    onSelect: (workspace: Workspace) => void;
    onRemove: (workspace: Workspace) => void;
    onUpgrade?: (workspace: Workspace) => void;
    onCheckHealth?: (workspace: Workspace) => void;
    onExport?: (workspace: Workspace) => void;
}

const getStatusIcon = (status?: string) => {
    switch (status) {
        case 'up-to-date':
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

export function RecentWorkspaces({ workspaces, onRefresh, onSelect, onRemove, onUpgrade, onCheckHealth, onExport }: RecentWorkspacesProps) {
    const [isRefreshing, setIsRefreshing] = useState(false);

    const recentWorkspaces = [...workspaces]
        .sort((left, right) => {
            const leftTs = left.lastAccessed ?? left.lastModified ?? 0;
            const rightTs = right.lastAccessed ?? right.lastModified ?? 0;
            return rightTs - leftTs;
        })
        .slice(0, 5);

    const handleRefresh = () => {
        setIsRefreshing(true);
        onRefresh();
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    return (
        <div className="section">
            <div className="section-title">
                <Folder className="w-6 h-6" />
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
                    recentWorkspaces.map((workspace, index) => (
                        (() => {
                            const shouldShowUpgrade =
                                workspace.coreStatus === 'update-available' &&
                                !!onUpgrade &&
                                !!workspace.coreLatestVersion;

                            return (
                                <div
                                    key={index}
                                    className="ws-card"
                                    onClick={() => onSelect(workspace)}
                                >
                                    <div className="ws-row-top">
                                        <span className="ws-name">{workspace.name}</span>

                                        {/* Version badge - only on hover */}
                                        {workspace.coreVersion && (
                                            <span className="ws-tag ws-tag--version ws-hover-show" title={`RapidKit Core ${workspace.coreVersion} (${workspace.coreLocation || 'unknown'})`}>
                                                v{workspace.coreVersion}
                                            </span>
                                        )}

                                        {/* Project count - always visible */}
                                        {workspace.projectCount !== undefined && (
                                            <span className="ws-tag ws-tag--projects" title={`${workspace.projectCount} project${workspace.projectCount !== 1 ? 's' : ''}`}>
                                                {workspace.projectCount} {workspace.projectCount === 1 ? 'project' : 'projects'}
                                            </span>
                                        )}

                                        <span className="ws-fill" />

                                        {/* Time - only on hover */}
                                        {workspace.lastModified && (
                                            <span className="ws-time ws-hover-show" title={new Date(workspace.lastModified).toLocaleString()}>
                                                {formatDate(workspace.lastModified)}
                                            </span>
                                        )}

                                        {/* Status icon - always visible */}
                                        {!shouldShowUpgrade && getStatusIcon(workspace.coreStatus)}

                                        {/* Action buttons - only on hover */}
                                        {onCheckHealth && (
                                            <button
                                                className="ws-doctor-btn ws-hover-show"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onCheckHealth(workspace);
                                                }}
                                                title="Check Workspace Health (Doctor)"
                                            >
                                                <Stethoscope size={14} />
                                            </button>
                                        )}
                                        {onExport && (
                                            <button
                                                className="ws-export-btn ws-hover-show"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onExport(workspace);
                                                }}
                                                title="Export Workspace"
                                            >
                                                <Upload size={14} />
                                            </button>
                                        )}
                                        {shouldShowUpgrade && (
                                            <button
                                                className="ws-upgrade-btn ws-hover-show"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onUpgrade(workspace);
                                                }}
                                                title={`Upgrade to v${workspace.coreLatestVersion}`}
                                            >
                                                <ArrowUpCircle size={14} />
                                            </button>
                                        )}
                                        <button
                                            className="ws-close ws-hover-show"
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
                            );
                        })()
                    ))
                )}
            </div>
        </div>
    );
}
