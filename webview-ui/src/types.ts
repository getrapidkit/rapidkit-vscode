/**
 * Type definitions for RapidKit data structures
 */

export interface ModuleData {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  icon: string;
  color?: string;
  version?: string;
  slug?: string;
  status?: 'stable' | 'beta' | 'experimental';
  dependencies?: string[];
  tags?: string[];
}

export interface CategoryInfo {
  [key: string]: {
    emoji: string;
    color: string;
  };
}

export interface Workspace {
  name: string;
  path: string;
  lastAccessed?: number;
}

export interface InstallStatus {
  npmInstalled: boolean;
  coreInstalled: boolean;
  coreVersion?: string;
}

export interface WorkspaceStatus {
  hasWorkspace: boolean;
  workspaceName?: string;
  workspacePath?: string;
  installedModules?: { slug: string; version: string; display_name: string }[];
  seq?: number;
}
