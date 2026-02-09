import * as vscode from 'vscode';
import { RapidKitCLI } from './rapidkitCLI';
import {
  loadModulesCatalog,
  invalidateModulesCatalogCache,
  ModulesCatalogResult,
} from './modulesCatalog';

export class ModulesCatalogService {
  private static instance: ModulesCatalogService | null = null;
  private readonly cli: RapidKitCLI;
  private readonly storagePath: string;
  private ttlMs: number;

  private constructor(context: vscode.ExtensionContext) {
    this.cli = new RapidKitCLI();
    this.storagePath = context.globalStorageUri.fsPath;
    this.ttlMs = 10 * 60 * 1000;
  }

  static initialize(context: vscode.ExtensionContext): ModulesCatalogService {
    if (!ModulesCatalogService.instance) {
      ModulesCatalogService.instance = new ModulesCatalogService(context);
    }
    return ModulesCatalogService.instance;
  }

  static getInstance(): ModulesCatalogService {
    if (!ModulesCatalogService.instance) {
      throw new Error('ModulesCatalogService not initialized');
    }
    return ModulesCatalogService.instance;
  }

  setTtlMs(ttlMs: number): void {
    this.ttlMs = ttlMs;
  }

  /**
   * Invalidate the modules catalog cache.
   * Call this when switching workspaces to ensure fresh data.
   * @param workspacePath - Optional workspace path to invalidate cache for specific workspace
   */
  async invalidateCache(workspacePath?: string): Promise<void> {
    await invalidateModulesCatalogCache(this.storagePath, workspacePath);
  }

  async getModulesCatalog(workspacePath?: string): Promise<ModulesCatalogResult> {
    return loadModulesCatalog({
      cli: this.cli,
      storagePath: this.storagePath,
      ttlMs: this.ttlMs,
      workspacePath,
    });
  }
}
