import { useState, useMemo } from 'react';
import {
    RefreshCw, Folder, AlertTriangle, Package, Info, Copy,
    Database, Zap, Lock, Eye, Shield, FileText,
    CreditCard, MessageSquare, Users, Calendar, Brain,
    Download, CheckCircle, ArrowUp
} from 'lucide-react';
import type { ModuleData, CategoryInfo, WorkspaceStatus } from '@/types';
import { ProjectActions } from './ProjectActions';

// Icon mapping based on category
const categoryIcons: Record<string, any> = {
    'ai': Brain,
    'database': Database,
    'cache': Zap,
    'auth': Lock,
    'observability': Eye,
    'security': Shield,
    'essentials': FileText,
    'billing': CreditCard,
    'communication': MessageSquare,
    'users': Users,
    'tasks': Calendar,
    'business': Package,
};

interface ModuleBrowserProps {
    modules: ModuleData[];
    workspaceStatus: WorkspaceStatus;
    categoryInfo: CategoryInfo;
    onRefresh: () => void;
    onInstall: (module: ModuleData) => void;
    onShowDetails: (moduleId: string) => void;
    onProjectTerminal?: () => void;
    onProjectInit?: () => void;
    onProjectDev?: () => void;
    onProjectStop?: () => void;
    onProjectTest?: () => void;
    onProjectBrowser?: () => void;
    onProjectBuild?: () => void;
}

