/**
 * Module Explorer TreeView Provider
 */

import * as vscode from 'vscode';
import { RapidKitModule } from '../../types';

export class ModuleExplorerProvider implements vscode.TreeDataProvider<ModuleTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ModuleTreeItem | undefined | null | void> =
    new vscode.EventEmitter<ModuleTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ModuleTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  constructor() {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ModuleTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ModuleTreeItem): Promise<ModuleTreeItem[]> {
    if (!element) {
      // Root level - show module categories
      return this.getModuleCategories();
    } else if (element.contextValue === 'category') {
      // Show modules in category
      return this.getModulesInCategory(element.label as string);
    }

    return [];
  }

  private getModuleCategories(): ModuleTreeItem[] {
    const categories = [
      { name: 'AI', icon: 'sparkle' },
      { name: 'Authentication', icon: 'shield' },
      { name: 'Billing', icon: 'credit-card' },
      { name: 'Business', icon: 'briefcase' },
      { name: 'Cache', icon: 'zap' },
      { name: 'Communication', icon: 'mail' },
      { name: 'Database', icon: 'database' },
      { name: 'Essentials', icon: 'tools' },
      { name: 'Observability', icon: 'pulse' },
      { name: 'Security', icon: 'lock' },
      { name: 'Tasks', icon: 'checklist' },
      { name: 'Users', icon: 'person' },
    ];

    return categories.map((cat) => {
      const item = new vscode.TreeItem(cat.name, vscode.TreeItemCollapsibleState.Collapsed);
      item.contextValue = 'category';
      item.iconPath = new vscode.ThemeIcon(cat.icon);
      return new ModuleTreeItem(item, 'category');
    });
  }

  private getModulesInCategory(category: string): ModuleTreeItem[] {
    // Preview: Real modules coming soon from RapidKit Core
    const previewModules: Record<string, RapidKitModule[]> = {
      AI: [
        {
          id: 'ai_assistant',
          name: 'ai_assistant',
          displayName: 'AI Assistant',
          version: 'preview',
          description: 'Coming Soon',
          category: 'ai',
          status: 'preview',
          tags: ['ai'],
          dependencies: [],
          installed: false,
        },
      ],
      Authentication: [
        {
          id: 'auth_core',
          name: 'auth_core',
          displayName: 'Authentication Core',
          version: 'preview',
          description: 'Coming Soon',
          category: 'auth',
          status: 'preview',
          tags: ['auth'],
          dependencies: [],
          installed: false,
        },
        {
          id: 'api_keys',
          name: 'api_keys',
          displayName: 'API Keys',
          version: 'preview',
          description: 'Coming Soon',
          category: 'auth',
          status: 'preview',
          tags: ['auth'],
          dependencies: [],
          installed: false,
        },
        {
          id: 'oauth',
          name: 'oauth',
          displayName: 'OAuth',
          version: 'preview',
          description: 'Coming Soon',
          category: 'auth',
          status: 'preview',
          tags: ['auth'],
          dependencies: [],
          installed: false,
        },
        {
          id: 'passwordless',
          name: 'passwordless',
          displayName: 'Passwordless',
          version: 'preview',
          description: 'Coming Soon',
          category: 'auth',
          status: 'preview',
          tags: ['auth'],
          dependencies: [],
          installed: false,
        },
        {
          id: 'session',
          name: 'session',
          displayName: 'Session',
          version: 'preview',
          description: 'Coming Soon',
          category: 'auth',
          status: 'preview',
          tags: ['auth'],
          dependencies: [],
          installed: false,
        },
      ],
      Billing: [
        {
          id: 'cart',
          name: 'cart',
          displayName: 'Cart',
          version: 'preview',
          description: 'Coming Soon',
          category: 'billing',
          status: 'preview',
          tags: ['billing'],
          dependencies: [],
          installed: false,
        },
        {
          id: 'inventory',
          name: 'inventory',
          displayName: 'Inventory',
          version: 'preview',
          description: 'Coming Soon',
          category: 'billing',
          status: 'preview',
          tags: ['billing'],
          dependencies: [],
          installed: false,
        },
        {
          id: 'stripe_payment',
          name: 'stripe_payment',
          displayName: 'Stripe Payment',
          version: 'preview',
          description: 'Coming Soon',
          category: 'billing',
          status: 'preview',
          tags: ['billing'],
          dependencies: [],
          installed: false,
        },
      ],
      Business: [
        {
          id: 'storage',
          name: 'storage',
          displayName: 'Storage',
          version: 'preview',
          description: 'Coming Soon',
          category: 'business',
          status: 'preview',
          tags: ['business'],
          dependencies: [],
          installed: false,
        },
      ],
      Cache: [
        {
          id: 'redis',
          name: 'redis',
          displayName: 'Redis',
          version: 'preview',
          description: 'Coming Soon',
          category: 'cache',
          status: 'preview',
          tags: ['cache'],
          dependencies: [],
          installed: false,
        },
      ],
      Communication: [
        {
          id: 'email',
          name: 'email',
          displayName: 'Email',
          version: 'preview',
          description: 'Coming Soon',
          category: 'communication',
          status: 'preview',
          tags: ['communication'],
          dependencies: [],
          installed: false,
        },
        {
          id: 'notifications',
          name: 'notifications',
          displayName: 'Notifications',
          version: 'preview',
          description: 'Coming Soon',
          category: 'communication',
          status: 'preview',
          tags: ['communication'],
          dependencies: [],
          installed: false,
        },
      ],
      Database: [
        {
          id: 'db_postgres',
          name: 'db_postgres',
          displayName: 'PostgreSQL',
          version: 'preview',
          description: 'Coming Soon',
          category: 'database',
          status: 'preview',
          tags: ['database'],
          dependencies: [],
          installed: false,
        },
        {
          id: 'db_mongo',
          name: 'db_mongo',
          displayName: 'MongoDB',
          version: 'preview',
          description: 'Coming Soon',
          category: 'database',
          status: 'preview',
          tags: ['database'],
          dependencies: [],
          installed: false,
        },
        {
          id: 'db_sqlite',
          name: 'db_sqlite',
          displayName: 'SQLite',
          version: 'preview',
          description: 'Coming Soon',
          category: 'database',
          status: 'preview',
          tags: ['database'],
          dependencies: [],
          installed: false,
        },
      ],
      Essentials: [
        {
          id: 'deployment',
          name: 'deployment',
          displayName: 'Deployment',
          version: 'preview',
          description: 'Coming Soon',
          category: 'essentials',
          status: 'preview',
          tags: ['essentials'],
          dependencies: [],
          installed: false,
        },
        {
          id: 'logging',
          name: 'logging',
          displayName: 'Logging',
          version: 'preview',
          description: 'Coming Soon',
          category: 'essentials',
          status: 'preview',
          tags: ['essentials'],
          dependencies: [],
          installed: false,
        },
        {
          id: 'middleware',
          name: 'middleware',
          displayName: 'Middleware',
          version: 'preview',
          description: 'Coming Soon',
          category: 'essentials',
          status: 'preview',
          tags: ['essentials'],
          dependencies: [],
          installed: false,
        },
        {
          id: 'settings',
          name: 'settings',
          displayName: 'Settings',
          version: 'preview',
          description: 'Coming Soon',
          category: 'essentials',
          status: 'preview',
          tags: ['essentials'],
          dependencies: [],
          installed: false,
        },
      ],
      Observability: [
        {
          id: 'observability_core',
          name: 'observability_core',
          displayName: 'Observability Core',
          version: 'preview',
          description: 'Coming Soon',
          category: 'observability',
          status: 'preview',
          tags: ['observability'],
          dependencies: [],
          installed: false,
        },
      ],
      Security: [
        {
          id: 'cors',
          name: 'cors',
          displayName: 'CORS',
          version: 'preview',
          description: 'Coming Soon',
          category: 'security',
          status: 'preview',
          tags: ['security'],
          dependencies: [],
          installed: false,
        },
        {
          id: 'rate_limiting',
          name: 'rate_limiting',
          displayName: 'Rate Limiting',
          version: 'preview',
          description: 'Coming Soon',
          category: 'security',
          status: 'preview',
          tags: ['security'],
          dependencies: [],
          installed: false,
        },
        {
          id: 'security_headers',
          name: 'security_headers',
          displayName: 'Security Headers',
          version: 'preview',
          description: 'Coming Soon',
          category: 'security',
          status: 'preview',
          tags: ['security'],
          dependencies: [],
          installed: false,
        },
      ],
      Tasks: [
        {
          id: 'celery',
          name: 'celery',
          displayName: 'Celery',
          version: 'preview',
          description: 'Coming Soon',
          category: 'tasks',
          status: 'preview',
          tags: ['tasks'],
          dependencies: [],
          installed: false,
        },
      ],
      Users: [
        {
          id: 'users_core',
          name: 'users_core',
          displayName: 'Users Core',
          version: 'preview',
          description: 'Coming Soon',
          category: 'users',
          status: 'preview',
          tags: ['users'],
          dependencies: [],
          installed: false,
        },
        {
          id: 'users_profiles',
          name: 'users_profiles',
          displayName: 'User Profiles',
          version: 'preview',
          description: 'Coming Soon',
          category: 'users',
          status: 'preview',
          tags: ['users'],
          dependencies: [],
          installed: false,
        },
      ],
    };

    const modules = previewModules[category] || [];
    return modules.map((module) => {
      const item = new vscode.TreeItem(module.displayName);
      item.description = module.status === 'preview' ? '🔜 Coming Soon' : `v${module.version}`;
      item.tooltip = module.description;
      item.contextValue = 'module';
      item.iconPath = new vscode.ThemeIcon(
        module.status === 'stable' ? 'verified' : module.status === 'preview' ? 'eye' : 'beaker'
      );
      // Disable command for preview modules
      if (module.status !== 'preview') {
        item.command = {
          command: 'rapidkit.addModule',
          title: 'Add Module',
          arguments: [module],
        };
      }
      return new ModuleTreeItem(item, 'module', module);
    });
  }
}

export class ModuleTreeItem extends vscode.TreeItem {
  constructor(
    item: vscode.TreeItem,
    public readonly contextValue: string,
    public readonly module?: RapidKitModule
  ) {
    super(item.label!, item.collapsibleState);
    this.description = item.description;
    this.tooltip = item.tooltip;
    this.iconPath = item.iconPath;
    this.command = item.command;
    this.contextValue = contextValue;
  }
}
