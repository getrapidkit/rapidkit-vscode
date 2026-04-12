interface HeaderProps {
    version: string;
}

export function Header({ version }: HeaderProps) {
    return (
        <div className="header">
            <img className="logo" src={(window as any).ICON_URI} alt="Workspai Logo" />
            <h1>
                <span className="rapid">Workspai</span>
            </h1>
            <p className="tagline">
                Workspai (formerly RapidKit) — An AI-powered developer toolkit for building, scaling, and deploying backend services. FastAPI, NestJS, Go/Fiber & Go/Gin scaffolding with clean architecture, 27+ free modules, and automation-first workflows.
            </p>
            <span className="version">v{version}</span>
        </div>
    );
}
