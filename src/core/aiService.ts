/**
 * Workspai AI Service
 * Thin wrapper over VS Code Language Model API (vscode.lm).
 * Requires VS Code >= 1.90 and an active Copilot / compatible LLM subscription.
 */

import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { ModulesCatalogService } from './modulesCatalogService';
import { run } from '../utils/exec';
import {
  buildDirTree,
  getGitDiffStat,
  normalizeFrameworkHint,
  normalizeKitName,
  readRelevantFiles,
  readWorkspaceHealthSummary,
  readWorkspaceVersions,
  resolveProjectScanRoot,
  resolvePythonVersion,
} from './aiProjectContextUtils';
import {
  resetModelSelectionCache,
  selectModelWithPreference as selectModelWithPreferenceInternal,
} from './aiModelSelection';
import { buildAIModalUserMessage as buildAIModalUserMessageInternal } from './aiPromptMessageBuilder';
import { buildWorkspaiSystemPrompt as buildWorkspaiSystemPromptInternal } from './aiSystemPromptBuilder';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIStreamChunk {
  text: string;
  done: boolean;
}

export type AIConversationMode = 'debug' | 'ask';

export interface AIConversationHistoryEntry {
  role: 'user' | 'assistant';
  content: string;
}

export interface PreparedAIConversation {
  scanned?: ScannedProjectContext;
  messages: AIMessage[];
}

export interface AvailableModel {
  id: string;
  name: string;
  vendor: string;
}

/**
 * Return all language models currently registered in VS Code.
 * Safe to call repeatedly — results stream directly from the LM registry.
 */
export async function listAvailableModels(): Promise<AvailableModel[]> {
  const all = await vscode.lm.selectChatModels();
  return all.map((m) => ({
    id: m.id,
    name: m.name ?? m.id,
    vendor: m.vendor ?? '',
  }));
}

/**
 * Send messages to the LM and stream back text.
 * @param messages        – conversation history
 * @param onChunk         – called with each streamed chunk
 * @param token           – cancellation token
 * @param preferredModelId – when provided, use this exact model id instead of the workspace preference
 */
export async function streamAIResponse(
  messages: AIMessage[],
  onChunk: (chunk: AIStreamChunk) => void,
  token?: vscode.CancellationToken,
  preferredModelId?: string
): Promise<{ modelId: string }> {
  const logger = Logger.getInstance();

  let model: vscode.LanguageModelChat;
  let modelId: string;
  try {
    if (preferredModelId) {
      const all = await vscode.lm.selectChatModels();
      const found = all.find(
        (m) => m.id === preferredModelId || (m.name ?? '') === preferredModelId
      );
      if (found) {
        model = found;
        modelId = found.name ?? found.id;
        logger.info(`[AI] Using user-selected model: ${model.id}`);
      } else {
        logger.warn(
          `[AI] Requested model "${preferredModelId}" not found, falling back to preference`
        );
        ({ model, modelId } = await selectModelWithPreferenceInternal());
      }
    } else {
      ({ model, modelId } = await selectModelWithPreferenceInternal());
    }
    logger.info(`[AI] Using model: ${model.id} (${modelId})`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`[AI] Model selection failed: ${msg}`);
    throw err;
  }

  const lmMessages = messages.map((m) =>
    m.role === 'user'
      ? vscode.LanguageModelChatMessage.User(m.content)
      : vscode.LanguageModelChatMessage.Assistant(m.content)
  );

  const response = await model.sendRequest(lmMessages, {}, token);

  for await (const part of response.stream) {
    if (part instanceof vscode.LanguageModelTextPart) {
      onChunk({ text: part.value, done: false });
    }
    if (token?.isCancellationRequested) {
      break;
    }
  }

  onChunk({ text: '', done: true });
  return { modelId };
}

/**
 * Convenience wrapper that accumulates the full response and returns it.
 */
export async function askAI(
  messages: AIMessage[],
  token?: vscode.CancellationToken
): Promise<string> {
  let result = '';
  await streamAIResponse(
    messages,
    (chunk) => {
      result += chunk.text;
    },
    token
  );
  return result;
}

// ──────────────────────────────────────────────
// Workspai Architecture Context
// ──────────────────────────────────────────────

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface AIModalContext {
  type: 'workspace' | 'project' | 'module';
  name: string;
  path?: string;
  framework?: string;
  moduleSlug?: string;
  moduleDescription?: string;
  prefillQuestion?: string;
  prefillMode?: AIConversationMode;
}

interface AIWorkspaceHealthSummary {
  generatedAt: string | null;
  total: number;
  passed: number;
  warnings: number;
  errors: number;
}

