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
    // Stable module list aligned with rapidkit modules list (id = slug for rapidkit add module <slug>)
    const stableModules: Record<string, RapidKitModule[]> = {
      AI: [
        {
          id: 'ai_assistant',
          name: 'ai_assistant',
          displayName: 'Ai Assistant',
          version: '0.1.7',
          description: 'Provides AI assistant capabilities',
          category: 'ai',
          status: 'stable',
          tags: ['ai'],
          dependencies: [],
          installed: false,
        },
      ],
      Authentication: [
        {
          id: 'api_keys',
          name: 'api_keys',
          displayName: 'API Keys',
          version: '0.1.0',
          description: 'API key issuance, verification and auditing',
          category: 'auth',
          status: 'stable',
          tags: ['auth'],
          dependencies: [],
          installed: false,
        },
        {
          id: 'auth_core',
          name: 'auth_core',
          displayName: 'Authentication Core',
          version: '0.1.0',
          description: 'Password hashing, token signing, and runtime auth',
          category: 'auth',
          status: 'stable',
          tags: ['auth'],
          dependencies: [],
          installed: false,
        },
        {
          id: 'oauth',
          name: 'oauth',
          displayName: 'OAuth Providers',
          version: '0.1.0',
          description: 'OAuth 2.0 scaffold with provider registry',
          category: 'auth',
          status: 'stable',
          tags: ['auth'],
          dependencies: [],
          installed: false,
        },
        {
          id: 'passwordless',
          name: 'passwordless',
          displayName: 'Passwordless Authentication',
          version: '0.1.0',
          description: 'Magic link and one-time code authentication',
          category: 'auth',
          status: 'stable',
          tags: ['auth'],
          dependencies: [],
          installed: false,
        },
        {
          id: 'session',
          name: 'session',
          displayName: 'Session Management',
          version: '0.1.0',
          description: 'Session management with signed cookies',
          category: 'auth',
          status: 'stable',
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
          version: '0.1.4',
          description: 'Shopping cart service for checkout flows',
          category: 'billing',
          status: 'stable',
          tags: ['billing'],
          dependencies: [],
          installed: false,
        },
        {
          id: 'inventory',
          name: 'inventory',
          displayName: 'Inventory',
          version: '0.1.4',
          description: 'Inventory and pricing service for Cart + Stripe',
          category: 'billing',
          status: 'stable',
          tags: ['billing'],
          dependencies: [],
          installed: false,
        },
        {
          id: 'stripe_payment',
          name: 'stripe_payment',
          displayName: 'Stripe Payment',
          version: '0.1.0',
          description: 'Stripe payments and subscriptions',
          category: 'billing',
          status: 'stable',
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
          version: '0.1.0',
          description: 'File storage and media management',
          category: 'business',
          status: 'stable',
          tags: ['business'],
          dependencies: [],
          installed: false,
        },
      ],
      Cache: [
        {
          id: 'redis',
          name: 'redis',
          displayName: 'Redis Cache',
          version: '0.1.8',
          description: 'Redis runtime with async and sync client',
          category: 'cache',
          status: 'stable',
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
          version: '0.1.10',
          description: 'Email delivery',
          category: 'communication',
          status: 'stable',
          tags: ['communication'],
          dependencies: [],
          installed: false,
        },
        {
          id: 'notifications',
          name: 'notifications',
          displayName: 'Unified Notifications',
          version: '0.1.17',
          description: 'Email-first notifications with SMTP delivery',
          category: 'communication',
          status: 'stable',
          tags: ['communication'],
          dependencies: [],
          installed: false,
        },
      ],
      Database: [
        {
          id: 'db_mongo',
          name: 'db_mongo',
          displayName: 'Db Mongo',
          version: '0.1.2',
          description: 'MongoDB integration with async driver',
          category: 'database',
          status: 'stable',
          tags: ['database'],
          dependencies: [],
          installed: false,
        },
        {
          id: 'db_sqlite',
          name: 'db_sqlite',
          displayName: 'Db Sqlite',
          version: '0.1.3',
          description: 'SQLite for development and testing',
          category: 'database',
          status: 'stable',
          tags: ['database'],
          dependencies: [],
          installed: false,
        },
        {
          id: 'db_postgres',
          name: 'db_postgres',
          displayName: 'PostgreSQL',
          version: '0.1.24',
          description: 'SQLAlchemy async Postgres with DI and health checks',
          category: 'database',
          status: 'stable',
          tags: ['database'],
          dependencies: [],
          installed: false,
        },
      ],
      Essentials: [
        {
          id: 'settings',
          name: 'settings',
          displayName: 'Application Settings',
          version: '0.1.32',
          description: 'Centralized modular configuration with Pydantic',
          category: 'essentials',
          status: 'stable',
          tags: ['essentials'],
          dependencies: [],
          installed: false,
        },
        {
          id: 'deployment',
          name: 'deployment',
          displayName: 'Deployment Toolkit',
          version: '0.1.3',
          description: 'Docker, Compose, Makefile and CI assets for RapidKit',
          category: 'essentials',
          status: 'stable',
          tags: ['essentials'],
          dependencies: [],
          installed: false,
        },
        {
          id: 'middleware',
          name: 'middleware',
          displayName: 'Middleware',
          version: '0.1.13',
          description: 'HTTP middleware pipeline for FastAPI and NestJS',
          category: 'essentials',
          status: 'stable',
          tags: ['essentials'],
          dependencies: [],
          installed: false,
        },
        {
          id: 'logging',
          name: 'logging',
          displayName: 'Structured Logging & Observability',
          version: '0.1.2',
          description: 'Structured logging with correlation IDs and multi-sink',
          category: 'essentials',
          status: 'stable',
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
          version: '0.1.10',
          description: 'Metrics, tracing, and structured logging foundation',
          category: 'observability',
          status: 'stable',
          tags: ['observability'],
          dependencies: [],
          installed: false,
        },
      ],
      Security: [
        {
          id: 'cors',
          name: 'cors',
          displayName: 'Cors',
          version: '0.1.0',
          description: 'Cross-Origin Resource Sharing security module',
          category: 'security',
          status: 'stable',
          tags: ['security'],
          dependencies: [],
          installed: false,
        },
        {
          id: 'rate_limiting',
          name: 'rate_limiting',
          displayName: 'Rate Limiting',
          version: '0.1.0',
          description: 'Request throttling with configurable rules',
          category: 'security',
          status: 'stable',
          tags: ['security'],
          dependencies: [],
          installed: false,
        },
        {
          id: 'security_headers',
          name: 'security_headers',
          displayName: 'Security Headers',
          version: '0.1.0',
          description: 'Harden HTTP responses with security headers',
          category: 'security',
          status: 'stable',
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
          version: '0.1.1',
          description: 'Celery task orchestration for async workflows',
          category: 'tasks',
          status: 'stable',
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
          version: '0.1.0',
          description: 'User management backbone with immutable profile',
          category: 'users',
          status: 'stable',
          tags: ['users'],
          dependencies: [],
          installed: false,
        },
        {
          id: 'users_profiles',
          name: 'users_profiles',
          displayName: 'Users Profiles',
          version: '0.1.0',
          description: 'Extends Users Core with rich profile modelling',
          category: 'users',
          status: 'stable',
          tags: ['users'],
          dependencies: [],
          installed: false,
        },
      ],
    };

    const modules = stableModules[category] || [];
    return modules.map((module) => {
      const item = new vscode.TreeItem(module.displayName);
      item.description = `v${module.version}`;
      item.tooltip = `${module.description}\n\nClick to add to project`;
      item.contextValue = 'module';

      // Minimal plus/add icon for installing modules
      item.iconPath = new vscode.ThemeIcon('diff-added', new vscode.ThemeColor('charts.green'));

      item.command = {
        command: 'rapidkit.addModule',
        title: 'Add Module',
        arguments: [module],
      };
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
