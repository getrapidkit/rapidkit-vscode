/**
 * VS Code API wrapper for React webview
 * Handles communication between webview and extension
 */

// VS Code API type (provided by extension host)
declare function acquireVsCodeApi(): {
  postMessage(message: any): void;
  getState(): any;
  setState(state: any): void;
};

class VSCodeAPI {
  private readonly vscode;

  constructor() {
    this.vscode = acquireVsCodeApi();
  }

  /**
   * Send message to extension
   */
  public postMessage(command: string, data?: any) {
    this.vscode.postMessage({ command, data });
  }

  /**
   * Get webview state
   */
  public getState<T = any>(): T | undefined {
    return this.vscode.getState();
  }

  /**
   * Set webview state (persists across reloads)
   */
  public setState<T = any>(state: T) {
    this.vscode.setState(state);
  }
}

// Singleton instance
export const vscode = new VSCodeAPI();
