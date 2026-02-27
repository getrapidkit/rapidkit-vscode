import { useState, useEffect } from 'react';
import { X, FolderPlus, AlertCircle } from 'lucide-react';
import type { WorkspaceToolStatus } from '@/types';

export type WorkspaceProfile = 'minimal' | 'python-only' | 'node-only' | 'go-only' | 'polyglot' | 'enterprise';
export type WorkspaceInstallMethod = 'auto' | 'poetry' | 'venv' | 'pipx';

export interface WorkspaceCreationConfig {
    name: string;
    profile: WorkspaceProfile;
    installMethod: WorkspaceInstallMethod;
    initGit: boolean;
    policyMode: 'warn' | 'strict';
    dependencySharing: 'isolated' | 'shared';
}

interface CreateWorkspaceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (config: WorkspaceCreationConfig) => void;
    toolStatus?: WorkspaceToolStatus | null;
}

const PROFILES: { value: WorkspaceProfile; icon: string; label: string; desc: string }[] = [
    { value: 'minimal', icon: '⚡', label: 'Minimal', desc: 'Files only' },
    { value: 'python-only', icon: '🐍', label: 'Python', desc: 'Poetry/venv' },
    { value: 'node-only', icon: '🟩', label: 'Node.js', desc: 'npm/NestJS' },
    { value: 'go-only', icon: '🔵', label: 'Go', desc: 'Go runtime' },
    { value: 'polyglot', icon: '⊞', label: 'Polyglot', desc: 'Py+Node+Go' },
    { value: 'enterprise', icon: '🛡️', label: 'Enterprise', desc: '+Governance' },
];

const INSTALL_METHODS: { value: WorkspaceInstallMethod; label: string; desc: string }[] = [
    { value: 'auto', label: 'Auto-detect', desc: 'Poetry if installed, else venv' },
    { value: 'poetry', label: 'Poetry', desc: 'Force Poetry (must be installed)' },
    { value: 'venv', label: 'venv', desc: 'Pure Python venv + pip' },
    { value: 'pipx', label: 'pipx', desc: 'Isolated pipx environments' },
];

