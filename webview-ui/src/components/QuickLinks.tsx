interface QuickLinksProps {
    onOpenProjectModal: (framework: 'fastapi' | 'nestjs' | 'go', kitName?: string) => void;
}

export function QuickLinks({ onOpenProjectModal }: QuickLinksProps) {
    const links: Array<{
        framework: 'fastapi' | 'nestjs' | 'go';
        className: string;
        title: string;
        subtitle: string;
        icon: string;
        alt: string;
    }> = [
            {
                framework: 'fastapi',
                className: 'fastapi',
                title: 'FastAPI',
                subtitle: 'Python + Async',
                icon: (window as any).FASTAPI_ICON_URI,
                alt: 'FastAPI'
            },
            {
                framework: 'nestjs',
                className: 'nestjs',
                title: 'NestJS',
                subtitle: 'TypeScript + DI',
                icon: (window as any).NESTJS_ICON_URI,
                alt: 'NestJS'
            },
            {
                framework: 'go',
                className: 'go',
                title: 'Go',
                subtitle: 'Go + High Perf',
                icon: (window as any).GO_ICON_URI,
                alt: 'Go'
            }
        ];

    return (
        <div className="quick-links">
            {links.map((link) => (
                <button
                    key={link.framework}
                    type="button"
                    className={`quick-link ${link.className}`}
                    onClick={() => onOpenProjectModal(link.framework)}
                    aria-label={`Create ${link.title} project`}
                >
                    <span className="quick-link-icon" aria-hidden="true">
                        <img src={link.icon} alt={link.alt} />
                    </span>
                    <div className="quick-link-title">{link.title}</div>
                    <div className="quick-link-subtitle">{link.subtitle}</div>
                </button>
            ))}
        </div>
    );
}
