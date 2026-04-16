interface HeaderProps {
    version: string;
}

export function Header({ version }: HeaderProps) {
    return (
        <div className="header">
            <img className="logo" src={(window as any).ICON_URI} alt="Workspai Logo" />
            <h1>
                <span className="rapid">workspai</span>
                {/* <span className="kit">ai</span> */}
            </h1>
            <p className="tagline">
                Build backend systems with AI that knows your workspace.
            </p>
            {/* <span className="version">v{version}</span> */}
        </div>
    );
}
