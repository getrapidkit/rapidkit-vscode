import { Sparkles, Wand2, MessageSquare, FolderKanban, Package, Bug, Lightbulb } from 'lucide-react';

const CARDS = [
    {
        icon: <Wand2 size={14} />,
        label: 'Create with AI',
        desc: 'Describe your idea → AI picks kit, modules, and scaffolds workspace + project',
        color: '#6C5CE7',
        accent: 'teal',
    },
    {
        icon: <Bug size={14} />,
        label: 'AI Debugger',
        desc: 'Explain errors and get fix suggestions with full workspace context (⌨ Ctrl+Shift+R D)',
        color: '#e17055',
        accent: 'orange',
    },
    {
        icon: <FolderKanban size={14} />,
        label: 'Workspace Brain',
        desc: 'Ask AI anything about your workspace — architecture, decisions, next steps (⌨ Ctrl+Shift+R B)',
        color: '#6c5ce7',
        accent: 'violet',
    },
    {
        icon: <MessageSquare size={14} />,
        label: 'Project Assistant',
        desc: 'Per-project AI Q&A with scanned code context — click ✦ on any project item',
        color: '#a78bfa',
        accent: 'purple',
    },
    {
        icon: <Package size={14} />,
        label: 'Module Advisor',
        desc: 'AI recommends which modules to install based on your project description',
        color: '#00b894',
        accent: 'green',
    },
    {
        icon: <Lightbulb size={14} />,
        label: 'Explain Error',
        desc: 'Select any error in the editor → right-click → Explain Error with AI',
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
                <span className="ai-actions-badge">Powered by Copilot</span>
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