// ─── Kit types detected at runtime ─────────────────────────────────────────
export type RapidKitType =
  | 'fastapi.ddd'
  | 'fastapi.standard'
  | 'nestjs.standard'
  | 'gofiber.standard'
  | 'gogin.standard'
  | 'unknown';

export interface InstalledModule {
  slug: string;
  version: string;
  display_name: string;
}

/** Scanned data from the actual project on disk. */
export interface ScannedProjectContext {
  kit: RapidKitType;
  projectName: string;
  projectRoot: string;
  installedModules: InstalledModule[];
  productionDeps: string[]; // key dependency names
  hasAlembic: boolean;
  hasDocker: boolean;
  hasHealthDir: boolean;
  hasDomainLayer: boolean; // src/app/domain exists → DDD
  hasUseCasesDir: boolean;
  topLevelSrcDirs: string[]; // e.g. ['modules', 'health', 'routing']
  configFiles: string[]; // config/*.yaml found
  envFile: string | null;
  // ── v0.18 rich context ─────────────────────────────────────────────────
  dirTree: string; // formatted src/ directory tree
  relevantFiles: Array<{ relPath: string; content: string }>; // key entry-point files
  gitDiff: string | null; // recent uncommitted changes (stat only, truncated)
  runtime: string | null;
  engine: string | null;
  pythonVersion: string | null;
  rapidkitCoreVersion: string | null;
  rapidkitCliVersion: string | null;
  workspaceHealth: AIWorkspaceHealthSummary | null;
  detectionConfidence: 'strong' | 'weak' | 'none';
}

interface ProjectContextCacheEntry {
  value: ScannedProjectContext;
  cachedAt: number;
}

const PROJECT_CONTEXT_TTL_MS = 60 * 1000;
const DEFAULT_PROJECT_DETECTION_TIMEOUT_MS = 2000;
const DEFAULT_GIT_DIFF_TIMEOUT_MS = 3000;
const DEFAULT_LIVE_MODULES_TIMEOUT_MS = 8000;
const MIN_COMMAND_TIMEOUT_MS = 1000;
const MAX_COMMAND_TIMEOUT_MS = 60000;

const _projectContextCache = new Map<string, ProjectContextCacheEntry>();

function getCommandTimeoutMs(fallback: number): number {
  const configured = vscode.workspace
    .getConfiguration('workspai')
    .get<number>('commandTimeoutMs', fallback);

  if (!Number.isFinite(configured)) {
    return fallback;
  }

  return Math.max(MIN_COMMAND_TIMEOUT_MS, Math.min(MAX_COMMAND_TIMEOUT_MS, configured));
}

/**
 * Scan a project directory and return rich context for the AI prompt.
 * Reads registry.json, pyproject.toml / package.json, and directory structure.
 * Non-throwing — returns partial context on any IO error.
 */
