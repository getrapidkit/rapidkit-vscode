import { useState, useEffect, useRef } from 'react';
import { X, Bug, BrainCircuit, Sparkles, Send, Loader2 } from 'lucide-react';

export interface AIModalContext {
    type: 'workspace' | 'project' | 'module';
    name: string;
    path?: string;
    framework?: string;
    moduleSlug?: string;
    moduleDescription?: string;
    prefillQuestion?: string;
}

interface AIModalProps {
    isOpen: boolean;
    context: AIModalContext | null;
    isStreaming: boolean;
    streamContent: string;
    streamError: string | null;
    modelId?: string | null;
    onClose: () => void;
    onQuery: (mode: 'debug' | 'ask', question: string, context: AIModalContext) => void;
}

type Mode = 'debug' | 'ask';

const TYPE_LABELS: Record<string, string> = {
    workspace: 'Workspace',
    project: 'Project',
    module: 'Module',
};

const FRAMEWORK_LABELS: Record<string, string> = {
    fastapi: 'FastAPI',
    nestjs: 'NestJS',
    go: 'Go',
};

function getQuickPrompts(ctx: AIModalContext, mode: Mode): string[] {
    if (mode === 'debug') {
        return [
            'Paste the full stack trace here and I will analyse it…',
            'Paste the test failure output here…',
        ];
    }
    if (ctx.type === 'workspace') {
        return [
            'What is the best way to share code between projects in this workspace?',
            'How should I set up a shared database for all projects?',
            'What deployment strategy fits a multi-project Workspai workspace?',
        ];
    }
    if (ctx.type === 'project') {
        const fw = ctx.framework || '';
        if (fw === 'fastapi') return [
            'How do I add a new endpoint following this project\'s DDD structure?',
            'What is the correct way to add a new SQLAlchemy model here?',
            'How should I add a new Workspai module to this project?',
            'How do I write a unit test for a use-case in the application layer?',
        ];
        if (fw === 'nestjs') return [
            'How do I create a new feature module following NestJS conventions here?',
            'How should I add a new database table with TypeORM in this project?',
            'How do I add a new Workspai module to this project?',
        ];
        if (fw === 'go') return [
            'How do I add a new HTTP handler following the ports-and-adapters pattern?',
            'How should I add a new repository interface and implementation here?',
            'How do I organise a new domain entity in this project?',
        ];
        return [
            'How do I add a feature to this project following its conventions?',
            'What Workspai modules should I add to this project?',
        ];
    }
    if (ctx.type === 'module') {
        return [
            `How do I configure the ${ctx.name} module after installation?`,
            `Show me an example of using the ${ctx.name} module in a route handler.`,
            `What does the ${ctx.name} module add to my project structure?`,
        ];
    }
    return [];
}

