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
    // Strong markers created by RapidKit
    const strongIndicators = [
      path.join('.rapidkit', 'project.json'),
      path.join('.rapidkit', 'context.json'),
    ];
    for (const indicator of strongIndicators) {
      if (await fs.pathExists(path.join(dirPath, indicator))) {
        return true;
      }
    }

    // Fallback: require a .rapidkit directory plus at least one language hint.
    const hasRapidkitDir = await fs.pathExists(path.join(dirPath, '.rapidkit'));
    if (!hasRapidkitDir) {
      return false;
    }

    const weakIndicators = [
      'pyproject.toml',
      'package.json',
      'go.mod',
      'go.sum',
      path.join('src', 'main.py'),
      path.join('src', 'app.ts'),
      path.join('cmd', 'main.go'),
      path.join('main.go'),
    ];
    for (const indicator of weakIndicators) {
      if (await fs.pathExists(path.join(dirPath, indicator))) {
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
      let type: 'fastapi' | 'nestjs' | 'go' = 'fastapi';
      let kit = 'unknown';
      const modules: string[] = [];

      const goModPath = path.join(projectPath, 'go.mod');
      const goSumPath = path.join(projectPath, 'go.sum');
      const goMainPath = path.join(projectPath, 'main.go');
      const goCmdMainPath = path.join(projectPath, 'cmd', 'main.go');

      if (
        (await fs.pathExists(goModPath)) ||
        (await fs.pathExists(goSumPath)) ||
        (await fs.pathExists(goMainPath)) ||
        (await fs.pathExists(goCmdMainPath))
      ) {
        type = 'go';
        try {
          if (await fs.pathExists(goModPath)) {
            const content = await fs.readFile(goModPath, 'utf-8');
            if (content.includes('github.com/getrapidkit') || content.includes('rapidkit')) {
              if (content.includes('gofiber')) {
                kit = 'gofiber.standard';
              } else if (content.includes('gogin')) {
                kit = 'gogin.standard';
              } else {
                kit = 'go.standard';
              }
            } else {
              kit = 'go.standard';
            }
          } else {
            kit = 'go.standard';
          }
        } catch {
          kit = 'go.standard';
        }
      }

      // Check pyproject.toml for FastAPI
      const pyprojectPath = path.join(projectPath, 'pyproject.toml');
      if (type !== 'go' && (await fs.pathExists(pyprojectPath))) {
        type = 'fastapi';
        const content = await fs.readFile(pyprojectPath, 'utf-8');
        if (content.includes('rapidkit')) {
          kit = 'fastapi.standard';
        }
      }

      // Check package.json for NestJS
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (type !== 'go' && (await fs.pathExists(packageJsonPath))) {
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
