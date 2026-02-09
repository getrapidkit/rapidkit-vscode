import { Settings } from 'lucide-react';

interface SetupCardProps {
    onClick: () => void;
}

export function SetupCard({ onClick }: SetupCardProps) {
    return (
        <div className="setup-card" onClick={onClick}>
            <div className="setup-card-left">
                <Settings className="setup-card-icon" />
                <div>
                    <div className="setup-card-title">Setup & Installation</div>
                    <div className="setup-card-desc">Configure toolchain & verify status</div>
                </div>
            </div>
            <span className="setup-card-arrow">→</span>
        </div>
    );
}