export function AIModal({
    isOpen,
    context,
    isStreaming,
    streamContent,
    streamError,
    modelId,
    onClose,
    onQuery,
}: AIModalProps) {
    const [mode, setMode] = useState<Mode>('ask');
    const [input, setInput] = useState('');
    const responseRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            if (context?.prefillQuestion) {
                setMode('debug');
                setInput(context.prefillQuestion);
            } else {
                setMode('ask');
                setInput('');
            }
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen, context]);

    // Auto-scroll streaming output
    useEffect(() => {
        if (responseRef.current) {
            responseRef.current.scrollTop = responseRef.current.scrollHeight;
        }
    }, [streamContent]);

    if (!isOpen || !context) return null;

    const quickPrompts = getQuickPrompts(context, mode);

    const handleSubmit = () => {
        if (!input.trim() || isStreaming) return;
        onQuery(mode, input.trim(), context);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSubmit();
        }
        if (e.key === 'Escape') {
            onClose();
        }
    };

    const fwLabel = context.framework ? FRAMEWORK_LABELS[context.framework] || context.framework : null;
    const hasResponse = streamContent.length > 0 || streamError;

    return (
        <>
            {/* Backdrop */}
            <div
                className="ai-modal-backdrop"
                onClick={!isStreaming ? onClose : undefined}
            />

            {/* Modal */}
            <div
                className="ai-modal-container"
                role="dialog"
                aria-modal="true"
                aria-label={`AI Assistant — ${context.name}`}
            >
                {/* Header */}
                <div className="ai-modal-header">
                    <div className="ai-modal-header-left">
                        <Sparkles size={16} className="ai-modal-sparkle" />
                        <div>
                            <div className="ai-modal-title">AI Assistant</div>
                            <div className="ai-modal-subtitle">
                                <span className="ai-modal-ctx-badge">
                                    {TYPE_LABELS[context.type] || context.type}
                                </span>
                                <span className="ai-modal-ctx-name">{context.name}</span>
                                {fwLabel && (
                                    <span className="ai-modal-fw-badge">{fwLabel}</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="ai-modal-header-right">
                        {modelId && (
                            <span className="ai-modal-model-badge" title="Active AI model">
                                ✦ {modelId}
                            </span>
                        )}
                        <button
                            type="button"
                            className="ai-modal-close"
                            onClick={onClose}
                            title="Close"
                            aria-label="Close AI modal"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Mode Tabs */}
                <div className="ai-modal-tabs">
                    <button
                        type="button"
                        className={`ai-modal-tab ${mode === 'ask' ? 'ai-modal-tab--active' : ''}`}
                        onClick={() => { setMode('ask'); setInput(''); }}
                    >
                        <BrainCircuit size={13} />
                        Ask AI
                    </button>
                    <button
                        type="button"
                        className={`ai-modal-tab ${mode === 'debug' ? 'ai-modal-tab--active' : ''}`}
                        onClick={() => { setMode('debug'); setInput(''); }}
                    >
                        <Bug size={13} />
                        Debug
                    </button>
                </div>

                {/* Body */}
                <div className="ai-modal-body">
                    {/* Quick prompts (only when no response yet) */}
                    {!hasResponse && quickPrompts.length > 0 && (
                        <div className="ai-modal-chips">
                            {quickPrompts.map((prompt) => (
                                <button
                                    key={prompt}
                                    type="button"
                                    className="ai-modal-chip"
                                    onClick={() => setInput(prompt)}
                                    disabled={isStreaming}
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Streaming response */}
                    {hasResponse && (
                        <div ref={responseRef} className="ai-modal-response">
                            {streamError ? (
                                <div className="ai-modal-error">
                                    <span>⚠ {streamError}</span>
                                </div>
                            ) : (
                                <pre className="ai-modal-response-text">
                                    {streamContent}
                                    {isStreaming && (
                                        <span className="ai-modal-cursor" aria-hidden="true">▍</span>
                                    )}
                                </pre>
                            )}
                        </div>
                    )}

                    {/* Ask another question link after completion */}
                    {hasResponse && !isStreaming && (
                        <button
                            type="button"
                            className="ai-modal-new-query"
                            onClick={() => { setInput(''); }}
                        >
                            ↩ Ask another question
                        </button>
                    )}
                </div>

                {/* Input */}
                <div className="ai-modal-input-area">
                    <textarea
                        ref={textareaRef}
                        className="ai-modal-textarea"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={
                            mode === 'debug'
                                ? 'Paste your error, stack trace, or failing test output…'
                                : `Ask anything about "${context.name}"…`
                        }
                        rows={3}
                        disabled={isStreaming}
                    />
                    <div className="ai-modal-input-footer">
                        <span className="ai-modal-hint">⌘ Enter to send</span>
                        <button
                            type="button"
                            className="ai-modal-send"
                            onClick={handleSubmit}
                            disabled={!input.trim() || isStreaming}
                            title="Send query"
                        >
                            {isStreaming ? (
                                <Loader2 size={14} className="ai-modal-spinner" />
                            ) : (
                                <Send size={14} />
                            )}
                            {isStreaming ? 'Thinking…' : 'Send'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
