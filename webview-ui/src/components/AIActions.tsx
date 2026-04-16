import { Sparkles, Wand2, MessageSquare, FolderKanban, Package } from 'lucide-react';

const CARDS = [
    {
        icon: <Wand2 size={14} />,
        label: 'Create with AI',
        desc: 'Describe your idea → AI plans workspace + project',
        color: '#6C5CE7',
        accent: 'teal',
    },
    {
        icon: <MessageSquare size={14} />,
        label: 'Project Assistant',
        desc: 'Context-aware Q&A and code help per project',
        color: '#a78bfa',
        accent: 'purple',
    },
    {
        icon: <FolderKanban size={14} />,
        label: 'Workspace Brain',
        desc: 'AI inline on every workspace & project item',
        color: '#6c5ce7',
        accent: 'violet',
    },
    {
        icon: <Package size={14} />,
        label: 'Module Advisor',
        desc: 'Smart suggestions for modules in the catalog',
        color: '#00b894',
        accent: 'green',
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
