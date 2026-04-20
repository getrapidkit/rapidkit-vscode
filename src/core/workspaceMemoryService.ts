/**
 * WorkspaceMemoryService
 * Reads and writes project-level memory stored in .rapidkit/workspace-memory.json.
 * The memory is injected into every AI system prompt so the model has persistent
 * context about conventions, decisions, and the project overview.
 */

import * as fs from 'fs';
import * as path from 'path';

const fsp = fs.promises;

export interface WorkspaceMemory {
  /** One-line project overview shown at the top of every AI prompt. */
  context: string;
  /** Team coding conventions (e.g. "All services use Repository Pattern"). */
  conventions: string[];
  /** Architecture decisions with optional date (e.g. "Chose Redis — April 2026"). */
  decisions: string[];
  lastUpdated: string;
}

const DEFAULT_MEMORY: WorkspaceMemory = {
  context: '',
  conventions: [],
  decisions: [],
  lastUpdated: '',
};

/**
 * Example workspace-memory.json written when the user runs "Edit Memory" for
 * the first time on an empty workspace.
 */
const TEMPLATE_MEMORY: WorkspaceMemory = {
  context:
    'Describe your project in one sentence (e.g. B2B SaaS backend — auth, billing, notifications)',
  conventions: [
    'All async functions use async/await (no raw .then() chains)',
    'Domain models are pure dataclasses — no ORM mixins in domain layer',
  ],
  decisions: ['Chose PostgreSQL over MongoDB — relational data model fits our queries'],
  lastUpdated: '',
};

export class WorkspaceMemoryService {
  private static _instance: WorkspaceMemoryService;

  private constructor() {}

  static getInstance(): WorkspaceMemoryService {
    if (!WorkspaceMemoryService._instance) {
      WorkspaceMemoryService._instance = new WorkspaceMemoryService();
    }
    return WorkspaceMemoryService._instance;
  }

  private memoryPath(workspacePath: string): string {
    return path.join(workspacePath, '.rapidkit', 'workspace-memory.json');
  }

  private async pathExists(targetPath: string): Promise<boolean> {
    try {
      await fsp.access(targetPath);
      return true;
    } catch {
      return false;
    }
  }

  private isValidIsoTimestamp(value: string): boolean {
    return !Number.isNaN(Date.parse(value));
  }

  private sanitizeStringList(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private sanitizeMemory(input: unknown): { memory: WorkspaceMemory; changed: boolean } {
    const source = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};

    const contextRaw = typeof source.context === 'string' ? source.context : '';
    const context = contextRaw.trim();

    const conventions = this.sanitizeStringList(source.conventions);
    const decisions = this.sanitizeStringList(source.decisions);

    const lastUpdatedRaw = typeof source.lastUpdated === 'string' ? source.lastUpdated.trim() : '';
    const lastUpdated =
      lastUpdatedRaw && this.isValidIsoTimestamp(lastUpdatedRaw) ? lastUpdatedRaw : '';

    const memory: WorkspaceMemory = {
      context,
      conventions,
      decisions,
      lastUpdated,
    };

    const changed =
      context !== contextRaw ||
      JSON.stringify(conventions) !== JSON.stringify(source.conventions ?? []) ||
      JSON.stringify(decisions) !== JSON.stringify(source.decisions ?? []) ||
      lastUpdated !== (typeof source.lastUpdated === 'string' ? source.lastUpdated : '');

    return { memory, changed };
  }

