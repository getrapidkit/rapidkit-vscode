
import { Zap, Target, Wrench, BookOpen, TestTube, Package } from 'lucide-react';

export function Features() {
    const features = [
        { icon: Zap, label: '5x faster project setup' },
        { icon: Target, label: 'Clean Architecture' },
        { icon: Wrench, label: 'Auto dev server' },
        { icon: BookOpen, label: 'Swagger docs built-in' },
        { icon: TestTube, label: 'Test ready' },
        { icon: Package, label: 'Modular design' },
    ];

    return (
        <div className="section">
            <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={18} style={{ color: '#FFC107' }} />
                Key Features
            </div>
            <div className="features">
                {features.map((feature, index) => {
                    const Icon = feature.icon;
                    return (
                        <div key={index} className="feature">
                            <Icon className="feature-icon" />
                            <span className="feature-text">{feature.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
