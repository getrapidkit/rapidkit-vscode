/**
 * Status Bar for RapidKit extension
 */

import * as vscode from 'vscode';

export class RapidKitStatusBar implements vscode.Disposable {
  private statusBarItem: vscode.StatusBarItem;
  private projectCount: number = 0;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.statusBarItem.command = 'rapidkit.showWelcome';
    this.updateStatus('ready');
    this.statusBarItem.show();
  }

  public updateProjectCount(count: number): void {
    this.projectCount = count;
    this.updateStatus('ready');
  }

  public updateStatus(status: 'ready' | 'working' | 'error', message?: string): void {
    switch (status) {
      case 'ready': {
        const projectText =
          this.projectCount > 0
            ? ` | ${this.projectCount} Project${this.projectCount > 1 ? 's' : ''}`
            : '';
        this.statusBarItem.text = `🚀 RapidKit${projectText} | Ready`;
        this.statusBarItem.tooltip = 'Click to open RapidKit quick actions';
        this.statusBarItem.backgroundColor = undefined;
        break;
      }
      case 'working':
        this.statusBarItem.text = `$(sync~spin) RapidKit: ${message || 'Working...'}`;
        this.statusBarItem.tooltip = message;
        this.statusBarItem.backgroundColor = undefined;
        break;
      case 'error':
        this.statusBarItem.text = '$(error) RapidKit';
        this.statusBarItem.tooltip = message || 'Error occurred';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        break;
    }
  }

  public dispose(): void {
    this.statusBarItem.dispose();
  }
}