export async function scanProjectContext(
  projectPath: string,
  framework?: string
): Promise<ScannedProjectContext> {
  const resolvedInputPath = projectPath ? path.resolve(projectPath) : projectPath;
  const empty: ScannedProjectContext = {
    kit: 'unknown',
    projectName: path.basename(resolvedInputPath),
    projectRoot: resolvedInputPath,
    installedModules: [],
    productionDeps: [],
    hasAlembic: false,
    hasDocker: false,
    hasHealthDir: false,
    hasDomainLayer: false,
    hasUseCasesDir: false,
    topLevelSrcDirs: [],
    configFiles: [],
    envFile: null,
    dirTree: '',
    relevantFiles: [],
    gitDiff: null,
    runtime: null,
    engine: null,
    pythonVersion: null,
    rapidkitCoreVersion: null,
    rapidkitCliVersion: null,
    workspaceHealth: null,
    detectionConfidence: 'none',
  };

  if (!resolvedInputPath) {
    return empty;
  }

  const cacheKey = `${resolvedInputPath}::${framework ?? 'auto'}`;
  const cached = _projectContextCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < PROJECT_CONTEXT_TTL_MS) {
    return cached.value;
  }

  const resolved = await resolveProjectScanRoot(
    resolvedInputPath,
    getCommandTimeoutMs(DEFAULT_PROJECT_DETECTION_TIMEOUT_MS)
  );
  const scanRoot = resolved.scanRoot;
  const ctx: ScannedProjectContext = {
    ...empty,
    projectName: path.basename(scanRoot),
    projectRoot: scanRoot,
    runtime: resolved.runtime,
    engine: resolved.engine,
    detectionConfidence: resolved.detectionConfidence,
  };

  // ── helpers ────────────────────────────────────────────────────────────
  const exists = async (rel: string): Promise<boolean> => {
    try {
      await fs.promises.access(path.join(scanRoot, rel));
      return true;
    } catch {
      return false;
    }
  };
  const readJSON = async <T>(rel: string): Promise<T | null> => {
    try {
      return JSON.parse(await fs.promises.readFile(path.join(scanRoot, rel), 'utf8')) as T;
    } catch {
      return null;
    }
  };
  const readText = async (rel: string): Promise<string | null> => {
    try {
      return await fs.promises.readFile(path.join(scanRoot, rel), 'utf8');
    } catch {
      return null;
    }
  };
  const listDir = async (rel: string): Promise<string[]> => {
    try {
      return await fs.promises.readdir(path.join(scanRoot, rel));
    } catch {
      return [];
    }
  };

  const resolvedFramework = normalizeFrameworkHint(framework, resolved);

  const hasPyproject = await exists('pyproject.toml');
  const hasPackageJson = await exists('package.json');
  const hasGoMod = await exists('go.mod');

  let inferredFramework = resolvedFramework;
  if (!inferredFramework) {
    const candidates: Array<'fastapi' | 'nestjs' | 'go'> = [];
    if (hasPyproject) {
      candidates.push('fastapi');
    }
    if (hasPackageJson) {
      candidates.push('nestjs');
    }
    if (hasGoMod) {
      candidates.push('go');
    }

    if (candidates.length === 1) {
      inferredFramework = candidates[0];
    } else if (candidates.length > 1) {
      if (
        resolved.runtime === 'python' ||
        resolved.engine === 'python' ||
        resolved.engine === 'pip'
      ) {
        inferredFramework = 'fastapi';
      } else if (
        resolved.runtime === 'node' ||
        resolved.engine === 'node' ||
        resolved.engine === 'npm'
      ) {
        inferredFramework = 'nestjs';
      } else if (resolved.runtime === 'go' || resolved.engine === 'go') {
        inferredFramework = 'go';
      }
    }
  }

  if (resolved.kitName) {
    ctx.kit = normalizeKitName(resolved.kitName);
  }

  // ── registry.json (installed modules) ─────────────────────────────────
  const registry =
    (await readJSON<{ installed_modules?: InstalledModule[] }>('registry.json')) ??
    (await readJSON<{ installed_modules?: InstalledModule[] }>('.rapidkit/registry.json'));
  if (registry?.installed_modules) {
    ctx.installedModules = registry.installed_modules;
  }

  // ── project layout ─────────────────────────────────────────────────────
  ctx.hasAlembic = (await exists('alembic')) || (await exists('alembic.ini'));
  ctx.hasDocker = (await exists('Dockerfile')) || (await exists('docker-compose.yml'));
  ctx.hasHealthDir = await exists('src/health');
  ctx.hasDomainLayer = await exists('src/app/domain');
  ctx.hasUseCasesDir = await exists('src/app/application/use_cases');
  ctx.topLevelSrcDirs = (await listDir('src')).filter(
    (n) => !n.startsWith('_') && !n.endsWith('.py') && !n.endsWith('.ts')
  );

  // config/*.yaml files
  try {
    ctx.configFiles = (await fs.promises.readdir(path.join(scanRoot, 'config'))).filter(
      (f) => f.endsWith('.yaml') || f.endsWith('.yml')
    );
  } catch {
    /* no config dir */
  }

  ctx.envFile = (await exists('.env'))
    ? '.env'
    : (await exists('.env.local'))
      ? '.env.local'
      : null;

  // ── kit detection ───────────────────────────────────────────────────────
  if (inferredFramework === 'fastapi') {
    if (ctx.kit === 'unknown') {
      ctx.kit = ctx.hasDomainLayer ? 'fastapi.ddd' : 'fastapi.standard';
    }
    // extract pydantic, sqlalchemy, other prod deps from pyproject.toml
    const pyproj = (await readText('pyproject.toml')) ?? '';
    const depSection = pyproj.split('[tool.poetry.dependencies]')[1]?.split('[')[0] ?? '';
    const deps: string[] = [];
    for (const line of depSection.split('\n')) {
      const m = line.match(/^([a-zA-Z0-9_-]+)\s*=/);
      if (m && m[1] !== 'python') {
        deps.push(m[1].toLowerCase());
      }
    }
    ctx.productionDeps = deps;
  } else if (inferredFramework === 'nestjs') {
    if (ctx.kit === 'unknown') {
      ctx.kit = 'nestjs.standard';
    }
    const pkg = await readJSON<{ dependencies?: Record<string, string> }>('package.json');
    ctx.productionDeps = Object.keys(pkg?.dependencies ?? {});
  } else if (inferredFramework === 'go') {
    const gomod = (await readText('go.mod')) ?? '';
    if (ctx.kit === 'unknown') {
      ctx.kit = gomod.toLowerCase().includes('gofiber') ? 'gofiber.standard' : 'gogin.standard';
    }
  }

  // ── v0.18: rich context ──────────────────────────────────────────────────
  ctx.pythonVersion = await resolvePythonVersion(scanRoot, inferredFramework, resolved.runtime);
  ctx.workspaceHealth = await readWorkspaceHealthSummary(scanRoot);
  const versions = await readWorkspaceVersions(scanRoot);
  ctx.rapidkitCoreVersion = versions.core;
  ctx.rapidkitCliVersion = versions.npm;
  ctx.dirTree = await buildDirTree(scanRoot, ctx.topLevelSrcDirs);
  ctx.relevantFiles = await readRelevantFiles(scanRoot, ctx.kit);
  ctx.gitDiff = await getGitDiffStat(scanRoot, getCommandTimeoutMs(DEFAULT_GIT_DIFF_TIMEOUT_MS));

  _projectContextCache.set(cacheKey, {
    value: ctx,
    cachedAt: Date.now(),
  });

  return ctx;
}

