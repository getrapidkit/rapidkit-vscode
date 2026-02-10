import { useState, useEffect } from 'react';
import { X, FolderPlus, AlertCircle } from 'lucide-react';

interface CreateWorkspaceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string) => void;
}

export function CreateWorkspaceModal({ isOpen, onClose, onCreate }: CreateWorkspaceModalProps) {
    const [workspaceName, setWorkspaceName] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setWorkspaceName('');
            setError('');
        }
    }, [isOpen]);

    const validateName = (name: string): boolean => {
        if (!name.trim()) {
            setError('Workspace name is required');
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

        // Check for invalid characters
        if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
            setError('Only letters, numbers, hyphens, and underscores allowed');
            return false;
        }

        setError('');
        return true;
    };

    const handleCreate = () => {
        if (validateName(workspaceName)) {
            onCreate(workspaceName);
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
                        width: '480px',
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
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <FolderPlus size={24} style={{ color: '#00cfc1' }} />
                            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
                                Create Workspace
                            </h2>
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
                        <div style={{ marginBottom: '20px' }}>
                            <label
                                htmlFor="workspace-name"
                                style={{
                                    display: 'block',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    marginBottom: '8px',
                                    color: 'var(--vscode-foreground)',
                                }}
                            >
                                Workspace Name
                            </label>
                            <input
                                id="workspace-name"
                                type="text"
                                value={workspaceName}
                                onChange={(e) => {
                                    setWorkspaceName(e.target.value);
                                    validateName(e.target.value);
                                }}
                                onKeyDown={handleKeyPress}
                                placeholder="my-awesome-workspace"
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
                                        e.target.style.borderColor = '#00cfc1';
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
                            <div style={{ fontWeight: 600, marginBottom: '4px', color: '#00cfc1' }}>
                                💡 Quick Tips:
                            </div>
                            <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                                <li>Use lowercase letters, numbers, hyphens, or underscores</li>
                                <li>Examples: my-project, api_server, backend-2024</li>
                                <li>Will be created at: ~/.RapidKit/rapidkits/[name]</li>
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
                            disabled={!workspaceName.trim() || !!error}
                            style={{
                                padding: '8px 20px',
                                fontSize: '13px',
                                fontWeight: 600,
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: workspaceName.trim() && !error ? '#00cfc1' : '#555',
                                color: 'white',
                                cursor: workspaceName.trim() && !error ? 'pointer' : 'not-allowed',
                                transition: 'all 0.2s',
                                opacity: workspaceName.trim() && !error ? 1 : 0.5,
                            }}
                            onMouseEnter={(e) => {
                                if (workspaceName.trim() && !error) {
                                    e.currentTarget.style.backgroundColor = '#00b8a8';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (workspaceName.trim() && !error) {
                                    e.currentTarget.style.backgroundColor = '#00cfc1';
                                }
                            }}
                        >
                            Create Workspace
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
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
            `}</style>
        </>
    );
}
