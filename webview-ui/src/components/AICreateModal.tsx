import { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Wand2, ArrowLeft, Check, ChevronRight, Loader2, Minus } from 'lucide-react';
import type { Kit } from '@/types';

// ─── Plan type (mirrors aiService.ts AICreationPlan) ────────────────────────
export type AICreateProfile =
    | 'minimal'
    | 'python-only'
    | 'node-only'
    | 'go-only'
    | 'polyglot'
    | 'enterprise';

export type AICreateFramework = 'fastapi' | 'nestjs' | 'go';

export interface AICreationPlan {
    type: 'workspace' | 'project';
    workspaceName: string;
    profile: AICreateProfile;
    installMethod: 'auto' | 'poetry' | 'venv' | 'pipx';
    framework: AICreateFramework;
    kit: string;
    projectName: string;
    suggestedModules: string[];
    description: string;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface AICreateModalProps {
    isOpen: boolean;
    mode: 'workspace' | 'project';
    framework?: AICreateFramework;
    plan: AICreationPlan | null;
    isThinking: boolean;
    isCreating: boolean;
    creationStage?: 'workspace_done' | null;
    planError: string | null;
    modelId?: string | null;
    onClose: () => void;
    onPromptSubmit: (prompt: string, mode: 'workspace' | 'project', framework?: string) => void;
    onConfirm: (plan: AICreationPlan) => void;
    onManualFallback: () => void;
}

// ─── Static data ──────────────────────────────────────────────────────────────
const WORKSPACE_PRESETS = [
    'SaaS product with auth + payments + database',
    'REST API backend with user management',
    'Microservice with caching + observability',
    'Admin dashboard API with role-based access',
    'E-commerce API with product catalog + orders',
    'AI assistant backend with LLM integration',
];

const PROJECT_PRESETS: Record<AICreateFramework, string[]> = {
    fastapi: [
        'CRUD API with PostgreSQL + JWT auth',
        'Clean architecture DDD service with layered design',
        'Auth service with OAuth + social login',
        'Background task processor with Redis queue',
        'File upload + processing service',
    ],
    nestjs: [
        'REST API with TypeORM + authentication',
        'Real-time WebSocket service with rooms',
        'GraphQL-like REST API with module architecture',
        'Email notification service with templates',
        'Admin API with role-based permissions',
    ],
    go: [
        'High-performance CRUD API with Postgres',
        'Microservice with health checks + metrics',
        'Auth proxy service with JWT validation',
        'Rate-limited API gateway',
        'Stream processing service with concurrency',
    ],
};

const PROFILE_META: Record<AICreateProfile, { icon: string; label: string; color: string }> = {
    minimal: { icon: '⚡', label: 'Minimal', color: '#6b7280' },
    'python-only': { icon: '🐍', label: 'Python', color: '#3b82f6' },
    'node-only': { icon: '🟩', label: 'Node.js', color: '#22c55e' },
    'go-only': { icon: '🔵', label: 'Go', color: '#06b6d4' },
    polyglot: { icon: '⊞', label: 'Polyglot', color: '#a855f7' },
    enterprise: { icon: '🛡️', label: 'Enterprise', color: '#f59e0b' },
};

const FRAMEWORK_META: Record<AICreateFramework, { icon: string; label: string; color: string }> = {
    fastapi: { icon: '⚡', label: 'FastAPI', color: '#009688' },
    nestjs: { icon: '🔴', label: 'NestJS', color: '#E0234E' },
    go: { icon: '🔵', label: 'Go', color: '#00ADD8' },
};

const MODULE_LABELS: Record<string, string> = {
    'free/auth/core': 'Auth Core',
    'free/auth/oauth': 'OAuth 2.0',
    'free/auth/api_keys': 'API Keys',
    'free/auth/session': 'Sessions',
    'free/database/db_postgres': 'PostgreSQL',
    'free/database/db_mongo': 'MongoDB',
    'free/database/db_sqlite': 'SQLite',
    'free/cache/redis': 'Redis',
    'free/essentials/settings': 'Settings',
    'free/essentials/logging': 'Logging',
    'free/essentials/middleware': 'Middleware',
    'free/essentials/deployment': 'Deployment',
    'free/observability/core': 'Observability',
    'free/billing/stripe_payment': 'Stripe',
    'free/users/users_core': 'Users',
    'free/tasks/celery': 'Celery Jobs',
    'free/ai/ai_assistant': 'AI Assistant',
    'free/security/cors': 'CORS',
    'free/security/security_headers': 'Sec Headers',
    'free/auth/passwordless': 'Passwordless',
    'free/security/rate_limiting': 'Rate Limiting',
    'free/users/users_profiles': 'Profiles',
    'free/business/storage': 'Storage',
    'free/billing/cart': 'Cart',
    'free/billing/inventory': 'Inventory',
    'free/communication/notifications': 'Notifications',
    'free/communication/email': 'Email',
};

// ─── Component ────────────────────────────────────────────────────────────────
export function AICreateModal({
    isOpen,
    mode,
    framework,
    plan,
    isThinking,
    isCreating,
    creationStage,
    planError,
    modelId,
    onClose,
    onPromptSubmit,
    onConfirm,
    onManualFallback,
}: AICreateModalProps) {
    const [prompt, setPrompt] = useState('');
    const [editedWorkspaceName, setEditedWorkspaceName] = useState('');
    const [editedProjectName, setEditedProjectName] = useState('');
    const [isMinimized, setIsMinimized] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Derive current step from props
    const step: 'prompt' | 'thinking' | 'preview' | 'creating' =
        isCreating ? 'creating'
            : isThinking ? 'thinking'
                : plan ? 'preview'
                    : 'prompt';

    // Sync editable names when plan arrives
    useEffect(() => {
        if (plan) {
            setEditedWorkspaceName(plan.workspaceName);
            setEditedProjectName(plan.projectName);
        }
    }, [plan]);

    // Auto-restore minimize when creation finishes
    useEffect(() => {
        if (!isCreating && !isThinking) setIsMinimized(false);
    }, [isCreating, isThinking]);

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setPrompt('');
            setEditedWorkspaceName('');
            setEditedProjectName('');
            setIsMinimized(false);
            document.body.style.overflow = 'hidden';
            setTimeout(() => textareaRef.current?.focus(), 150);
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    // ── Minimized pill ────────────────────────────────────────────────────────
    if (isMinimized) {
        const pillLabel = isCreating ? (creationStage ?? 'Creating…') : 'AI is thinking…';
        return (
            <div className="ai-create-pill" onClick={() => setIsMinimized(false)} role="button" aria-label="Restore AI creation panel">
                <Loader2 size={13} className="ai-create-pill-spinner" />
                <span className="ai-create-pill-label">{pillLabel}</span>
                <span className="ai-create-pill-restore">▲ Restore</span>
            </div>
        );
    }

    const presets = mode === 'project' && framework
        ? PROJECT_PRESETS[framework]
        : WORKSPACE_PRESETS;

    const handleSubmit = () => {
        if (!prompt.trim() || isThinking) return;
        onPromptSubmit(prompt.trim(), mode, framework);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSubmit();
        }
        if (e.key === 'Escape' && !isThinking && !isCreating) {
            onClose();
        }
    };