export function ModuleBrowser({
    modules,
    workspaceStatus,
    categoryInfo,
    onRefresh,
    onInstall,
    onShowDetails,
    onProjectTerminal,
    onProjectInit,
    onProjectDev,
    onProjectStop,
    onProjectTest,
    onProjectBrowser,
    onProjectBuild
}: ModuleBrowserProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [copiedModuleId, setCopiedModuleId] = useState<string | null>(null);
    const [loadingModuleId, setLoadingModuleId] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Get unique categories
    const categories = useMemo(() => {
        const cats = new Set(modules.map(m => m.category));
        return ['all', ...Array.from(cats)];
    }, [modules]);

    // Check if a module is installed
    const isModuleInstalled = (moduleSlug: string) => {
        return workspaceStatus.installedModules?.some(m => m.slug === moduleSlug) || false;
    };

    // Get installed module info
    const getInstalledModule = (moduleSlug: string) => {
        return workspaceStatus.installedModules?.find(m => m.slug === moduleSlug);
    };

    // Check if newer version is available
    const isNewerVersion = (available: string, installed: string): boolean => {
        const parseVersion = (v: string) => {
            const cleaned = v.replace(/^v/, '');
            const parts = cleaned.split('.').map(p => parseInt(p, 10) || 0);
            return parts;
        };

        const availParts = parseVersion(available);
        const instParts = parseVersion(installed);

        for (let i = 0; i < Math.max(availParts.length, instParts.length); i++) {
            const a = availParts[i] || 0;
            const b = instParts[i] || 0;
            if (a > b) return true;
            if (a < b) return false;
        }
        return false;
    };

    // Filter modules
    const filteredModules = useMemo(() => {
        return modules.filter(module => {
            const matchesSearch = searchQuery === '' ||
                module.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (module.display_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                module.description.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesCategory = selectedCategory === 'all' || module.category === selectedCategory;

            return matchesSearch && matchesCategory;
        });
    }, [modules, searchQuery, selectedCategory]);

    const handleCopyCommand = (moduleId: string, slug: string) => {
        const command = `rapidkit add module ${slug}`;
        navigator.clipboard.writeText(command);
        setCopiedModuleId(moduleId);
        setTimeout(() => setCopiedModuleId(null), 2000);
    };

    const handleShowDetails = (moduleId: string) => {
        setLoadingModuleId(moduleId);
        onShowDetails(moduleId);
        setTimeout(() => setLoadingModuleId(null), 1500);
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        onRefresh();
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    return (
        <div className="section module-browser">
            <div className="section-title">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Package className="w-6 h-6" />
                    Module Browser
                    <span className="module-count" style={{ marginLeft: '4px' }}>
                        {modules.length} free modules
                    </span>
                    {workspaceStatus.hasWorkspace && workspaceStatus.installedModules && (
                        <span className="module-count installed-count">
                            {workspaceStatus.installedModules.length} installed
                        </span>
                    )}
                </div>
                <button className="refresh-btn" onClick={handleRefresh} title="Refresh modules">
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'spinning' : ''}`} />
                </button>
            </div>

            {!workspaceStatus.hasWorkspace ? (
                <div className="workspace-warning">
                    <AlertTriangle className="warning-icon" />
                    <div className="warning-content">
                        <div className="warning-title">No Project Selected</div>
                        <div className="warning-desc">
                            Select a project from the <strong>PROJECTS</strong> panel in the sidebar to install modules, or create a new project.
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <div className="workspace-info-box">
                        <Folder className="workspace-info-icon" />
                        <div className="workspace-details">
                            <div className="workspace-name-info">{workspaceStatus.workspaceName}</div>
                            <div className="workspace-path-info">{workspaceStatus.workspacePath}</div>
                        </div>
                    </div>

                    {onProjectTerminal && onProjectInit && onProjectDev && onProjectStop && onProjectTest && onProjectBrowser && onProjectBuild && (
                        <ProjectActions
                            workspaceStatus={workspaceStatus}
                            onTerminal={onProjectTerminal}
                            onInit={onProjectInit}
                            onDev={onProjectDev}
                            onStop={onProjectStop}
                            onTest={onProjectTest}
                            onBrowser={onProjectBrowser}
                            onBuild={onProjectBuild}
                        />
                    )}
                </>
            )}

            {/* Always show search and filters when modules exist */}
            {modules.length > 0 && (
                <div className="module-controls">
                    <input
                        type="text"
                        className="module-search"
                        placeholder="🔍 Search modules by name, description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div className="module-filters">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                className={`filter-btn ${selectedCategory === cat ? 'active' : ''}`}
                                onClick={() => setSelectedCategory(cat)}
                            >
                                {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {filteredModules.length === 0 && modules.length > 0 ? (
                <div className="empty-state">
                    <div className="workspace-empty-icon">🔍</div>
                    No modules found matching your search.
                </div>
            ) : (
                <div className="modules-grid">
                    {filteredModules.map((module: any) => {
                        const installed = isModuleInstalled(module.slug);
                        const IconComponent = categoryIcons[module.category] || Package;
                        return (
                            <div key={module.id} className={`module-card ${installed ? 'installed' : ''}`}>
                                <div className="module-header">
                                    <div className="module-icon-wrapper">
                                        <IconComponent className="module-icon-lucide" size={24} />
                                    </div>
                                    <div className="module-info">
                                        <div className="module-name">{module.display_name || module.name}</div>
                                        <div className="module-version">v{module.version}</div>
                                    </div>
                                    <span className={`module-badge ${module.category}`}>
                                        {module.category}
                                    </span>
                                </div>
                                <div className="module-desc">{module.description}</div>
                                <div className="module-actions">
                                    {(() => {
                                        const installedInfo = getInstalledModule(module.slug);
                                        const hasUpdate = installedInfo && module.version && isNewerVersion(module.version, installedInfo.version);

                                        if (hasUpdate) {
                                            return (
                                                <button
                                                    className="module-install-btn update"
                                                    onClick={() => onInstall(module)}
                                                    disabled={!workspaceStatus.hasWorkspace}
                                                    title={`Update from v${installedInfo.version} to v${module.version}`}
                                                >
                                                    <ArrowUp size={16} /> Update
                                                </button>
                                            );
                                        } else if (installedInfo) {
                                            return (
                                                <button className="module-install-btn installed" disabled>
                                                    <CheckCircle size={16} /> Installed v{installedInfo.version}
                                                </button>
                                            );
                                        } else {
                                            return (
                                                <button
                                                    className="module-install-btn"
                                                    onClick={() => onInstall(module)}
                                                    disabled={!workspaceStatus.hasWorkspace}
                                                >
                                                    <Download size={16} /> Install
                                                </button>
                                            );
                                        }
                                    })()}
                                    <button
                                        className={`module-action-btn ${loadingModuleId === module.id ? 'loading' : ''}`}
                                        onClick={() => handleShowDetails(module.id)}
                                        title="View Details"
                                        disabled={loadingModuleId === module.id}
                                    >
                                        {loadingModuleId === module.id ? (
                                            <RefreshCw size={14} className="spinning" />
                                        ) : (
                                            <Info size={14} />
                                        )}
                                    </button>
                                    <button
                                        className={`module-action-btn ${copiedModuleId === module.id ? 'copied' : ''}`}
                                        onClick={() => handleCopyCommand(module.id, module.slug)}
                                        title={copiedModuleId === module.id ? 'Copied!' : 'Copy install command'}
                                    >
                                        {copiedModuleId === module.id ? (
                                            <span style={{ fontSize: '11px', fontWeight: 'bold' }}>✓</span>
                                        ) : (
                                            <Copy size={14} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
