/**
 * Module Explorer TreeView Provider
 */

import * as vscode from 'vscode';
import { RapidKitModule } from '../../types';

export class ModuleExplorerProvider
  implements vscode.TreeDataProvider<ModuleTreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    ModuleTreeItem | undefined | null | void
  > = new vscode.EventEmitter<ModuleTreeItem | undefined | null | void>();
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
      { name: 'Authentication', icon: 'shield' },
      { name: 'Database', icon: 'database' },
      { name: 'Caching', icon: 'zap' },
      { name: 'Communication', icon: 'mail' },
      { name: 'Security', icon: 'lock' },
      { name: 'Core', icon: 'gear' },
      { name: 'Users', icon: 'person' },
    ];

    return categories.map((cat) => {
      const item = new vscode.TreeItem(
        cat.name,
        vscode.TreeItemCollapsibleState.Collapsed
      );
      item.contextValue = 'category';
      item.iconPath = new vscode.ThemeIcon(cat.icon);
      return new ModuleTreeItem(item, 'category');
    });
  }

  private getModulesInCategory(category: string): ModuleTreeItem[] {
    // Mock modules - In production, this will be fetched from API or core engine
    const mockModules: Record<string, RapidKitModule[]> = {
      Authentication: [
        {
          id: 'auth_core',
          name: 'auth_core',
          displayName: 'Authentication Core',
          version: '0.1.1',
          description: 'Password hashing, token signing',
          category: 'auth',
          status: 'stable',
          tags: ['auth', 'security'],
          dependencies: [],
          installed: false,
        },
        {
          id: 'oauth',
          name: 'oauth',
          displayName: 'OAuth Providers',
          version: '0.1.0',
          description: 'OAuth 2.0 scaffolding',
          category: 'auth',
          status: 'stable',
          tags: ['auth', 'oauth'],
          dependencies: ['auth_core'],
          installed: false,
        },
      ],
      Database: [
        {
          id: 'db_postgres',
          name: 'db_postgres',
          displayName: 'PostgreSQL',
          version: '1.0.17',
          description: 'SQLAlchemy async+sync Postgres',
          category: 'database',
          status: 'stable',
          tags: ['database', 'postgresql'],
          dependencies: [],
          installed: false,
        },
      ],
      Caching: [
        {
          id: 'redis',
          name: 'redis',
          displayName: 'Redis Cache',
          version: '1.0.0',
          description: 'Production-ready Redis runtime',
          category: 'cache',
          status: 'stable',
          tags: ['cache', 'redis'],
          dependencies: [],
          installed: false,
        },
      ],
    };

    const modules = mockModules[category] || [];
    return modules.map((module) => {
      const item = new vscode.TreeItem(module.displayName);
      item.description = `v${module.version}`;
      item.tooltip = module.description;
      item.contextValue = 'module';
      item.iconPath = new vscode.ThemeIcon(
        module.status === 'stable' ? 'verified' : 'beaker'
      );
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