async function getWorkspaceAwareLiveModules(
  workspacePath?: string
): Promise<LiveModuleEntry[] | null> {
  try {
    const result = await ModulesCatalogService.getInstance().getModulesCatalog(workspacePath);
    if (result.modules.length > 0) {
      return result.modules.map((module) => ({
        name: module.id,
        display_name: module.name,
        version: module.version,
        category: module.category,
        description: module.description,
        slug: module.slug,
        tags: Array.isArray(module.tags) ? module.tags : [],
      }));
    }
  } catch {
    // The catalog service may not be initialized yet; fall back to direct CLI probing.
  }

  return await fetchLiveModules();
}

// ─── Live module registry (fetched from installed rapidkit engine) ──────────

interface LiveModuleEntry {
  name: string;
  display_name: string;
  version: string;
  category: string;
  description: string;
  slug: string;
  tags: string[];
}

interface LiveModulesCache {
  modules: LiveModuleEntry[];
  fetchedAt: number;
}

/** In-memory TTL cache — avoid repeated shell calls during one session. */
let _liveModulesCache: LiveModulesCache | null = null;
const LIVE_MODULES_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Try to fetch the live module list from the installed rapidkit engine.
 * Returns `null` when the engine is not installed or the command fails.
 * Results are cached for `LIVE_MODULES_TTL_MS` to avoid overhead.
 */
export async function fetchLiveModules(): Promise<LiveModuleEntry[] | null> {
  const now = Date.now();
  if (_liveModulesCache && now - _liveModulesCache.fetchedAt < LIVE_MODULES_TTL_MS) {
    return _liveModulesCache.modules;
  }
  try {
    const res = await run(
      'npx',
      ['--yes', '--package', 'rapidkit', 'rapidkit', 'modules', 'list', '--json-schema', '1'],
      {
        timeout: getCommandTimeoutMs(DEFAULT_LIVE_MODULES_TIMEOUT_MS),
      }
    );
    if (res.exitCode !== 0) {
      return null;
    }

    const raw = res.stdout ?? '';
    // The CLI prints a preamble line ("🚀 RapidKit") before the JSON — strip it
    const jsonStart = raw.indexOf('{');
    const jsonEnd = raw.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd <= jsonStart) {
      return null;
    }
    let parsed: { modules?: LiveModuleEntry[] };
    try {
      parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as { modules?: LiveModuleEntry[] };
    } catch {
      return null;
    }
    const modules = parsed.modules ?? [];
    _liveModulesCache = { modules, fetchedAt: now };
    return modules;
  } catch {
    return null;
  }
}

/** Invalidate the cache (e.g. after `rapidkit add` installs a new module). */
export function invalidateLiveModulesCache(): void {
  _liveModulesCache = null;
}

export function resetAIServiceCaches(): void {
  _projectContextCache.clear();
  resetModelSelectionCache();
  _liveModulesCache = null;
}

/**
 * Build the modules section string for the SYSTEM prompt.
 * Uses live data when available, falls back to the static list.
 */
