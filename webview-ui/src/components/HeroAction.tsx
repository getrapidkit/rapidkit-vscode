import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Rocket, Loader2, Sparkles } from 'lucide-react';

interface HeroActionProps {
    onClick: () => void;
    isLoading?: boolean;
}

export function HeroAction({ onClick, isLoading = false }: HeroActionProps) {
    return (
        <div className="actions">
            <div
                className={`hero-action ${isLoading ? 'loading' : ''}`}
                onClick={isLoading ? undefined : onClick}
                style={{ cursor: isLoading ? 'wait' : 'pointer', opacity: isLoading ? 0.7 : 1 }}
            >
                {isLoading ? (
                    <Loader2 className="hero-icon animate-spin" size={32} style={{ color: '#6C5CE7' }} />
                ) : (
                    <Rocket className="hero-icon" size={32} style={{ color: '#6C5CE7' }} />
                )}
                <div className="hero-title">AI Workspace Builder</div>
                <p className="hero-description">
                    Describe your project — AI picks the kit, selects modules, and scaffolds everything
                </p>
                <span className="hero-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {isLoading ? 'CREATING...' : 'BUILD WITH AI'}
                    <Sparkles size={13} style={{ color: '#ffffff' }} />
                </span>
            </div>
        </div>
    );
}
