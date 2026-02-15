import { GitBranch, Download, ExternalLink, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import type { ExampleWorkspace } from '@/types';

export interface ExampleProject {
    name: string;
    type: 'fastapi' | 'nestjs';
    description: string;
}

interface ExampleWorkspacesProps {
    examples: ExampleWorkspace[];
    onClone: (example: ExampleWorkspace) => void;
    onUpdate?: (example: ExampleWorkspace) => void;
    cloningExample?: string | null;
    updatingExample?: string | null;
}

const getProjectTypeEmoji = (type: 'fastapi' | 'nestjs'): string => {
    return type === 'fastapi' ? '⚡' : '🐱';
};

const getStatusBadge = (status?: 'not-cloned' | 'cloned' | 'update-available') => {
    switch (status) {
        case 'cloned':
            return (
                <span className="status-badge status-badge--success">
                    <CheckCircle2 size={12} />
                    Cloned
                </span>
            );
        case 'update-available':
            return (
                <span className="status-badge status-badge--warning">
                    <RefreshCw size={12} />
                    Update Available
                </span>
            );
        default:
            return null;
    }
};

export function ExampleWorkspaces({ examples, onClone, onUpdate, cloningExample, updatingExample }: ExampleWorkspacesProps) {
    const [expandedExample, setExpandedExample] = useState<string | null>(null);

    if (examples.length === 0) {
        return null;
    }

    return (
        <div className="section">
            <div className="section-title">
                <GitBranch className="w-6 h-6" />
                Example Workspaces
            </div>

            <div className="example-workspace-grid">
                {examples.map((example) => {
                    const isCloning = cloningExample === example.name;
                    const isUpdating = updatingExample === example.name;
                    const isExpanded = expandedExample === example.name;
                    const cloneStatus = example.cloneStatus || 'not-cloned';
                    const isCloned = cloneStatus === 'cloned' || cloneStatus === 'update-available';
                    const hasUpdate = cloneStatus === 'update-available';

                    return (
                        <div
                            key={example.name}
                            className="example-card"
                        >
                            <div className="example-header">
                                <div className="example-info">
                                    <div className="example-title">
                                        {example.title}
                                        {example.tags && example.tags.length > 0 && (
                                            <div className="example-tags">
                                                {example.tags.map((tag, idx) => (
                                                    <span key={idx} className="example-tag">{tag}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="example-description">{example.description}</div>
                                </div>
                                <div className="example-actions">
                                    <button
                                        className="example-btn example-btn--secondary"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(example.repoUrl, '_blank');
                                        }}
                                        title="View on GitHub"
                                        disabled={isCloning || isUpdating}
                                    >
                                        <ExternalLink size={14} />
                                    </button>

                                    {hasUpdate && onUpdate ? (
                                        <button
                                            className="example-btn example-btn--warning"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onUpdate(example);
                                            }}
                                            disabled={isUpdating || isCloning}
                                            title="Update to latest version"
                                        >
                                            {isUpdating ? (
                                                <>
                                                    <Loader2 size={14} className="spinning" />
                                                    Updating...
                                                </>
                                            ) : (
                                                <>
                                                    <RefreshCw size={14} />
                                                    Update
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <button
                                            className={`example-btn ${isCloned ? 'example-btn--success' : 'example-btn--primary'}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (!isCloned) {
                                                    onClone(example);
                                                }
                                            }}
                                            disabled={isCloning || isUpdating || isCloned}
                                            title={isCloned ? 'Already cloned' : 'Clone and Import'}
                                        >
                                            {isCloning ? (
                                                <>
                                                    <Loader2 size={14} className="spinning" />
                                                    Cloning...
                                                </>
                                            ) : isCloned ? (
                                                <>
                                                    <CheckCircle2 size={14} />
                                                    Cloned
                                                </>
                                            ) : (
                                                <>
                                                    <Download size={14} />
                                                    Clone
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Projects list - collapsible */}
                            <div className="example-projects">
                                <button
                                    className="example-projects-toggle"
                                    onClick={() => setExpandedExample(isExpanded ? null : example.name)}
                                >
                                    <span className="example-projects-count">
                                        {example.projects.length} {example.projects.length === 1 ? 'project' : 'projects'}
                                    </span>
                                    <span className={`example-chevron ${isExpanded ? 'expanded' : ''}`}>▼</span>
                                </button>
                                {isExpanded && (
                                    <div className="example-projects-list">
                                        {example.projects.map((project, idx) => (
                                            <div key={idx} className="example-project">
                                                <span className="example-project-emoji">{getProjectTypeEmoji(project.type)}</span>
                                                <div className="example-project-info">
                                                    <div className="example-project-name">{project.name}</div>
                                                    <div className="example-project-desc">{project.description}</div>
                                                </div>
                                                <span className="example-project-type">{project.type}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="example-footer">
                💡 These workspaces will be automatically imported to your workspace list after cloning.
            </div>
        </div>
    );
}
