/**
 * Configuration Manager for RapidKit extension
 * Handles user settings, workspace config, and .rapidkitrc.json
 */

import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { RapidKitConfig } from '../types';
import { Logger } from '../utils/logger';

export class ConfigurationManager {
  private static instance: ConfigurationManager;
  // @ts-expect-error - context is used by initialize() method
  private context: vscode.ExtensionContext | null = null;
  private userConfig: RapidKitConfig = {};
  private logger = Logger.getInstance();

  private constructor() {}

  public static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  public async initialize(context: vscode.ExtensionContext): Promise<void> {
    this.context = context;
    await this.loadUserConfig();
    this.watchConfiguration();
  }

  /**
   * Load user configuration from ~/.rapidkitrc.json
   */
  private async loadUserConfig(): Promise<void> {
    try {
      const configPath = path.join(os.homedir(), '.rapidkitrc.json');
      if (await fs.pathExists(configPath)) {
        const content = await fs.readFile(configPath, 'utf-8');
        this.userConfig = JSON.parse(content);
        this.logger.info('Loaded user config from ~/.rapidkitrc.json', this.userConfig);
      }
    } catch (error) {
      this.logger.warn('Failed to load user config', error);
    }
  }

  /**
   * Watch for configuration changes
   */
  private watchConfiguration(): void {
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('rapidkit')) {
        this.logger.info('RapidKit configuration changed');
        vscode.commands.executeCommand('rapidkit.refreshProjects');
      }
    });
  }

  /**
   * Get configuration value with fallback order:
   * VS Code settings > User config file > Default
   */
  public get<T>(key: string, defaultValue?: T): T {
    // Try VS Code settings first
    const vsConfig = vscode.workspace.getConfiguration('rapidkit');
    const vsValue = vsConfig.get<T>(key);
    if (vsValue !== undefined) {
      return vsValue;
    }

    // Try user config file
    const configKey = this.convertKeyToConfigPath(key);
    const userValue = this.getNestedValue(this.userConfig, configKey);
    if (userValue !== undefined) {
      return userValue as T;
    }

    // Return default
    return defaultValue as T;
  }

  /**
   * Update VS Code configuration
   */
  public async set(
    key: string,
    value: any,
    target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
  ): Promise<void> {
    const config = vscode.workspace.getConfiguration('rapidkit');
    await config.update(key, value, target);
  }

  /**
   * Get all configuration as object
   */
  public getAll(): any {
    const vsConfig = vscode.workspace.getConfiguration('rapidkit');
    return {
      ...this.userConfig,
      pythonPath: vsConfig.get('pythonPath'),
      defaultKit: vsConfig.get('defaultKit'),
      autoRefresh: vsConfig.get('autoRefresh'),
      showWelcomeOnStartup: vsConfig.get('showWelcomeOnStartup'),
      templatePreview: vsConfig.get('templatePreview'),
      notifications: vsConfig.get('notifications'),
      terminal: {
        autoActivate: vsConfig.get('terminal.autoActivate'),
      },
      git: {
        autoInit: vsConfig.get('git.autoInit'),
      },
    };
  }

  /**
   * Open user config file in editor
   */
  public async openUserConfig(): Promise<void> {
    const configPath = path.join(os.homedir(), '.rapidkitrc.json');

    // Create if doesn't exist
    if (!(await fs.pathExists(configPath))) {
      const defaultConfig: RapidKitConfig = {
        defaultKit: 'fastapi.standard',
        defaultInstallMethod: 'poetry',
        pythonVersion: '3.10',
        author: '',
        license: 'MIT',
        skipGit: false,
      };
      await fs.writeJson(configPath, defaultConfig, { spaces: 2 });
    }

    const doc = await vscode.workspace.openTextDocument(configPath);
    await vscode.window.showTextDocument(doc);
  }

  private convertKeyToConfigPath(key: string): string {
    return key.replace(/\./g, '_');
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('_').reduce((current, key) => current?.[key], obj);
  }
}
