/**
 * Workspace Usage Tracker
 * Tracks VS Code Extension interaction with workspaces
 */

import * as vscode from 'vscode';
import { Logger } from './logger';
import { readWorkspaceMarker, updateWorkspaceMetadata } from './workspaceMarker';
import { getExtensionVersion } from './constants';

export class WorkspaceUsageTracker {
  private static instance: WorkspaceUsageTracker;
  private logger: Logger;
  private trackedWorkspaces = new Set<string>();

  private constructor() {
    this.logger = Logger.getInstance();
  }

  static getInstance(): WorkspaceUsageTracker {
    if (!WorkspaceUsageTracker.instance) {
      WorkspaceUsageTracker.instance = new WorkspaceUsageTracker();
    }
    return WorkspaceUsageTracker.instance;
  }

  /**
   * Track that a workspace was opened in VS Code
   * Updates the workspace marker with VS Code metadata
   */
  async trackWorkspaceOpen(workspacePath: string): Promise<void> {
    // Only track once per session
    if (this.trackedWorkspaces.has(workspacePath)) {
      return;
    }

    try {
      const marker = await readWorkspaceMarker(workspacePath);

      if (!marker) {
        // Not a RapidKit workspace
        return;
      }

      const currentCount = marker.metadata?.vscode?.openCount || 0;
      const wasCreatedViaExtension = marker.metadata?.vscode?.createdViaExtension || false;

      await updateWorkspaceMetadata(workspacePath, {
        vscode: {
          extensionVersion: getExtensionVersion(),
          createdViaExtension: wasCreatedViaExtension,
          lastOpenedAt: new Date().toISOString(),
          openCount: currentCount + 1,
        },
      });

      this.trackedWorkspaces.add(workspacePath);
      this.logger.debug(`Tracked workspace open: ${workspacePath} (count: ${currentCount + 1})`);
    } catch (error) {
      // Silent fail - tracking is optional
      this.logger.debug(`Failed to track workspace open: ${error}`);
    }
  }

  /**
   * Initialize tracking for active workspaces
   */
  async initialize(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders) {
      return;
    }

    for (const folder of workspaceFolders) {
      await this.trackWorkspaceOpen(folder.uri.fsPath);
    }
  }
}
