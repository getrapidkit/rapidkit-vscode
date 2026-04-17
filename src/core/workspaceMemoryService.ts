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

  /** Returns true when a memory file exists for the workspace. */
  async hasMemory(workspacePath: string): Promise<boolean> {
    try {
      await fsp.access(this.memoryPath(workspacePath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read the workspace memory file.
   * Returns DEFAULT_MEMORY (all empty) when the file does not exist or is unreadable.
   */
  async read(workspacePath: string): Promise<WorkspaceMemory> {
    try {
      const raw = await fsp.readFile(this.memoryPath(workspacePath), 'utf8');
      const parsed = JSON.parse(raw) as Partial<WorkspaceMemory>;
      return { ...DEFAULT_MEMORY, ...parsed };
    } catch {
      return { ...DEFAULT_MEMORY };
    }
  }

  /**
   * Persist workspace memory to disk.
   * Creates .rapidkit/ directory if it doesn't already exist.
   */
  async write(workspacePath: string, memory: WorkspaceMemory): Promise<void> {
    const filePath = this.memoryPath(workspacePath);
    await fsp.mkdir(path.dirname(filePath), { recursive: true });
    const data: WorkspaceMemory = { ...memory, lastUpdated: new Date().toISOString() };
    await fsp.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
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