function buildModuleListForPrompt(liveModules: LiveModuleEntry[] | null): string {
  if (liveModules && liveModules.length > 0) {
    // Group by category for readability
    const byCategory: Record<string, LiveModuleEntry[]> = {};
    for (const m of liveModules) {
      (byCategory[m.category] ??= []).push(m);
    }
    const lines = Object.entries(byCategory).map(([cat, mods]) => {
      const slugs = mods
        .map((m) => {
          const status = m.version ? ` v${m.version}` : '';
          const tags =
            Array.isArray(m.tags) && m.tags.length > 0 ? ` [${m.tags.slice(0, 3).join(', ')}]` : '';
          return `${m.slug}${status}${tags}`;
        })
        .join('  ');
      return `  ${cat.charAt(0).toUpperCase() + cat.slice(1).padEnd(16)}: ${slugs}`;
    });
    return `Available modules from your installed engine (use EXACT slugs, max 6, ALWAYS include free/essentials/settings):\n${lines.join('\n')}`;
  }
  // Static fallback
  return (
    `Available modules (use EXACT slugs, max 6, ALWAYS include free/essentials/settings):\n` +
    `  Essentials:   free/essentials/settings  free/essentials/logging  free/essentials/middleware  free/essentials/deployment\n` +
    `  Auth:         free/auth/core  free/auth/oauth  free/auth/session  free/auth/passwordless  free/auth/api_keys\n` +
    `  Database:     free/database/db_postgres  free/database/db_mongo  free/database/db_sqlite\n` +
    `  Cache:        free/cache/redis\n` +
    `  Security:     free/security/cors  free/security/security_headers  free/security/rate_limiting\n` +
    `  Observability: free/observability/core\n` +
    `  Users:        free/users/users_core  free/users/users_profiles\n` +
    `  Business:     free/business/storage\n` +
    `  Billing:      free/billing/stripe_payment  free/billing/cart  free/billing/inventory\n` +
    `  Communication: free/communication/notifications  free/communication/email\n` +
    `  Tasks:        free/tasks/celery\n` +
    `  AI:           free/ai/ai_assistant`
  );
}

async function collectWorkspaceInstalledModules(
  workspacePath?: string
): Promise<Array<{ slug: string; projects: string[] }>> {
  if (!workspacePath) {
    return [];
  }

  const root = path.resolve(workspacePath);
  const moduleProjects = new Map<string, Set<string>>();

  const projectCandidates = new Set<string>([root]);
  try {
    const topLevel = await fs.promises.readdir(root, { withFileTypes: true });
    for (const entry of topLevel) {
      if (entry.isDirectory()) {
        projectCandidates.add(path.join(root, entry.name));
      }
    }
  } catch {
    return [];
  }

  for (const candidate of projectCandidates) {
    const projectName = path.basename(candidate);
    const registryPaths = [
      path.join(candidate, 'registry.json'),
      path.join(candidate, '.rapidkit', 'registry.json'),
    ];
    for (const registryPath of registryPaths) {
      try {
        const parsed = JSON.parse(await fs.promises.readFile(registryPath, 'utf8')) as {
          installed_modules?: Array<{ slug?: string }>;
        };
        for (const mod of parsed.installed_modules ?? []) {
          const slug = typeof mod.slug === 'string' ? mod.slug.trim().toLowerCase() : '';
          if (!slug) {
            continue;
          }
          if (!moduleProjects.has(slug)) {
            moduleProjects.set(slug, new Set<string>());
          }
          moduleProjects.get(slug)!.add(projectName);
        }
      } catch {
        // Not every directory is a project; ignore missing/invalid registry files.
      }
    }
  }

  return [...moduleProjects.entries()]
    .map(([slug, projects]) => ({ slug, projects: [...projects].sort() }))
    .sort((a, b) => b.projects.length - a.projects.length || a.slug.localeCompare(b.slug));
}

function buildWorkspaceInstalledModulesSection(
  installedElsewhere: Array<{ slug: string; projects: string[] }>
): string {
  if (installedElsewhere.length === 0) {
    return 'No installed-module signals from sibling projects were detected in this workspace.';
  }
  const lines = installedElsewhere.slice(0, 20).map((entry) => {
    const scope = entry.projects.slice(0, 4).join(', ');
    return `  - ${entry.slug} (seen in ${entry.projects.length} project(s): ${scope})`;
  });
  return `Installed modules already present in this workspace (prefer reuse when relevant):\n${lines.join('\n')}`;
}

/**
 * Backward-compatible export that delegates to the extracted system prompt builder.
 */
export async function buildWorkspaiSystemPrompt(
  ctx: AIModalContext,
  scanned?: ScannedProjectContext
): Promise<string> {
  return buildWorkspaiSystemPromptInternal(ctx, scanned);
}

// ─── buildAIModalUserMessage ────────────────────────────────────────────────

/**
 * Backward-compatible export that delegates to the extracted prompt message builder.
 */
export function buildAIModalUserMessage(
  mode: AIConversationMode,
  question: string,
  ctx: AIModalContext,
  scanned?: ScannedProjectContext
): string {
  return buildAIModalUserMessageInternal(mode, question, ctx, scanned);
}