    const handleConfirm = () => {
        if (!plan) return;
        onConfirm({
            ...plan,
            workspaceName: editedWorkspaceName.trim() || plan.workspaceName,
            projectName: editedProjectName.trim() || plan.projectName,
        });
    };

    const handleStartOver = () => {
        setPrompt('');
        // Trigger reset by calling with empty plan signal
        onPromptSubmit('__reset__', mode, framework);
    };

    const fwMeta = framework ? FRAMEWORK_META[framework] : null;
    const modeLabel = mode === 'workspace' ? 'Workspace' : 'Project';

    return (
        <>
            {/* Backdrop */}
            <div
                className="ai-create-backdrop"
                onClick={!isThinking && !isCreating ? onClose : undefined}
            />

            {/* Modal */}
            <div
                className="ai-create-modal"
                role="dialog"
                aria-modal="true"
                aria-label={`Create ${modeLabel} with AI`}
            >
                {/* ── Header ── */}
                <div className="ai-create-header">
                    <div className="ai-create-header-left">
                        <div className="ai-create-header-icon">
                            <Sparkles size={15} />
                        </div>
                        <div>
                            <div className="ai-create-header-title">
                                Create {modeLabel} with AI
                            </div>
                            <div className="ai-create-header-sub">
                                {fwMeta ? (
                                    <>
                                        <span style={{ color: fwMeta.color }}>{fwMeta.icon}</span>
                                        &nbsp;{fwMeta.label} &bull; Describe what you want to build
                                    </>
                                ) : (
                                    'Describe what you want to build'
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="ai-create-header-right">
                        {modelId && step === 'preview' && (
                            <span className="ai-create-model-badge">✦ {modelId}</span>
                        )}
                        {(step === 'thinking' || step === 'creating') && (
                            <button
                                type="button"
                                className="ai-create-minimize"
                                onClick={() => setIsMinimized(true)}
                                aria-label="Minimize"
                                title="Minimize — continue using the dashboard"
                            >
                                <Minus size={14} />
                            </button>
                        )}
                        {!isThinking && !isCreating && (
                            <button
                                type="button"
                                className="ai-create-close"
                                onClick={onClose}
                                aria-label="Close"
                            >
                                <X size={15} />
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Step: Prompt ── */}
                {step === 'prompt' && (
                    <div className="ai-create-body">
                        {planError && (
                            <div className="ai-create-error">
                                <span>⚠ {planError}</span>
                            </div>
                        )}

                        {/* Preset chips */}
                        <div className="ai-create-presets-label">Quick start</div>
                        <div className="ai-create-presets">
                            {presets.map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    className={`ai-create-preset ${prompt === p ? 'ai-create-preset--active' : ''}`}
                                    onClick={() => setPrompt(p)}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>

                        {/* Textarea */}
                        <div className="ai-create-input-wrap">
                            <textarea
                                ref={textareaRef}
                                className="ai-create-textarea"
                                placeholder={
                                    mode === 'workspace'
                                        ? 'e.g. "E-commerce SaaS with user management, Stripe payments, and PostgreSQL"'
                                        : 'e.g. "CRUD API with JWT auth, PostgreSQL, and clean layered architecture"'
                                }
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={handleKeyDown}
                                rows={3}
                            />
                            <div className="ai-create-input-hint">⌘↵ or Ctrl+Enter to submit</div>
                        </div>

                        {/* Actions */}
                        <div className="ai-create-actions">
                            <button
                                type="button"
                                className="ai-create-submit"
                                onClick={handleSubmit}
                                disabled={!prompt.trim()}
                            >
                                <Wand2 size={14} />
                                Plan with AI
                                <ChevronRight size={14} />
                            </button>
                        </div>

                        <div className="ai-create-manual-link">
                            <button type="button" onClick={onManualFallback}>
                                Switch to manual form
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Step: Thinking ── */}
                {step === 'thinking' && (
                    <div className="ai-create-body ai-create-body--centered">
                        <div className="ai-create-thinking">
                            <div className="ai-create-thinking-orb">
                                <div className="ai-create-thinking-ring ai-create-thinking-ring--1" />
                                <div className="ai-create-thinking-ring ai-create-thinking-ring--2" />
                                <div className="ai-create-thinking-ring ai-create-thinking-ring--3" />
                                <Sparkles size={22} className="ai-create-thinking-icon" />
                            </div>
                            <div className="ai-create-thinking-label">
                                AI is planning your {modeLabel.toLowerCase()}…
                            </div>
                            <div className="ai-create-thinking-prompt">
                                "{prompt}"
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Step: Preview ── */}
                {step === 'preview' && plan && (
                    <div className="ai-create-body">
                        {/* Description */}
                        <div className="ai-create-desc">
                            <Sparkles size={12} className="ai-create-desc-icon" />
                            {plan.description}
                        </div>

                        {/* Badges row */}
                        <div className="ai-create-badges-row">
                            <span
                                className="ai-create-badge"
                                style={{ '--badge-color': PROFILE_META[plan.profile]?.color ?? '#6b7280' } as React.CSSProperties}
                            >
                                {PROFILE_META[plan.profile]?.icon} {PROFILE_META[plan.profile]?.label ?? plan.profile}
                            </span>
                            <span
                                className="ai-create-badge"
                                style={{ '--badge-color': FRAMEWORK_META[plan.framework]?.color ?? '#6b7280' } as React.CSSProperties}
                            >
                                {FRAMEWORK_META[plan.framework]?.icon} {FRAMEWORK_META[plan.framework]?.label ?? plan.framework}
                            </span>
                            <span className="ai-create-badge ai-create-badge--kit">
                                {plan.kit}
                            </span>
                        </div>

                        {/* Editable names */}
                        <div className="ai-create-fields">
                            {mode === 'workspace' && (
                                <div className="ai-create-field">
                                    <label className="ai-create-field-label">Workspace name</label>
                                    <input
                                        type="text"
                                        className="ai-create-field-input"
                                        value={editedWorkspaceName}
                                        onChange={(e) => setEditedWorkspaceName(e.target.value)}
                                        spellCheck={false}
                                    />
                                </div>
                            )}
                            <div className="ai-create-field">
                                <label className="ai-create-field-label">
                                    {mode === 'workspace' ? 'First project name' : 'Project name'}
                                </label>
                                <input
                                    type="text"
                                    className="ai-create-field-input"
                                    value={editedProjectName}
                                    onChange={(e) => setEditedProjectName(e.target.value)}
                                    spellCheck={false}
                                />
                            </div>
                        </div>

                        {/* Suggested modules */}
                        {plan.suggestedModules.length > 0 && (
                            <div className="ai-create-modules">
                                <div className="ai-create-modules-label">
                                    Modules to install after creation
                                </div>
                                <div className="ai-create-modules-list">
                                    {plan.suggestedModules.map((slug) => (
                                        <span key={slug} className="ai-create-module-chip">
                                            {MODULE_LABELS[slug] ?? slug.split('/').pop()}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Confirm actions */}
                        <div className="ai-create-actions">
                            <button
                                type="button"
                                className="ai-create-confirm"
                                onClick={handleConfirm}
                                disabled={
                                    mode === 'workspace'
                                        ? !editedWorkspaceName.trim()
                                        : !editedProjectName.trim()
                                }
                            >
                                <Check size={14} />
                                Create {modeLabel}
                            </button>
                            <button
                                type="button"
                                className="ai-create-back"
                                onClick={handleStartOver}
                            >
                                <ArrowLeft size={13} />
                                Start over
                            </button>
                        </div>

                        <div className="ai-create-manual-link">
                            <button type="button" onClick={onManualFallback}>
                                Switch to manual form
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Step: Creating ── */}
                {step === 'creating' && (
                    <div className="ai-create-body ai-create-body--centered">
                        <div className="ai-create-thinking">
                            <div className="ai-create-thinking-orb ai-create-thinking-orb--creating">
                                <div className="ai-create-thinking-ring ai-create-thinking-ring--1" />
                                <div className="ai-create-thinking-ring ai-create-thinking-ring--2" />
                                <Loader2 size={22} className="ai-create-thinking-icon animate-spin" />
                            </div>
                            {creationStage === 'workspace_done' ? (
                                <>
                                    <div className="ai-create-thinking-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Check size={16} style={{ color: 'var(--vscode-testing-iconPassed, #4caf50)' }} />
                                        Workspace <strong>{plan?.workspaceName}</strong> created
                                    </div>
                                    <div className="ai-create-thinking-label" style={{ marginTop: '6px' }}>
                                        Creating project <strong>{plan?.projectName}</strong>…
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="ai-create-thinking-label">
                                        Creating workspace <strong>{plan?.workspaceName}</strong>…
                                    </div>
                                    <div className="ai-create-thinking-prompt">
                                        {plan?.projectName ? `Project: ${plan.projectName}` : ''}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