export function CreateWorkspaceModal({ isOpen, onClose, onCreate, toolStatus }: CreateWorkspaceModalProps) {
    const [workspaceName, setWorkspaceName] = useState('');
    const [error, setError] = useState('');
    const [profile, setProfile] = useState<WorkspaceProfile>('minimal');
    const [installMethod, setInstallMethod] = useState<WorkspaceInstallMethod>('auto');
    const [initGit, setInitGit] = useState(true);
    const [strictPolicy, setStrictPolicy] = useState(false);
    const [depSharing, setDepSharing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setWorkspaceName('');
            setError('');
            setProfile('minimal');
            setInstallMethod('auto');
            setInitGit(true);
            setStrictPolicy(false);
            setDepSharing(false);
            // Prevent background from scrolling while modal is open
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || !toolStatus) {
            return;
        }

        setInstallMethod(toolStatus.preferredInstallMethod);
    }, [isOpen, toolStatus]);

    const isInstallMethodEnabled = (method: WorkspaceInstallMethod): boolean => {
        if (!toolStatus) {
            return true;
        }
        if (method === 'auto') {
            return true;
        }
        if (method === 'poetry') {
            return toolStatus.poetryAvailable;
        }
        if (method === 'venv') {
            return toolStatus.venvAvailable;
        }
        if (method === 'pipx') {
            return toolStatus.pipxAvailable;
        }
        return true;
    };

    const getInstallMethodDisabledReason = (method: WorkspaceInstallMethod): string | null => {
        if (!toolStatus || isInstallMethodEnabled(method)) {
            return null;
        }

        if (method === 'poetry') {
            return 'Poetry is not detected on this system';
        }
        if (method === 'pipx') {
            return 'pipx is not detected on this system';
        }
        if (method === 'venv') {
            return 'Python venv support is not available';
        }

        return null;
    };

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
        if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
            setError('Only letters, numbers, hyphens, and underscores allowed');
            return false;
        }
        setError('');
        return true;
    };

    const handleCreate = () => {
        if (validateName(workspaceName)) {
            onCreate({
                name: workspaceName,
                profile,
                installMethod,
                initGit,
                policyMode: strictPolicy ? 'strict' : 'warn',
                dependencySharing: depSharing ? 'shared' : 'isolated',
            });
            onClose();
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') { handleCreate(); }
        else if (e.key === 'Escape') { onClose(); }
    };

    if (!isOpen) return null;

    /* ── shared tokens ──────────────────────────────────────────────────── */
    const teal = '#00cfc1';
    const cardBase: React.CSSProperties = {
        padding: '8px 6px',
        borderRadius: '8px',
        border: '1.5px solid var(--vscode-panel-border)',
        backgroundColor: 'var(--vscode-input-background)',
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'border-color 0.15s, background-color 0.15s',
        userSelect: 'none',
    };

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.55)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 9998,
                    animation: 'fadeIn 0.2s ease-out',
                }}
            />

            {/* Modal */}
            <div style={{
                position: 'fixed', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 9999,
                animation: 'slideUp 0.25s ease-out',
                width: '540px',
                maxWidth: '94vw',
                maxHeight: '92vh',
                overflow: 'auto',
            }}>
                <div style={{
                    backgroundColor: 'var(--vscode-editor-background)',
                    border: '1px solid var(--vscode-panel-border)',
                    borderRadius: '12px',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
                }}>

                    {/* ── Header ─────────────────────────────────────────── */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '18px 24px',
                        borderBottom: '1px solid var(--vscode-panel-border)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <FolderPlus size={22} style={{ color: teal }} />
                            <span style={{ fontSize: '16px', fontWeight: 600 }}>Create Workspace</span>
                        </div>
                        <button onClick={onClose} style={{
                            background: 'transparent', border: 'none',
                            color: 'var(--vscode-foreground)', cursor: 'pointer',
                            opacity: 0.6, padding: '4px', display: 'flex', alignItems: 'center',
                            transition: 'opacity 0.2s',
                        }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                            onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* ── Body ───────────────────────────────────────────── */}
                    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        {/* Name */}
                        <div>
                            <label style={labelStyle}>Workspace Name</label>
                            <input
                                type="text"
                                value={workspaceName}
                                onChange={e => { setWorkspaceName(e.target.value); validateName(e.target.value); }}
                                onKeyDown={handleKeyPress}
                                placeholder="my-awesome-workspace"
                                autoFocus
                                style={{
                                    width: '100%', padding: '9px 12px', fontSize: '14px',
                                    backgroundColor: 'var(--vscode-input-background)',
                                    color: 'var(--vscode-input-foreground)',
                                    border: `1px solid ${error ? 'var(--vscode-errorForeground)' : 'var(--vscode-input-border)'}`,
                                    borderRadius: '6px', outline: 'none', boxSizing: 'border-box',
                                    fontFamily: 'var(--vscode-font-family)',
                                    transition: 'border-color 0.2s',
                                }}
                                onFocus={e => { if (!error) e.target.style.borderColor = teal; }}
                                onBlur={e => { if (!error) e.target.style.borderColor = 'var(--vscode-input-border)'; }}
                            />
                            {error ? (
                                <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '5px', color: '#f44336', fontSize: '12px' }}>
                                    <AlertCircle size={13} /><span>{error}</span>
                                </div>
                            ) : workspaceName ? (
                                <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--vscode-descriptionForeground)', opacity: 0.8 }}>
                                    📁 ~/RapidKit/rapidkits/<strong>{workspaceName}</strong>
                                </div>
                            ) : null}
                        </div>

                        {/* Profile */}
                        <div>
                            <label style={labelStyle}>Bootstrap Profile</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                {PROFILES.map(p => (
                                    <div
                                        key={p.value}
                                        role="radio"
                                        aria-checked={profile === p.value}
                                        tabIndex={0}
                                        onClick={() => setProfile(p.value)}
                                        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setProfile(p.value)}
                                        style={{
                                            ...cardBase,
                                            borderColor: profile === p.value ? teal : 'var(--vscode-panel-border)',
                                            backgroundColor: profile === p.value
                                                ? 'rgba(0,207,193,0.08)'
                                                : 'var(--vscode-input-background)',
                                            boxShadow: profile === p.value ? `0 0 0 1px ${teal}` : 'none',
                                        }}
                                    >
                                        <div style={{ fontSize: '18px', marginBottom: '3px' }}>{p.icon}</div>
                                        <div style={{ fontSize: '11px', fontWeight: 600, color: profile === p.value ? teal : 'var(--vscode-foreground)' }}>{p.label}</div>
                                        <div style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)', marginTop: '2px' }}>{p.desc}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Install Method */}
                        <div>
                            <label style={labelStyle}>Install Method</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                {INSTALL_METHODS.map(m => {
                                    const enabled = isInstallMethodEnabled(m.value);
                                    const disabledReason = getInstallMethodDisabledReason(m.value);
                                    return (
                                        <div
                                            key={m.value}
                                            role="radio"
                                            aria-checked={installMethod === m.value}
                                            tabIndex={enabled ? 0 : -1}
                                            onClick={() => enabled && setInstallMethod(m.value)}
                                            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && enabled && setInstallMethod(m.value)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '8px',
                                                padding: '8px 10px', borderRadius: '6px', cursor: enabled ? 'pointer' : 'not-allowed',
                                                border: `1.5px solid ${installMethod === m.value ? teal : 'var(--vscode-panel-border)'}`,
                                                backgroundColor: installMethod === m.value ? 'rgba(0,207,193,0.07)' : 'var(--vscode-input-background)',
                                                opacity: enabled ? 1 : 0.45,
                                                transition: 'border-color 0.15s',
                                                userSelect: 'none',
                                            }}
                                            title={enabled ? '' : `${m.label} is not available on this system`}
                                        >
                                            <div style={{
                                                width: '14px', height: '14px', borderRadius: '50%', flexShrink: 0,
                                                border: `2px solid ${installMethod === m.value ? teal : 'var(--vscode-descriptionForeground)'}`,
                                                backgroundColor: installMethod === m.value ? teal : 'transparent',
                                                transition: 'all 0.15s',
                                            }} />
                                            <div>
                                                <div style={{ fontSize: '12px', fontWeight: 600 }}>{m.label}</div>
                                                <div style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)' }}>{m.desc}</div>
                                                {disabledReason && (
                                                    <div style={{ fontSize: '10px', color: 'var(--vscode-errorForeground)', marginTop: '2px' }}>
                                                        {disabledReason}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {toolStatus && (
                                <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--vscode-descriptionForeground)' }}>
                                    Active: <strong>{toolStatus.preferredInstallMethod}</strong>
                                </div>
                            )}
                        </div>

                        {/* Options */}
                        <div>
                            <label style={labelStyle}>Options</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {[
                                    { checked: initGit, toggle: () => setInitGit(v => !v), icon: '⎇', label: 'Initialize Git repository', desc: 'Run git init and create an initial commit' },
                                    { checked: strictPolicy, toggle: () => setStrictPolicy(v => !v), icon: '🛡', label: 'Strict policy enforcement', desc: 'Fail CI on any violation (default: warn-only)' },
                                    { checked: depSharing, toggle: () => setDepSharing(v => !v), icon: '📦', label: 'Enable dependency sharing', desc: 'Share packages across projects (default: isolated)' },
                                ].map((opt, i) => (
                                    <div
                                        key={i}
                                        role="checkbox"
                                        aria-checked={opt.checked}
                                        tabIndex={0}
                                        onClick={opt.toggle}
                                        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && opt.toggle()}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '10px',
                                            padding: '8px 10px', borderRadius: '6px', cursor: 'pointer',
                                            border: `1px solid ${opt.checked ? teal : 'var(--vscode-panel-border)'}`,
                                            backgroundColor: opt.checked ? 'rgba(0,207,193,0.06)' : 'transparent',
                                            transition: 'border-color 0.15s, background-color 0.15s',
                                            userSelect: 'none',
                                        }}
                                    >
                                        <div style={{
                                            width: '16px', height: '16px', borderRadius: '3px', flexShrink: 0,
                                            border: `2px solid ${opt.checked ? teal : 'var(--vscode-descriptionForeground)'}`,
                                            backgroundColor: opt.checked ? teal : 'transparent',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            transition: 'all 0.15s',
                                        }}>
                                            {opt.checked && <span style={{ color: '#000', fontSize: '10px', lineHeight: 1, fontWeight: 900 }}>✓</span>}
                                        </div>
                                        <span style={{ fontSize: '12px', marginRight: '4px' }}>{opt.icon}</span>
                                        <div>
                                            <div style={{ fontSize: '12px', fontWeight: 600 }}>{opt.label}</div>
                                            <div style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)' }}>{opt.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* ── Footer ─────────────────────────────────────────── */}
                    <div style={{
                        display: 'flex', justifyContent: 'flex-end', gap: '10px',
                        padding: '14px 24px',
                        borderTop: '1px solid var(--vscode-panel-border)',
                    }}>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '7px 16px', fontSize: '13px', fontWeight: 500,
                                borderRadius: '6px',
                                border: '1px solid var(--vscode-button-border)',
                                backgroundColor: 'var(--vscode-button-secondaryBackground)',
                                color: 'var(--vscode-button-secondaryForeground)',
                                cursor: 'pointer',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--vscode-button-secondaryHoverBackground)')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--vscode-button-secondaryBackground)')}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={!workspaceName.trim() || !!error}
                            style={{
                                padding: '7px 20px', fontSize: '13px', fontWeight: 600,
                                borderRadius: '6px', border: 'none',
                                backgroundColor: workspaceName.trim() && !error ? teal : 'var(--vscode-button-secondaryBackground)',
                                color: 'var(--vscode-button-foreground)',
                                cursor: workspaceName.trim() && !error ? 'pointer' : 'not-allowed',
                                opacity: workspaceName.trim() && !error ? 1 : 0.5,
                                transition: 'background-color 0.2s, opacity 0.2s',
                            }}
                            onMouseEnter={e => { if (workspaceName.trim() && !error) e.currentTarget.style.backgroundColor = '#00b8a8'; }}
                            onMouseLeave={e => { if (workspaceName.trim() && !error) e.currentTarget.style.backgroundColor = teal; }}
                        >
                            Create Workspace
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp {
                    from { opacity: 0; transform: translate(-50%, -45%); }
                    to   { opacity: 1; transform: translate(-50%, -50%); }
                }
            `}</style>
        </>
    );
}

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    marginBottom: '8px',
    color: 'var(--vscode-foreground)',
    opacity: 0.85,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
};