export async function prepareAIConversation(
  mode: AIConversationMode,
  question: string,
  ctx: AIModalContext,
  history: AIConversationHistoryEntry[] = []
): Promise<PreparedAIConversation> {
  const scanned = ctx.path
    ? await scanProjectContext(ctx.path, ctx.framework).catch(() => undefined)
    : undefined;

  const historyMessages: AIMessage[] = history.slice(-8).map((entry) => ({
    role: entry.role,
    content: entry.content,
  }));

  return {
    scanned,
    messages: [
      {
        role: 'user',
        content: await buildWorkspaiSystemPrompt(ctx, scanned),
      },
      {
        role: 'assistant',
        content: 'Understood. I will follow Workspai standards and real project context.',
      },
      ...historyMessages,
      {
        role: 'user',
        content: buildAIModalUserMessageInternal(mode, question, ctx, scanned),
      },
    ],
  };
}

// ─── selectModel: respects workspai.preferredModel VS Code setting ──────────

/**
 * Backward-compatible export that delegates to the extracted model selector.
 */
export async function selectModelWithPreference(): Promise<{
  model: vscode.LanguageModelChat;
  modelId: string;
}> {
  return selectModelWithPreferenceInternal();
}

// ─── AI-powered Workspace / Project Creation ────────────────────────────────

export type AICreateProfile =
  | 'minimal'
  | 'python-only'
  | 'node-only'
  | 'go-only'
  | 'polyglot'
  | 'enterprise';
export type AICreateFramework = 'fastapi' | 'nestjs' | 'go';

export interface AICreationPlan {
  type: 'workspace' | 'project';
  workspaceName: string;
  profile: AICreateProfile;
  installMethod: 'auto' | 'poetry' | 'venv' | 'pipx';
  framework: AICreateFramework;
  kit: string;
  projectName: string;
  suggestedModules: string[];
  description: string;
}

const VALID_PROFILES = new Set<AICreateProfile>([
  'minimal',
  'python-only',
  'node-only',
  'go-only',
  'polyglot',
  'enterprise',
]);

const VALID_INSTALL_METHODS = new Set<AICreationPlan['installMethod']>([
  'auto',
  'poetry',
  'venv',
  'pipx',
]);

const FRAMEWORK_TO_KITS: Record<AICreateFramework, string[]> = {
  fastapi: ['fastapi.standard', 'fastapi.ddd'],
  nestjs: ['nestjs.standard'],
  go: ['gofiber.standard', 'gogin.standard'],
};

const STATIC_MODULE_SLUGS = new Set<string>([
  'free/essentials/settings',
  'free/essentials/logging',
  'free/essentials/middleware',
  'free/essentials/deployment',
  'free/auth/core',
  'free/auth/oauth',
  'free/auth/session',
  'free/auth/passwordless',
  'free/auth/api_keys',
  'free/database/db_postgres',
  'free/database/db_mongo',
  'free/database/db_sqlite',
  'free/cache/redis',
  'free/security/cors',
  'free/security/security_headers',
  'free/security/rate_limiting',
  'free/observability/core',
  'free/users/users_core',
  'free/users/users_profiles',
  'free/business/storage',
  'free/billing/stripe_payment',
  'free/billing/cart',
  'free/billing/inventory',
  'free/communication/notifications',
  'free/communication/email',
  'free/tasks/celery',
  'free/ai/ai_assistant',
]);

/**
 * Extract the first JSON object from a potentially markdown-wrapped LLM response.
 */
function extractJSON(text: string): string {
  // Strip ```json ... ``` or ``` ... ``` code fences
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    return fenced[1].trim();
  }
  // Bare JSON object
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    return text.slice(start, end + 1);
  }
  return text.trim();
}

/**
 * Map a framework string to the default profile.
 */
function defaultProfile(fw: string): AICreateProfile {
  if (fw === 'nestjs') {
    return 'node-only';
  }
  if (fw === 'go') {
    return 'go-only';
  }
  return 'python-only';
}

function isCreateFramework(value: unknown): value is AICreateFramework {
  return value === 'fastapi' || value === 'nestjs' || value === 'go';
}

function normalizeCreationFramework(value: unknown, frameworkHint?: string): AICreateFramework {
  if (isCreateFramework(value)) {
    return value;
  }
  if (isCreateFramework(frameworkHint)) {
    return frameworkHint;
  }
  return 'fastapi';
}

function defaultKitForFramework(framework: AICreateFramework): string {
  if (framework === 'nestjs') {
    return 'nestjs.standard';
  }
  if (framework === 'go') {
    return 'gofiber.standard';
  }
  return 'fastapi.standard';
}

function normalizeCreationKit(kit: unknown, framework: AICreateFramework): string {
  if (typeof kit === 'string' && FRAMEWORK_TO_KITS[framework].includes(kit)) {
    return kit;
  }
  return defaultKitForFramework(framework);
}

