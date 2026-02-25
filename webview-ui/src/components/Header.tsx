interface HeaderProps {
    version: string;
}

export function Header({ version }: HeaderProps) {
    return (
        <div className="header">
            <img className="logo" src={(window as any).ICON_URI} alt="RapidKit Logo" />
            <h1>
                <span className="rapid">Rapid</span>
                <span className="kit">Kit</span>
            </h1>
            <p className="tagline">
                Build production-ready APIs at warp speed with clean architecture, 27+ modules, and automation-first workflows.
            </p>
            <span className="version">v{version}</span>
        </div>
    );
}
