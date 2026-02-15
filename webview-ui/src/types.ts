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
  tier?: string;
  capabilities?: string[];
  module_dependencies?: string[];
  runtime_dependencies?: Record<
    string,
    Array<{
      name: string;
      source: string;
      tool: string;
      version: string;
    }>
  >;
  config_sources?: string[];
  defaults?: Record<string, any>;
  variables?: Array<{
    key: string;
    type: string;
    default: any;
    description: string;
  }>;
  profiles?: Record<
    string,
    {
      description: string;
      inherits?: string;
    }
  >;
  features?:
    | string[]
    | Record<
        string,
        {
          status: string;
          enabled: boolean;
          description: string;
          files?: Array<{
            path: string;
            description: string;
          }>;
        }
      >;
  documentation?: {
    changelog?: string;
    readme?: string;
    overview?: string;
    usage?: string;
    advanced?: string;
    migration?: string;
    troubleshooting?: string;
    api_docs?: string;
    quick_guide?: string;
    links?: Record<string, string>;
  };
  compatibility?: {
    python?: string;
    node?: string;
    frameworks?: string[];
    os?: string[];
  };
  changelog?: Array<{
    version: string;
    date: string;
    notes: string;
  }>;
  support?: {
    issues?: string;
    discussions?: string;
    documentation?: string;
  };
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
  coreVersion?: string;
  coreLatestVersion?: string;
  coreStatus?: 'ok' | 'outdated' | 'not-installed' | 'update-available' | 'error';
  coreLocation?: 'workspace' | 'global' | 'pipx';
  lastModified?: number;
  projectCount?: number;
  projectStats?: {
    fastapi?: number;
    nestjs?: number;
  };
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
  isRunning?: boolean;
  runningPort?: number;
  seq?: number;
}

export interface ExampleProject {
  name: string;
  type: 'fastapi' | 'nestjs';
  description: string;
}

export interface ExampleWorkspace {
  id?: string;
  name: string;
  title: string;
  description: string;
  repoUrl: string;
  path?: string;
  projects: ExampleProject[];
  tags?: string[];
  featured?: boolean;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  cloneStatus?: 'not-cloned' | 'cloned' | 'update-available';
}

export interface Kit {
  name: string;
  display_name: string;
  category: 'fastapi' | 'nestjs' | string;
  version: string;
  tags?: string[];
  modules?: string[];
  description: string;
}