function normalizeCreationProfile(profile: unknown, framework: AICreateFramework): AICreateProfile {
  if (typeof profile === 'string' && VALID_PROFILES.has(profile as AICreateProfile)) {
    return profile as AICreateProfile;
  }
  return defaultProfile(framework);
}

function normalizeInstallMethod(value: unknown): AICreationPlan['installMethod'] {
  if (
    typeof value === 'string' &&
    VALID_INSTALL_METHODS.has(value as AICreationPlan['installMethod'])
  ) {
    return value as AICreationPlan['installMethod'];
  }
  return 'auto';
}

function normalizeSuggestedModules(
  modules: unknown,
  liveModules: LiveModuleEntry[] | null,
  framework?: AICreateFramework
): string[] {
  // Go kits do not support the RapidKit module marketplace.
  if (framework === 'go') {
    return [];
  }

  const allowedSet = liveModules?.length
    ? new Set(liveModules.map((m) => m.slug))
    : STATIC_MODULE_SLUGS;
  const allowedList = [...allowedSet];

  const normalized = Array.isArray(modules)
    ? modules
        .filter((m): m is string => typeof m === 'string')
        .map((m) => m.trim().toLowerCase())
        .filter((m) => /^(?:[a-z0-9-]+)\/[a-z0-9_-]+\/[a-z0-9_-]+$/.test(m))
        .map((m) => {
          if (allowedSet.has(m)) {
            return m;
          }
          return findClosestModuleSlug(m, allowedList);
        })
        .filter((m): m is string => Boolean(m))
    : [];

  const unique = [...new Set(normalized)].slice(0, 6);
  if (!unique.includes('free/essentials/settings')) {
    unique.unshift('free/essentials/settings');
  }
  return unique.slice(0, 6);
}

function findClosestModuleSlug(input: string, allowed: string[]): string | null {
  if (allowed.length === 0) {
    return null;
  }

  let bestSlug: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of allowed) {
    const distance = levenshteinDistance(input, candidate);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestSlug = candidate;
    }
  }

  // Keep correction conservative: only near-miss typos are auto-corrected.
  return bestDistance <= 4 ? bestSlug : null;
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  if (!a.length) {
    return b.length;
  }
  if (!b.length) {
    return a.length;
  }

  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);

  for (let j = 0; j <= b.length; j++) {
    prev[j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) {
      prev[j] = curr[j];
    }
  }

  return prev[b.length];
}

/**
 * Parse the user's natural-language description into a structured creation plan.
 * Uses the LLM API (non-streaming) with a strict JSON system prompt.
 */
