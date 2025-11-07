/**
 * Workspace Detector - Detects RapidKit projects in the workspace
 */

import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { RapidKitProject } from '../types';
import { Logger } from '../utils/logger';

export class WorkspaceDetector {
  private static instance: WorkspaceDetector;
  private logger = Logger.getInstance();
  private projects: RapidKitProject[] = [];

  private constructor() {}

  public static getInstance(): WorkspaceDetector {
    if (!WorkspaceDetector.instance) {
      WorkspaceDetector.instance = new WorkspaceDetector();
    }
    return WorkspaceDetector.instance;
  }

  /**
   * Detect all RapidKit projects in workspace
   */
  public async detectRapidKitProjects(): Promise<boolean> {
    if (!vscode.workspace.workspaceFolders) {
      return false;
    }

    this.projects = [];

    for (const folder of vscode.workspace.workspaceFolders) {
      const foundProjects = await this.scanDirectory(folder.uri.fsPath);
      this.projects.push(...foundProjects);
    }

    this.logger.info(`Detected ${this.projects.length} RapidKit project(s)`);
    return this.projects.length > 0;
  }

  /**
   * Scan directory for RapidKit projects
   */
  private async scanDirectory(dirPath: string): Promise<RapidKitProject[]> {
    const projects: RapidKitProject[] = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const projectPath = path.join(dirPath, entry.name);

          // Check if it's a RapidKit project
          if (await this.isRapidKitProject(projectPath)) {
            const project = await this.analyzeProject(projectPath);
            if (project) {
              projects.push(project);
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to scan directory ${dirPath}`, error);
    }

    return projects;
  }

  /**
   * Check if directory is a RapidKit project
   */
  private async isRapidKitProject(dirPath: string): Promise<boolean> {
    const indicators = [
      'pyproject.toml',
      '.rapidkit',
      'rapidkit.json',
      path.join('src', 'main.py'),
      path.join('src', 'app.ts'),
    ];

    for (const indicator of indicators) {
      const indicatorPath = path.join(dirPath, indicator);
      if (await fs.pathExists(indicatorPath)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Analyze project to extract metadata
   */
  private async analyzeProject(projectPath: string): Promise<RapidKitProject | null> {
    try {
      const projectName = path.basename(projectPath);
      let type: 'fastapi' | 'nestjs' = 'fastapi';
      let kit = 'unknown';
      const modules: string[] = [];

      // Check pyproject.toml for FastAPI
      const pyprojectPath = path.join(projectPath, 'pyproject.toml');
      if (await fs.pathExists(pyprojectPath)) {
        type = 'fastapi';
        const content = await fs.readFile(pyprojectPath, 'utf-8');
        if (content.includes('rapidkit')) {
          kit = 'fastapi.standard';
        }
      }

      // Check package.json for NestJS
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (await fs.pathExists(packageJsonPath)) {
        type = 'nestjs';
        const packageJson = await fs.readJson(packageJsonPath);
        if (packageJson.dependencies?.['@nestjs/core']) {
          kit = 'nestjs.standard';
        }
      }

      // Check for .rapidkit directory
      const rapidkitDir = path.join(projectPath, '.rapidkit');
      if (await fs.pathExists(rapidkitDir)) {
        // Read installed modules
        const modulesPath = path.join(rapidkitDir, 'modules.json');
        if (await fs.pathExists(modulesPath)) {
          const modulesData = await fs.readJson(modulesPath);
          modules.push(...(modulesData.installed || []));
        }
      }

      return {
        name: projectName,
        path: projectPath,
        type,
        kit,
        modules,
        isValid: true,
      };
    } catch (error) {
      this.logger.error(`Failed to analyze project ${projectPath}`, error);
      return null;
    }
  }

  /**
   * Get all detected projects
   */
  public getProjects(): RapidKitProject[] {
    return this.projects;
  }

  /**
   * Get project by path
   */
  public getProject(projectPath: string): RapidKitProject | undefined {
    return this.projects.find((p) => p.path === projectPath);
  }

  /**
   * Refresh project detection
   */
  public async refresh(): Promise<void> {
    await this.detectRapidKitProjects();
  }
}
