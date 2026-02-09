import { RefreshCw, Folder, X } from 'lucide-react';
import { useState } from 'react';
import type { Workspace } from '@/types';

interface RecentWorkspacesProps {
    workspaces: Workspace[];
    onRefresh: () => void;
    onSelect: (workspace: Workspace) => void;
    onRemove: (workspace: Workspace) => void;
}

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
                                <div className="workspace-name">{workspace.name}</div>
                                <div className="workspace-path">{workspace.path}</div>
                            </div>
                            <div className="workspace-actions">
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
