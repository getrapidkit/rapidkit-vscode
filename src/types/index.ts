/**
 * TypeScript type definitions for RapidKit
 */

export interface RapidKitWorkspace {
  name: string;
  path: string;
  mode: 'demo' | 'full';
  projects: string[];
}

export interface RapidKitProject {
  name: string;
  path: string;
  type: 'fastapi' | 'nestjs';
  kit: string;
  modules: string[];
  isValid: boolean;
  workspacePath?: string;
}

export interface RapidKitModule {
  id: string;
  name: string;
  displayName: string;
  version: string;
  description: string;
  category: string;
  status: 'stable' | 'beta' | 'experimental' | 'preview';
  tags: string[];
  dependencies: string[];
  installed: boolean;
}

export interface RapidKitTemplate {
  id: string;
  name: string;
  displayName: string;
  description: string;
  framework: 'fastapi' | 'nestjs';
  category: string;
  files: string[];
}

export interface WorkspaceConfig {
  name: string;
  path: string;
  initGit: boolean;
}

export interface ProjectConfig {
  name: string;
  framework: 'fastapi' | 'nestjs';
  packageManager?: string; // For NestJS: npm, yarn, pnpm
}

export interface RapidKitConfig {
  defaultKit?: string;
  defaultInstallMethod?: string;
  pythonVersion?: string;
  author?: string;
  license?: string;
  skipGit?: boolean;
}

export interface CommandResult {
  success: boolean;
  message?: string;
  error?: Error;
  data?: any;
}

export interface ProgressOptions {
  title: string;
  cancellable?: boolean;
  location?: 'notification' | 'window';
}

export type NotificationLevel = 'info' | 'warning' | 'error' | 'success';

export interface SystemCheckResult {
  passed: boolean;
  checks: {
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
  }[];
}
