interface QuickLinksProps {
    onOpenProjectModal: (framework: 'fastapi' | 'nestjs' | 'go', kitName?: string) => void;
}

export function QuickLinks({ onOpenProjectModal }: QuickLinksProps) {
    return (
        <div className="quick-links">
            <div
                className="quick-link fastapi"
                onClick={() => onOpenProjectModal('fastapi')}
            >
                <span className="quick-link-icon">
                    <img src={(window as any).FASTAPI_ICON_URI} alt="FastAPI" />
                </span>
                <div className="quick-link-title">FastAPI</div>
                <div className="quick-link-subtitle">Python + Async</div>
            </div>

            <div
                className="quick-link nestjs"
                onClick={() => onOpenProjectModal('nestjs')}
            >
                <span className="quick-link-icon">
                    <img src={(window as any).NESTJS_ICON_URI} alt="NestJS" />
                </span>
                <div className="quick-link-title">NestJS</div>
                <div className="quick-link-subtitle">TypeScript + DI</div>
            </div>

            <div
                className="quick-link go"
                onClick={() => onOpenProjectModal('go')}
            >
                <span className="quick-link-icon">
                    <img src={(window as any).GO_ICON_URI} alt="Go" />
                </span>
                <div className="quick-link-title">Go</div>
                <div className="quick-link-subtitle">Go + High Perf</div>
            </div>
        </div>
    );
}
