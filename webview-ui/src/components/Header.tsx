interface HeaderProps {
    version: string;
}

export function Header({ version }: HeaderProps) {
    return (
        <div className="header">
            <img className="logo" src={(window as any).ICON_URI} alt="Workspai Logo" />
            <h1>
                <span className="rapid">worksp</span>
                <span className="kit">ai</span>
            </h1>
            <p className="tagline">
                Workspai (formerly RapidKit) — An AI-powered developer toolkit for building, scaling, and deploying backend services.
            </p>
            <span className="version">v{version}</span>
        </div>
    );
}
