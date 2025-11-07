/**
 * Template Explorer TreeView Provider
 */

import * as vscode from 'vscode';
import { RapidKitTemplate } from '../../types';

export class TemplateExplorerProvider
  implements vscode.TreeDataProvider<TemplateTreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    TemplateTreeItem | undefined | null | void
  > = new vscode.EventEmitter<TemplateTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TemplateTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  constructor() {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TemplateTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TemplateTreeItem): Promise<TemplateTreeItem[]> {
    if (!element) {
      // Root level - show template categories
      return this.getTemplateCategories();
    } else if (element.contextValue === 'framework') {
      // Show templates for framework
      return this.getTemplatesForFramework(element.label as string);
    }

    return [];
  }

  private getTemplateCategories(): TemplateTreeItem[] {
    const frameworks = [
      { name: 'FastAPI', icon: 'symbol-property' },
      { name: 'NestJS', icon: 'symbol-class' },
    ];

    return frameworks.map((fw) => {
      const item = new vscode.TreeItem(
        fw.name,
        vscode.TreeItemCollapsibleState.Collapsed
      );
      item.contextValue = 'framework';
      item.iconPath = new vscode.ThemeIcon(fw.icon);
      return new TemplateTreeItem(item, 'framework');
    });
  }

  private getTemplatesForFramework(framework: string): TemplateTreeItem[] {
    const templates: Record<string, RapidKitTemplate[]> = {
      FastAPI: [
        {
          id: 'fastapi.standard',
          name: 'fastapi.standard',
          displayName: 'FastAPI Standard',
          description: 'Standard FastAPI project with essential features',
          framework: 'fastapi',
          category: 'starter',
          files: [],
        },
        {
          id: 'fastapi.advanced',
          name: 'fastapi.advanced',
          displayName: 'FastAPI Advanced',
          description: 'Advanced FastAPI with all features',
          framework: 'fastapi',
          category: 'starter',
          files: [],
        },
      ],
      NestJS: [
        {
          id: 'nestjs.standard',
          name: 'nestjs.standard',
          displayName: 'NestJS Standard',
          description: 'Standard NestJS project',
          framework: 'nestjs',
          category: 'starter',
          files: [],
        },
      ],
    };

    const items = templates[framework] || [];
    return items.map((template) => {
      const item = new vscode.TreeItem(template.displayName);
      item.description = template.category;
      item.tooltip = template.description;
      item.contextValue = 'template';
      item.iconPath = new vscode.ThemeIcon('file-code');
      item.command = {
        command: 'rapidkit.previewTemplate',
        title: 'Preview Template',
        arguments: [template],
      };
      return new TemplateTreeItem(item, 'template', template);
    });
  }
}

export class TemplateTreeItem extends vscode.TreeItem {
  constructor(
    item: vscode.TreeItem,
    public readonly contextValue: string,
    public readonly template?: RapidKitTemplate
  ) {
    super(item.label!, item.collapsibleState);
    this.description = item.description;
    this.tooltip = item.tooltip;
    this.iconPath = item.iconPath;
    this.command = item.command;
    this.contextValue = contextValue;
  }
}
