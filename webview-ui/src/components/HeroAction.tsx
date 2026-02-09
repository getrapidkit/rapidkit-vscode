import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Rocket } from 'lucide-react';

interface HeroActionProps {
    onClick: () => void;
}

export function HeroAction({ onClick }: HeroActionProps) {
    return (
        <div className="actions">
            <div className="hero-action" onClick={onClick}>
                <Rocket className="hero-icon" size={32} style={{ color: '#00cfc1' }} />
                <div className="hero-title">Create Your First Workspace</div>
                <p className="hero-description">
                    Choose your framework: FastAPI or NestJS, then create a complete project
                </p>
                <span className="hero-badge">GET STARTED</span>
            </div>
        </div>
    );
}
