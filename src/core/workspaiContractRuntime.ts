import * as fs from 'fs-extra';
import * as path from 'path';
import { parse as parseYaml } from 'yaml';

import type { ArchitectureIR } from './architectureIr';
import {
  ArchitectureConfigValidator,
  ExecutionPolicyValidator,
  ProjectMappingValidator,
  type ArchitectureConfig,
  type ExecutionPolicy,
  type ProjectMapping,
  validateWorkspaiContracts,
} from './configValidators';

export type WorkspaiContractKind = 'architecture.config' | 'project.mapping' | 'execution.policy';

type WorkspaiContractSource = 'project' | 'workspace';

type LoadedContractFile = {
  kind: WorkspaiContractKind;
  filePath: string;
  source: WorkspaiContractSource;
};

export type WorkspaiContractRuntimeEvidence = {
  evaluated: boolean;
  source: WorkspaiContractSource | 'mixed' | 'none';
  discoveredFiles: string[];
  availableKinds: WorkspaiContractKind[];
  missingKinds: WorkspaiContractKind[];
  errors: string[];
  warnings: string[];
  summary: string;
};

const CONTRACT_KINDS: WorkspaiContractKind[] = [
  'architecture.config',
  'project.mapping',
  'execution.policy',
];

const CONTRACT_SEARCH_DIRECTORIES = ['.workspai', '.rapidkit', ''];
const CONTRACT_SEARCH_EXTENSIONS = ['yaml', 'yml', 'json'];

function normalizeUniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

async function findContractFile(
  roots: Array<{ rootPath: string; source: WorkspaiContractSource }>,
  kind: WorkspaiContractKind
): Promise<LoadedContractFile | undefined> {
  for (const root of roots) {
    for (const directory of CONTRACT_SEARCH_DIRECTORIES) {
      for (const extension of CONTRACT_SEARCH_EXTENSIONS) {
        const candidatePath = directory
          ? path.join(root.rootPath, directory, `${kind}.${extension}`)
          : path.join(root.rootPath, `${kind}.${extension}`);

        if (await fs.pathExists(candidatePath)) {
          return {
            kind,
            filePath: candidatePath,
            source: root.source,
          };
        }
      }
    }
  }

  return undefined;
}

async function parseContractFile<T extends object>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, 'utf8');
  const extension = path.extname(filePath).toLowerCase();
  const parsed = extension === '.json' ? JSON.parse(raw) : parseYaml(raw);

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('contract file must parse to an object');
  }

  return parsed as T;
}

function summarizeContractRuntime(input: {
  source: WorkspaiContractRuntimeEvidence['source'];
  availableKinds: WorkspaiContractKind[];
  errors: string[];
  warnings: string[];
}): string {
  if (input.availableKinds.length === 0) {
    return 'C06 contracts not found. Incident Studio is relying on graph and discovery evidence only.';
  }

  return `C06 contracts loaded from ${input.source} scope (${input.availableKinds.join(', ')}): ${input.errors.length} error(s), ${input.warnings.length} warning(s).`;
}

export async function evaluateWorkspaiContractRuntime(input: {
  workspacePath?: string;
  projectPath?: string;
  ir?: ArchitectureIR;
}): Promise<WorkspaiContractRuntimeEvidence> {
  const searchRoots = normalizeUniqueStrings([
    input.projectPath || '',
    input.workspacePath || '',
  ]).map((rootPath) => ({
    rootPath,
    source: rootPath === input.projectPath ? ('project' as const) : ('workspace' as const),
  }));

  if (searchRoots.length === 0) {
    return {
      evaluated: false,
      source: 'none',
      discoveredFiles: [],
      availableKinds: [],
      missingKinds: CONTRACT_KINDS,
      errors: [],
      warnings: [],
      summary:
        'C06 contracts not found. Incident Studio is relying on graph and discovery evidence only.',
    };
  }

  const discoveredFiles = await Promise.all(
    CONTRACT_KINDS.map((kind) => findContractFile(searchRoots, kind))
  );
  const loadedFiles = discoveredFiles.filter(
    (file): file is LoadedContractFile => typeof file?.filePath === 'string'
  );

  const availableKinds = loadedFiles.map((file) => file.kind);
  const missingKinds = CONTRACT_KINDS.filter((kind) => !availableKinds.includes(kind));

  if (loadedFiles.length === 0) {
    return {
      evaluated: false,
      source: 'none',
      discoveredFiles: [],
      availableKinds: [],
      missingKinds,
      errors: [],
      warnings: [],
      summary:
        'C06 contracts not found. Incident Studio is relying on graph and discovery evidence only.',
    };
  }

  const sourceSet = new Set(loadedFiles.map((file) => file.source));
  const source: WorkspaiContractRuntimeEvidence['source'] =
    sourceSet.size > 1 ? 'mixed' : loadedFiles[0].source;
  const errors: string[] = [];
  const warnings: string[] = [];

  let architectureConfig: ArchitectureConfig | undefined;
  let projectMapping: ProjectMapping | undefined;
  let executionPolicy: ExecutionPolicy | undefined;

  for (const file of loadedFiles) {
    try {
      if (file.kind === 'architecture.config') {
        architectureConfig = await parseContractFile<ArchitectureConfig>(file.filePath);
      } else if (file.kind === 'project.mapping') {
        projectMapping = await parseContractFile<ProjectMapping>(file.filePath);
      } else {
        executionPolicy = await parseContractFile<ExecutionPolicy>(file.filePath);
      }
    } catch (error) {
      errors.push(
        `${file.kind} (${path.basename(file.filePath)}) failed to parse: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  if (errors.length === 0) {
    if (architectureConfig && projectMapping && executionPolicy) {
      const result = validateWorkspaiContracts({
        architectureConfig,
        projectMapping,
        executionPolicy,
        ir: input.ir,
      });
      errors.push(...result.errors.map((message) => `C06 contract error: ${message}`));
      warnings.push(...result.warnings.map((message) => `C06 contract warning: ${message}`));
    } else {
      if (architectureConfig) {
        const result = new ArchitectureConfigValidator().validate(architectureConfig);
        errors.push(...result.errors.map((message) => `C06 contract error: ${message}`));
        warnings.push(...result.warnings.map((message) => `C06 contract warning: ${message}`));
      }

      if (projectMapping) {
        const result = new ProjectMappingValidator().validate(projectMapping, architectureConfig);
        errors.push(...result.errors.map((message) => `C06 contract error: ${message}`));
        warnings.push(...result.warnings.map((message) => `C06 contract warning: ${message}`));
      }

      if (executionPolicy) {
        const result = new ExecutionPolicyValidator().validate(executionPolicy);
        errors.push(...result.errors.map((message) => `C06 contract error: ${message}`));
        warnings.push(...result.warnings.map((message) => `C06 contract warning: ${message}`));
      }

      if (missingKinds.length > 0) {
        warnings.push(`C06 contract set is incomplete; missing ${missingKinds.join(', ')}.`);
      }
    }
  }

  const normalizedErrors = normalizeUniqueStrings(errors);
  const normalizedWarnings = normalizeUniqueStrings(warnings);

  return {
    evaluated: true,
    source,
    discoveredFiles: loadedFiles.map((file) => file.filePath),
    availableKinds,
    missingKinds,
    errors: normalizedErrors,
    warnings: normalizedWarnings,
    summary: summarizeContractRuntime({
      source,
      availableKinds,
      errors: normalizedErrors,
      warnings: normalizedWarnings,
    }),
  };
}
