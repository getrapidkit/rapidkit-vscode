/**
 * Actions Tree Provider
 * Shows quick action buttons in the sidebar
 */

import * as vscode from 'vscode';

export class ActionsProvider implements vscode.TreeDataProvider<ActionItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ActionItem | undefined | null | void> =
    new vscode.EventEmitter<ActionItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ActionItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ActionItem): vscode.TreeItem {
    return element;
  }

  async getChildren(_element?: ActionItem): Promise<ActionItem[]> {
    // Return empty array - buttons are shown via viewsWelcome
    return [];
  }
}

class ActionItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly tooltip: string,
    public readonly commandId: string,
    public readonly iconName: string
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.tooltip = tooltip;
    this.iconPath = new vscode.ThemeIcon(iconName);
    this.command = {
      command: commandId,
      title: label,
    };
  }
}
