import { useState } from 'react';
import { Copy, ChevronDown, FolderOpen, Rocket, Package as PackageIcon, Settings } from 'lucide-react';

interface Command {
    code: string;
    description: string;
}

interface CommandCategory {
    id: string;
    title: string;
    icon: any;
    count: number;
    commands: Command[];
}

export function CommandReference() {
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['workspace']));
    const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

    const categories: CommandCategory[] = [
        {
            id: 'workspace',
            title: 'Workspace Commands',
            icon: FolderOpen,
            count: 2,
            commands: [
                {
                    code: 'npx rapidkit my-workspace',
                    description: 'Create a new workspace with interactive setup'
                },
                {
                    code: 'npx rapidkit my-workspace --yes --skip-git',
                    description: 'Create workspace with defaults, skip git initialization'
                }
            ]
        },
        {
            id: 'project',
            title: 'Project Commands',
            icon: Rocket,
            count: 5,
            commands: [
                {
                    code: 'npx rapidkit create project fastapi.standard my-api --output .',
                    description: 'Create FastAPI Standard project in current workspace'
                },
                {
                    code: 'npx rapidkit create project fastapi.ddd my-ddd-api --output .',
                    description: 'Create FastAPI DDD project with clean architecture'
                },
                {
                    code: 'npx rapidkit create project nestjs.standard my-service --output .',
                    description: 'Create NestJS project in current workspace'
                },
                {
                    code: 'npx rapidkit create project fastapi.standard my-api --output ~/projects',
                    description: 'Create standalone FastAPI project at custom location'
                },
                {
                    code: 'npx rapidkit init && npx rapidkit dev',
                    description: 'Initialize dependencies and start development server'
                }
            ]
        },
        {
            id: 'module',
            title: 'Module Commands',
            icon: PackageIcon,
            count: 5,
            commands: [
                {
                    code: 'npx rapidkit add module auth_core',
                    description: 'Password hashing, token signing, and runtime auth'
                },
                {
                    code: 'npx rapidkit add module db_postgres',
                    description: 'SQLAlchemy async Postgres with DI and health checks'
                },
                {
                    code: 'npx rapidkit add module redis',
                    description: 'Redis runtime with async and sync client'
                },
                {
                    code: 'npx rapidkit add module email',
                    description: 'Email delivery with SMTP support'
                },
                {
                    code: 'npx rapidkit add module storage',
                    description: 'File storage and media management'
                }
            ]
        },
        {
            id: 'dev',
            title: 'Development & Utilities',
            icon: Settings,
            count: 3,
            commands: [
                {
                    code: 'npx rapidkit doctor',
                    description: 'Check system requirements and dependencies'
                },
                {
                    code: 'npx rapidkit --version',
                    description: 'Show RapidKit CLI version'
                },
                {
                    code: 'npx rapidkit --help',
                    description: 'Display all available commands and options'
                }
            ]
        }
    ];

    const toggleCategory = (categoryId: string) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(categoryId)) {
                newSet.delete(categoryId);
            } else {
                newSet.add(categoryId);
            }
            return newSet;
        });
    };

    const copyCommand = (command: string) => {
        navigator.clipboard.writeText(command);
        setCopiedCommand(command);
        setTimeout(() => setCopiedCommand(null), 2000);
    };

    return (
        <div className="section command-reference">
            <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Copy size={18} style={{ color: '#00cfc1' }} />
                Command Reference
            </div>

            {categories.map(category => {
                const Icon = category.icon;
                const isExpanded = expandedCategories.has(category.id);

                return (
                    <div key={category.id} className="command-category">
                        <div
                            className={`category-header ${isExpanded ? 'expanded' : ''}`}
                            onClick={() => toggleCategory(category.id)}
                        >
                            <div className="category-title">
                                <Icon size={16} className="category-icon-lucide" />
                                <span>{category.title}</span>
                                <span className="category-count">{category.count}</span>
                            </div>
                            <ChevronDown
                                size={16}
                                className="category-toggle"
                                style={{
                                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s'
                                }}
                            />
                        </div>
                        <div className={`category-content ${isExpanded ? 'expanded' : ''}`}>
                            <div className="command-list">
                                {category.commands.map((cmd, index) => (
                                    <div key={index} className="command-item">
                                        <div className="command-header">
                                            <div className="command-code">{cmd.code}</div>
                                            <button
                                                className={`command-copy-btn ${copiedCommand === cmd.code ? 'copied' : ''}`}
                                                onClick={() => copyCommand(cmd.code)}
                                                title="Copy command"
                                            >
                                                {copiedCommand === cmd.code ? (
                                                    <>✓ Copied!</>
                                                ) : (
                                                    <><Copy size={12} /> Copy</>
                                                )}
                                            </button>
                                        </div>
                                        <div className="command-desc">{cmd.description}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
