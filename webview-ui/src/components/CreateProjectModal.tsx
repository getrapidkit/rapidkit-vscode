import { useState, useEffect } from 'react';
import { X, Code, AlertCircle, Package } from 'lucide-react';
import type { Kit } from '@/types';

interface CreateProjectModalProps {
    isOpen: boolean;
    framework: 'fastapi' | 'nestjs' | 'go';
    availableKits: Kit[];
    onClose: () => void;
    onCreate: (name: string, framework: 'fastapi' | 'nestjs' | 'go', kitName: string) => void;
}

export function CreateProjectModal({ isOpen, framework, availableKits, onClose, onCreate }: CreateProjectModalProps) {
    const [projectName, setProjectName] = useState('');
    const [selectedKit, setSelectedKit] = useState('');
    const [error, setError] = useState('');

    // Filter kits by framework
    const frameworkKits = availableKits.filter(kit => kit.category === framework);

    useEffect(() => {
        if (isOpen) {
            setProjectName('');
            setError('');
            // Auto-select first kit
            const kits = availableKits.filter(kit => kit.category === framework);
            setSelectedKit(kits.length > 0 ? kits[0].name : '');
        }
    }, [isOpen, framework, availableKits]);

    const frameworkInfo = {
        fastapi: {
            iconUrl: (window as any).FASTAPI_ICON_URI,
            title: 'FastAPI Project',
            subtitle: 'Python + Async',
            color: '#009688',
            description: 'Modern, fast (high-performance) Python web framework'
        },
        nestjs: {
            iconUrl: (window as any).NESTJS_ICON_URI,
            title: 'NestJS Project',
            subtitle: 'TypeScript + DI',
            color: '#E0234E',
            description: 'Progressive Node.js framework for building scalable applications'
        },
        go: {
            iconUrl: (window as any).GO_ICON_URI,
            title: 'Go Project',
            subtitle: 'Go + High Performance',
            color: '#00ADD8',
            description: 'High-performance Go web service using Fiber or Gin'
        }
    };

    const info = frameworkInfo[framework];

    const validateName = (name: string): boolean => {
        if (!name.trim()) {
            setError('Project name is required');
            return false;
        }

        if (name.length < 2) {
            setError('Name must be at least 2 characters');
            return false;
        }

        if (name.length > 50) {
            setError('Name must be less than 50 characters');
            return false;
        }

        // Check for invalid characters (allow alphanumeric, hyphens, underscores)
        if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
            setError('Only letters, numbers, hyphens, and underscores allowed');
            return false;
        }

        setError('');
        return true;
    };

    const handleCreate = () => {
        if (validateName(projectName) && selectedKit) {
            onCreate(projectName, framework, selectedKit);
            onClose();
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleCreate();
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="modal-backdrop"
                onClick={onClose}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 9998,
                    animation: 'fadeIn 0.2s ease-out',
                }}
            />

            {/* Modal */}
            <div
                className="modal-container"
                style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 9999,
                    animation: 'slideUp 0.3s ease-out',
                }}
            >
                <div
                    className="modal-content"
                    style={{
                        backgroundColor: 'var(--vscode-editor-background)',
                        border: '1px solid var(--vscode-panel-border)',
                        borderRadius: '12px',
                        width: '500px',
                        maxWidth: '90vw',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                    }}
                >
                    {/* Header */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '20px 24px',
                            borderBottom: '1px solid var(--vscode-panel-border)',
                            background: `linear-gradient(135deg, ${info.color}10, transparent)`,
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '8px',
                                background: `${info.color}15`,
                                border: `1px solid ${info.color}30`,
                                padding: '8px'
                            }}>
                                <img
                                    src={info.iconUrl}
                                    alt={framework}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'contain',
                                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
                                    }}
                                />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
                                    {info.title}
                                </h2>
                                <p style={{
                                    fontSize: '12px',
                                    margin: '4px 0 0 0',
                                    color: 'var(--vscode-descriptionForeground)',
                                    opacity: 0.8
                                }}>
                                    {info.subtitle}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--vscode-foreground)',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                opacity: 0.7,
                                transition: 'opacity 0.2s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <div style={{ padding: '24px' }}>
                        {/* Framework Description */}
                        <div style={{
                            marginBottom: '20px',
                            padding: '12px 16px',
                            backgroundColor: 'var(--vscode-textCodeBlock-background)',
                            borderLeft: `3px solid ${info.color}`,
                            borderRadius: '4px',
                            fontSize: '13px',
                            color: 'var(--vscode-descriptionForeground)',
                        }}>
                            {info.description}
                        </div>

                        {/* Project Name Input */}
                        <div style={{ marginBottom: '20px' }}>
                            <label
                                htmlFor="project-name"
                                style={{
                                    display: 'block',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    marginBottom: '8px',
                                    color: 'var(--vscode-foreground)',
                                }}
                            >
                                Project Name
                            </label>
                            <input
                                id="project-name"
                                type="text"
                                value={projectName}
                                onChange={(e) => {
                                    setProjectName(e.target.value);
                                    validateName(e.target.value);
                                }}
                                onKeyDown={handleKeyPress}
                                placeholder={framework === 'fastapi' ? 'my-fastapi-api' : framework === 'nestjs' ? 'my-nestjs-app' : 'my-go-service'}
                                autoFocus
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    fontSize: '14px',
                                    backgroundColor: 'var(--vscode-input-background)',
                                    color: 'var(--vscode-input-foreground)',
                                    border: `1px solid ${error ? '#f44336' : 'var(--vscode-input-border)'}`,
                                    borderRadius: '6px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s',
                                    fontFamily: 'var(--vscode-font-family)',
                                }}
                                onFocus={(e) => {
                                    if (!error) {
                                        e.target.style.borderColor = info.color;
                                    }
                                }}
                                onBlur={(e) => {
                                    if (!error) {
                                        e.target.style.borderColor = 'var(--vscode-input-border)';
                                    }
                                }}
                            />
                            {error && (
                                <div
                                    style={{
                                        marginTop: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        color: '#f44336',
                                        fontSize: '12px',
                                    }}
                                >
                                    <AlertCircle size={14} />
                                    <span>{error}</span>
                                </div>
                            )}
                        </div>

                        {/* Kit Selection */}
                        <div style={{ marginBottom: '20px' }}>
                            <label
                                htmlFor="kit-select"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    marginBottom: '8px',
                                    color: 'var(--vscode-foreground)',
                                }}
                            >
                                <Package size={14} />
                                Kit Template
                            </label>
                            <select
                                id="kit-select"
                                value={selectedKit}
                                onChange={(e) => setSelectedKit(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    fontSize: '14px',
                                    backgroundColor: 'var(--vscode-input-background)',
                                    color: 'var(--vscode-input-foreground)',
                                    border: '1px solid var(--vscode-input-border)',
                                    borderRadius: '6px',
                                    outline: 'none',
                                    cursor: 'pointer',
                                    fontFamily: 'var(--vscode-font-family)',
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = info.color;
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'var(--vscode-input-border)';
                                }}
                            >
                                {frameworkKits.length === 0 && (
                                    <option value="">Loading kits...</option>
                                )}
                                {frameworkKits.map((kit) => (
                                    <option key={kit.name} value={kit.name}>
                                        {kit.display_name} {kit.tags && kit.tags.length > 0 && `— ${kit.tags.join(', ')}`}
                                    </option>
                                ))}
                            </select>
                            {selectedKit && frameworkKits.find(k => k.name === selectedKit) && (
                                <div
                                    style={{
                                        marginTop: '8px',
                                        padding: '8px 10px',
                                        backgroundColor: `${info.color}08`,
                                        border: `1px solid ${info.color}20`,
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        color: 'var(--vscode-descriptionForeground)',
                                        lineHeight: '1.4',
                                    }}
                                >
                                    {frameworkKits.find(k => k.name === selectedKit)?.description}
                                </div>
                            )}
                        </div>

                        {/* Quick Tips */}
                        <div
                            style={{
                                padding: '12px',
                                backgroundColor: 'var(--vscode-textCodeBlock-background)',
                                borderRadius: '6px',
                                fontSize: '12px',
                                color: 'var(--vscode-descriptionForeground)',
                                lineHeight: '1.5',
                            }}
                        >
                            <div style={{ fontWeight: 600, marginBottom: '4px', color: info.color }}>
                                💡 Quick Tips:
                            </div>
                            <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                                <li>Use lowercase letters, numbers, hyphens, or underscores</li>
                                <li>Examples: {framework === 'fastapi' ? 'my-api, backend-service, api_v2' : framework === 'nestjs' ? 'my-app, admin-panel, service_core' : 'my-service, go-api, fiber_app'}</li>
                                <li>Project will be created in the current workspace</li>
                            </ul>
                        </div>
                    </div>

                    {/* Footer */}
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '12px',
                            padding: '16px 24px',
                            borderTop: '1px solid var(--vscode-panel-border)',
                        }}
                    >
                        <button
                            onClick={onClose}
                            style={{
                                padding: '8px 16px',
                                fontSize: '13px',
                                fontWeight: 500,
                                borderRadius: '6px',
                                border: '1px solid var(--vscode-button-border)',
                                backgroundColor: 'var(--vscode-button-secondaryBackground)',
                                color: 'var(--vscode-button-secondaryForeground)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                    'var(--vscode-button-secondaryHoverBackground)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                    'var(--vscode-button-secondaryBackground)';
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={!projectName.trim() || !!error}
                            style={{
                                padding: '8px 20px',
                                fontSize: '13px',
                                fontWeight: 600,
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: projectName.trim() && !error ? info.color : '#555',
                                color: 'white',
                                cursor: projectName.trim() && !error ? 'pointer' : 'not-allowed',
                                transition: 'all 0.2s',
                                opacity: projectName.trim() && !error ? 1 : 0.5,
                            }}
                            onMouseEnter={(e) => {
                                if (projectName.trim() && !error) {
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = `0 4px 12px ${info.color}40`;
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            Create Project
                        </button>
                    </div>
                </div>
            </div>

            {/* CSS animations (same as CreateWorkspaceModal) */}
            <style>
                {`
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes slideUp {
                        from { 
                            opacity: 0;
                            transform: translate(-50%, -45%);
                        }
                        to { 
                            opacity: 1;
                            transform: translate(-50%, -50%);
                        }
                    }
                `}
            </style>
        </>
    );
}
