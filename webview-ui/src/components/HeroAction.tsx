import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Rocket, Loader2 } from 'lucide-react';

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
                    <Loader2 className="hero-icon animate-spin" size={32} style={{ color: '#00cfc1' }} />
                ) : (
                    <Rocket className="hero-icon" size={32} style={{ color: '#00cfc1' }} />
                )}
                <div className="hero-title">Create Your First Workspace</div>
                <p className="hero-description">
                    Choose your framework: FastAPI or NestJS, then create a complete project
                </p>
                <span className="hero-badge">{isLoading ? 'CHECKING...' : 'GET STARTED'}</span>
            </div>
        </div>
    );
}