export async function parseCreationIntent(
  prompt: string,
  mode: 'workspace' | 'project',
  frameworkHint?: string,
  workspacePath?: string,
  token?: vscode.CancellationToken
): Promise<{ plan: AICreationPlan; modelId: string }> {
  const liveModules = await getWorkspaceAwareLiveModules(workspacePath);
  const modulesSection = buildModuleListForPrompt(liveModules);
  const installedElsewhere = await collectWorkspaceInstalledModules(workspacePath);
  const installedElsewhereSection = buildWorkspaceInstalledModulesSection(installedElsewhere);

  const SYSTEM = `You are a Workspai project scaffolding assistant. Parse the user description and respond with ONLY a valid JSON object — no markdown, no explanation.

Available workspace profiles:
  "minimal"      — files only, no runtime
  "python-only"  — Python backend (FastAPI)
  "node-only"    — Node.js backend (NestJS)
  "go-only"      — Go backend
  "polyglot"     — mixed Python + Node + Go
  "enterprise"   — multi-team governance

Available frameworks: "fastapi" | "nestjs" | "go"

Available kits (use EXACT names):
  "fastapi.standard"  — FastAPI flat structure (default for Python)
  "fastapi.ddd"       — FastAPI clean-architecture DDD (use for complex/layered/domain-driven)
  "nestjs.standard"   — NestJS feature module (default for Node)
  "gofiber.standard"  — Go + Fiber v2 HTTP (fast, minimal)
  "gogin.standard"    — Go + Gin HTTP (classic REST)

${modulesSection}

${installedElsewhereSection}

IMPORTANT — slugs shown above are the ONLY valid values. Do NOT invent slugs. If unsure, omit.
LEGACY REMOVED — old slugs like free/users/users, free/observability/observability_core are invalid; use the exact slugs listed above.

Required JSON schema (return EXACTLY this):
{
  "workspaceName": "<kebab-case, 2-30 chars, reflects the product>",
  "profile": "<one of the profiles above>",
  "installMethod": "auto",
  "framework": "<fastapi|nestjs|go>",
  "kit": "<kit name>",
  "projectName": "<kebab-case service name, e.g. product-api>",
  "suggestedModules": ["<slug>", ...],
  "description": "<one sentence describing what this project does>"
}

Rules:
- ALWAYS include "free/essentials/settings" in suggestedModules
- Use fastapi.ddd kit when: DDD / clean-arch / domain / layered / complex mentioned
- Use enterprise profile when: enterprise / governance / multi-team / compliance mentioned
- Profile follows framework unless polyglot / enterprise
- Include db module when: database / postgres / mongo / store / persist mentioned
- Include auth module when: auth / user / login / jwt / oauth / session mentioned
- Include redis when: cache / redis / session / rate-limit mentioned
- workspaceName reflects the product domain (e.g. "invoice-tracker", "ecommerce-platform")
- projectName is the first microservice name (e.g. "product-api", "auth-service")`;

  const USER = frameworkHint
    ? `Framework: ${frameworkHint}\nMode: ${mode}\nDescription: ${prompt}`
    : `Mode: ${mode}\nDescription: ${prompt}`;

  // Call the LLM
  const { model, modelId } = await selectModelWithPreferenceInternal();
  const lmMessages = [
    vscode.LanguageModelChatMessage.User(SYSTEM),
    vscode.LanguageModelChatMessage.Assistant('I will respond with only the JSON object.'),
    vscode.LanguageModelChatMessage.User(USER),
  ];

  const response = await model.sendRequest(lmMessages, {}, token);
  let rawText = '';
  for await (const part of response.stream) {
    if (part instanceof vscode.LanguageModelTextPart) {
      rawText += part.value;
    }
    if (token?.isCancellationRequested) {
      break;
    }
  }

  // Parse JSON with graceful fallback
  let parsed: Partial<AICreationPlan> = {};
  try {
    parsed = JSON.parse(extractJSON(rawText));
  } catch {
    // Build a reasonable default from whatever we can extract
    const fw = (frameworkHint as AICreateFramework) ?? 'fastapi';
    parsed = {
      workspaceName: 'my-workspace',
      profile: defaultProfile(fw),
      framework: fw,
      kit:
        fw === 'nestjs' ? 'nestjs.standard' : fw === 'go' ? 'gofiber.standard' : 'fastapi.standard',
      projectName: 'api',
      suggestedModules: ['free/essentials/settings'],
      description: prompt,
    };
  }

  const fw = normalizeCreationFramework(parsed.framework, frameworkHint);
  const rawName = addWspSuffix(sanitizeKebab(parsed.workspaceName ?? 'my-workspace'));
  const uniqueName = await resolveUniqueWorkspaceName(rawName);
  const plan: AICreationPlan = {
    type: mode,
    workspaceName: uniqueName,
    profile: normalizeCreationProfile(parsed.profile, fw),
    installMethod: normalizeInstallMethod(parsed.installMethod),
    framework: fw,
    kit: normalizeCreationKit(parsed.kit, fw),
    projectName: sanitizeKebab(parsed.projectName ?? 'api'),
    suggestedModules: normalizeSuggestedModules(parsed.suggestedModules, liveModules, fw),
    description:
      typeof parsed.description === 'string' && parsed.description.trim()
        ? parsed.description.trim().slice(0, 240)
        : prompt.trim().slice(0, 240),
  };

  return { plan, modelId };
}

/**
 * Resolve a unique workspace name by checking if the default installation
 * directory (~Workspai/rapidkits/<name>) already exists on disk.
 * If it does, append -2, -3, ... until a free slot is found.
 */
async function resolveUniqueWorkspaceName(name: string): Promise<string> {
  const base = path.join(os.homedir(), 'Workspai', 'rapidkits');
  let candidate = name;
  let counter = 2;
  // Safety cap: stop after 99 attempts to avoid infinite loop.
  while (counter <= 99) {
    try {
      await fs.promises.access(path.join(base, candidate));
      // Directory exists — try next suffix.
      // Strip any previous numeric suffix (-2, -3 …) before appending new one.
      const baseName = name.replace(/-\d+(-wsp)?$/, '').replace(/-wsp$/, '');
      candidate = `${baseName}-${counter}-wsp`;
      counter++;
    } catch {
      // access() threw → path does not exist → candidate is free.
      break;
    }
  }
  return candidate;
}

/** Ensure workspace name always ends with -wsp (convention across all RapidKit workspaces). */
function addWspSuffix(name: string): string {
  return name.endsWith('-wsp') ? name : `${name}-wsp`;
}

/** Ensure a string is safe kebab-case. */
function sanitizeKebab(s: string): string {
  return (
    s
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'my-project'
  );
}
