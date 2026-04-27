import { Sparkles, Wand2, Bug, Terminal, BookOpen, Package, Layers, ArrowRight } from 'lucide-react';

interface AIActionsProps {
    onRunFixPreview?: () => void;
    onRunChangeImpact?: () => void;
    onRunTerminalBridge?: () => void;
}

const CARDS = [
    {
        icon: <Wand2 size={18} />,
        label: 'AI Create',
        tag: 'Scaffold',
        desc: 'Describe your project — AI plans the workspace, picks the kit, and scaffolds everything.',
        color: '#6C5CE7',
        accent: 'violet',
    },
    {
        icon: <Bug size={18} />,
        label: 'Fix Preview Lite',
        tag: 'Debug',
        desc: 'Get the smallest safe patch as a preview — root cause, edits, and post-fix checks before touching code.',
        cta: 'Preview fix',
        color: '#e17055',
        accent: 'orange',
        action: 'fix-preview',
    },
    {
        icon: <Layers size={18} />,
        label: 'Change Impact',
        tag: 'Risk',
        desc: 'Assess what can break before a change. Risk level, impacted files, and a safe rollout checklist.',
        cta: 'Start analysis',
        color: '#a78bfa',
        accent: 'purple',
        action: 'change-impact',
    },
    {
        icon: <Terminal size={18} />,
        label: 'Terminal Bridge',
        tag: 'Errors',
        desc: 'Send stack traces or test failures directly to AI for structured root-cause and fix guidance.',
        cta: 'Run now',
        color: '#00cec9',
        accent: 'teal',
        action: 'terminal-bridge',
    },
    {
        icon: <BookOpen size={18} />,
        label: 'Memory Wizard',
        tag: 'Context',
        desc: 'Capture conventions and architecture decisions — injected into every AI answer automatically.',
        color: '#00b894',
        accent: 'green',
    },
    {
        icon: <Package size={18} />,
        label: 'Recipe Packs',
        tag: 'Workflows',
        desc: '10 reusable AI workflows: root-cause, endpoint planning, DB migration, auth hardening, and more.',
        color: '#fdcb6e',
        accent: 'yellow',
    },
];

export function AIActions({ onRunFixPreview, onRunChangeImpact, onRunTerminalBridge }: AIActionsProps) {
    const isActionCard = (action: unknown): action is 'fix-preview' | 'change-impact' | 'terminal-bridge' =>
        action === 'fix-preview' || action === 'change-impact' || action === 'terminal-bridge';

    const runAction = (action: unknown) => {
        if (action === 'fix-preview') {
            onRunFixPreview?.();
        } else if (action === 'change-impact') {
            onRunChangeImpact?.();
        } else if (action === 'terminal-bridge') {
            onRunTerminalBridge?.();
        }
    };

    return (
        <div className="ai-actions-section">
            <div className="ai-actions-header">
                <Sparkles size={13} style={{ color: '#6C5CE7' }} />
                <span>AI Features</span>
                <span className="ai-actions-badge">Free · Powered by Copilot</span>
            </div>
            <div className="ai-features-grid">
                {CARDS.map((c) => (
                    <div
                        key={c.label}
                        className={`ai-feature-card ai-feature-card--${c.accent}`}
                        role={isActionCard(c.action) ? 'button' : undefined}
                        aria-label={
                            c.action === 'fix-preview'
                                ? 'Run AI Fix Preview Lite'
                                : c.action === 'change-impact'
                                    ? 'Run AI Change Impact Lite'
                                    : c.action === 'terminal-bridge'
                                        ? 'Run Terminal to AI Bridge'
                                        : undefined
                        }
                        tabIndex={isActionCard(c.action) ? 0 : undefined}
                        onClick={() => {
                            runAction(c.action);
                        }}
                        onKeyDown={(event) => {
                            if (isActionCard(c.action) && (event.key === 'Enter' || event.key === ' ')) {
                                event.preventDefault();
                                runAction(c.action);
                            }
                        }}
                    >
                        <div className="ai-feature-card-top">
                            <span className="ai-feature-card-icon-wrap" style={{ color: c.color, background: `color-mix(in srgb, ${c.color} 14%, transparent)` }}>
                                {c.icon}
                            </span>
                            <span className="ai-feature-card-title">{c.label}</span>
                            <span className="ai-feature-card-tag" style={{ color: c.color, borderColor: `color-mix(in srgb, ${c.color} 30%, transparent)`, background: `color-mix(in srgb, ${c.color} 10%, transparent)` }}>
                                {c.tag}
                            </span>
                        </div>
                        <span className="ai-feature-card-desc">{c.desc}</span>
                        {c.cta ? (
                            <span className="ai-feature-card-cta" style={{ color: c.color, borderColor: `color-mix(in srgb, ${c.color} 35%, transparent)`, background: `color-mix(in srgb, ${c.color} 12%, transparent)` }}>
                                {c.cta}
                            </span>
                        ) : null}
                        <span className="ai-feature-card-arrow" style={{ color: c.color }}>
                            <ArrowRight size={11} />
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