  private async writeAtPath(
    filePath: string,
    memory: WorkspaceMemory,
    touchTimestamp: boolean
  ): Promise<void> {
    await fsp.mkdir(path.dirname(filePath), { recursive: true });
    const data: WorkspaceMemory = {
      ...memory,
      lastUpdated: touchTimestamp ? new Date().toISOString() : memory.lastUpdated,
    };
    await fsp.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  private async readFromPath(filePath: string, selfHeal: boolean): Promise<WorkspaceMemory> {
    let raw: string;
    try {
      raw = await fsp.readFile(filePath, 'utf8');
    } catch {
      return { ...DEFAULT_MEMORY };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      if (selfHeal) {
        const backupPath = path.join(
          path.dirname(filePath),
          `workspace-memory.corrupt-${Date.now()}.json`
        );
        await fsp.writeFile(backupPath, raw, 'utf8').catch(() => undefined);
        await this.writeAtPath(filePath, { ...DEFAULT_MEMORY }, true).catch(() => undefined);
      }
      return { ...DEFAULT_MEMORY };
    }

    const { memory, changed } = this.sanitizeMemory(parsed);
    if (selfHeal && changed) {
      await this.writeAtPath(filePath, memory, true).catch(() => undefined);
    }
    return memory;
  }

  /**
   * Resolve the closest workspace-memory.json from startPath upward.
   * Useful when AI is invoked at project/module scope but memory is stored at workspace root.
   */
  async resolveNearestMemoryPath(startPath: string): Promise<string | null> {
    if (!startPath) {
      return null;
    }

    let currentPath = path.resolve(startPath);
    try {
      const stat = await fsp.stat(currentPath);
      if (!stat.isDirectory()) {
        currentPath = path.dirname(currentPath);
      }
    } catch {
      return null;
    }

    let keepSearching = true;
    while (keepSearching) {
      const candidate = path.join(currentPath, '.rapidkit', 'workspace-memory.json');
      if (await this.pathExists(candidate)) {
        return candidate;
      }
      const parent = path.dirname(currentPath);
      if (parent === currentPath) {
        keepSearching = false;
      } else {
        currentPath = parent;
      }
    }

    return null;
  }

  /** Returns true when a memory file exists for the workspace. */
  async hasMemory(workspacePath: string): Promise<boolean> {
    return this.pathExists(this.memoryPath(workspacePath));
  }

  /**
   * Read the workspace memory file.
   * Returns DEFAULT_MEMORY (all empty) when the file does not exist or is unreadable.
   */
  async read(workspacePath: string): Promise<WorkspaceMemory> {
    return this.readFromPath(this.memoryPath(workspacePath), true);
  }

  /**
   * Read memory by walking up parent directories from startPath.
   * Returns DEFAULT_MEMORY when no workspace memory file is found.
   */
  async readNearest(startPath: string): Promise<WorkspaceMemory> {
    const resolvedPath = await this.resolveNearestMemoryPath(startPath);
    if (!resolvedPath) {
      return { ...DEFAULT_MEMORY };
    }
    return this.readFromPath(resolvedPath, true);
  }

  /**
   * Persist workspace memory to disk.
   * Creates .rapidkit/ directory if it doesn't already exist.
   */
  async write(workspacePath: string, memory: WorkspaceMemory): Promise<void> {
    const filePath = this.memoryPath(workspacePath);
    await this.writeAtPath(filePath, memory, true);
  }

  /**
   * Write the template memory file (called on first "Edit Memory" for a workspace
   * that has no memory yet).
   */
  async writeTemplate(workspacePath: string): Promise<void> {
    await this.write(workspacePath, TEMPLATE_MEMORY);
  }

  /**
   * Format workspace memory as a string block suitable for injection into an AI
   * system prompt.  Returns an empty string when there is nothing to inject.
   */
  formatForPrompt(memory: WorkspaceMemory): string {
    const parts: string[] = [];

    if (memory.context && memory.context.trim()) {
      parts.push(`Project overview: ${memory.context.trim()}`);
    }
    if (memory.conventions && memory.conventions.length > 0) {
      const lines = memory.conventions
        .map((c) => c.trim())
        .filter(Boolean)
        .map((c) => `  - ${c}`);
      if (lines.length > 0) {
        parts.push(`Conventions:\n${lines.join('\n')}`);
      }
    }
    if (memory.decisions && memory.decisions.length > 0) {
      const lines = memory.decisions
        .map((d) => d.trim())
        .filter(Boolean)
        .map((d) => `  - ${d}`);
      if (lines.length > 0) {
        parts.push(`Architecture decisions:\n${lines.join('\n')}`);
      }
    }

    return parts.join('\n');
  }
}
