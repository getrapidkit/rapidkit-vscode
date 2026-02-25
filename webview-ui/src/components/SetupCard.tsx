import { EyeOff, Settings } from 'lucide-react';

interface SetupCardProps {
    onClick: () => void;
    onHide?: () => void;
}

export function SetupCard({ onClick, onHide }: SetupCardProps) {
    return (
        <div className="setup-card" onClick={onClick}>
            <div className="setup-card-left">
                <Settings className="setup-card-icon" />
                <div>
                    <div className="setup-card-title">Setup & Installation</div>
                    <div className="setup-card-desc">Configure toolchain & verify status</div>
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {onHide && (
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onHide();
                        }}
                        title="Hide Setup Status"
                        aria-label="Hide Setup Status"
                        style={{
                            border: '1px solid var(--vscode-panel-border)',
                            background: 'transparent',
                            color: 'var(--vscode-descriptionForeground)',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '24px',
                            height: '24px',
                            cursor: 'pointer',
                        }}
                    >
                        <EyeOff size={14} />
                    </button>
                )}
                <span className="setup-card-arrow">→</span>
            </div>
        </div>
    );
}
