import { Sparkles, Wand2, Bug, Terminal, BookOpen, Package, Layers } from 'lucide-react';

const CARDS = [
    {
        icon: <Wand2 size={14} />,
        label: 'AI Create',
        desc: 'Describe your project in plain language — AI plans the workspace, picks the kit, and scaffolds everything.',
        color: '#6C5CE7',
        accent: 'teal',
    },
    {
        icon: <Bug size={14} />,
        label: 'Fix Preview Lite',
        desc: 'Request the smallest safe patch as a preview — root cause, candidate edits, and post-fix checks before touching code.',
        color: '#e17055',
        accent: 'orange',
    },
    {
        icon: <Layers size={14} />,
        label: 'Change Impact Lite',
        desc: 'Assess what can break before implementing a change. Risk level, impacted files, and a safe rollout checklist.',
        color: '#6c5ce7',
        accent: 'violet',
    },
    {
        icon: <Terminal size={14} />,
        label: 'Terminal → AI Bridge',
        desc: 'Send stack traces, test failures, or npm errors directly to AI for structured root-cause and fix guidance.',
        color: '#a78bfa',
        accent: 'purple',
    },
    {
        icon: <BookOpen size={14} />,
        label: 'Memory Wizard',
        desc: 'Capture conventions and architecture decisions with guided prompts — injected into every AI answer automatically.',
        color: '#00b894',
        accent: 'green',
    },
    {
        icon: <Package size={14} />,
        label: 'AI Recipe Packs',
        desc: '10 reusable AI workflows: root-cause, endpoint planning, DB migration, auth hardening, and ship-readiness review.',
        color: '#fdcb6e',
        accent: 'yellow',
    },
];

export function AIActions() {
    return (
        <div className="ai-actions-section">
            <div className="ai-actions-header">
                <Sparkles size={13} style={{ color: '#6C5CE7' }} />
                <span>AI Features</span>
                <span className="ai-actions-badge">Free · Powered by Copilot</span>
            </div>
            <div className="ai-features-grid">
                {CARDS.map((c) => (
                    <div key={c.label} className={`ai-feature-card ai-feature-card--${c.accent}`}>
                        <div className="ai-feature-card-header">
                            <span className="ai-feature-card-icon" style={{ color: c.color }}>{c.icon}</span>
                            <span className="ai-feature-card-title">{c.label}</span>
                        </div>
                        <span className="ai-feature-card-desc">{c.desc}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
