/**
 * Workspai AI Service
 * Thin wrapper over VS Code Language Model API (vscode.lm).
 * Requires VS Code >= 1.90 and an active Copilot / compatible LLM subscription.
 */

import * as vscode from 'vscode';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { Logger } from '../utils/logger';
import { ModulesCatalogService } from './modulesCatalogService';
import { WorkspaceMemoryService } from './workspaceMemoryService';
import { detectRapidkitProject } from './bridge/pythonRapidkit';
import { run } from '../utils/exec';

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
        ({ model, modelId } = await selectModelWithPreference());
      }
    } else {
      ({ model, modelId } = await selectModelWithPreference());
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

const execFileAsync = promisify(execFile);

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

interface AIWorkspaceVersions {
  core: string | null;
  npm: string | null;
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

interface ProjectScanResolution {
  scanRoot: string;
  runtime: string | null;
  engine: string | null;
  detectionConfidence: 'strong' | 'weak' | 'none';
  kitName: string | null;
}

interface ProjectContextCacheEntry {
  value: ScannedProjectContext;
  cachedAt: number;
}

interface ModelSelectionCacheEntry {
  preference: string;
  result: {
    model: vscode.LanguageModelChat;
    modelId: string;
  };
  cachedAt: number;
}

const PROJECT_CONTEXT_TTL_MS = 60 * 1000;
const MODEL_SELECTION_TTL_MS = 5 * 60 * 1000;
const MAX_SYSTEM_PROMPT_CHARS = 28_000;

const _projectContextCache = new Map<string, ProjectContextCacheEntry>();
let _modelSelectionCache: ModelSelectionCacheEntry | null = null;

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

  const resolved = await resolveProjectScanRoot(resolvedInputPath);
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
  ctx.pythonVersion = await _resolvePythonVersion(scanRoot, inferredFramework, resolved.runtime);
  ctx.workspaceHealth = await _readWorkspaceHealthSummary(scanRoot);
  const versions = await _readWorkspaceVersions(scanRoot);
  ctx.rapidkitCoreVersion = versions.core;
  ctx.rapidkitCliVersion = versions.npm;
  ctx.dirTree = await _buildDirTree(scanRoot, ctx.topLevelSrcDirs);
  ctx.relevantFiles = await _readRelevantFiles(scanRoot, ctx.kit);
  ctx.gitDiff = await _getGitDiffStat(scanRoot);

  _projectContextCache.set(cacheKey, {
    value: ctx,
    cachedAt: Date.now(),
  });

  return ctx;
}

async function resolveProjectScanRoot(projectPath: string): Promise<ProjectScanResolution> {
  let scanRoot = projectPath;
  let runtime: string | null = null;
  let engine: string | null = null;
  let detectionConfidence: 'strong' | 'weak' | 'none' = 'none';
  let kitName: string | null = null;

  try {
    const detected = await detectRapidkitProject(projectPath, {
      cwd: path.dirname(projectPath),
      timeoutMs: 2000,
    });
    if (detected.ok && detected.data) {
      detectionConfidence = detected.data.confidence;
      engine = typeof detected.data.engine === 'string' ? detected.data.engine : null;
      if (detected.data.projectRoot) {
        scanRoot = path.resolve(detected.data.projectRoot);
      }
    }
  } catch {
    // Ignore contract bridge failures and fall back to direct file inspection.
  }

  const projectJson = await safeReadJson<Record<string, unknown>>(
    path.join(scanRoot, '.rapidkit', 'project.json')
  );
  const contextJson = await safeReadJson<Record<string, unknown>>(
    path.join(scanRoot, '.rapidkit', 'context.json')
  );

  if (typeof projectJson?.kit_name === 'string') {
    kitName = projectJson.kit_name;
  }
  if (typeof projectJson?.runtime === 'string') {
    runtime = projectJson.runtime;
  }
  if (typeof contextJson?.engine === 'string' && !engine) {
    engine = contextJson.engine;
  }

  return {
    scanRoot,
    runtime,
    engine,
    detectionConfidence,
    kitName,
  };
}

async function safeReadJson<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.promises.readFile(filePath, 'utf8')) as T;
  } catch {
    return null;
  }
}

async function _resolvePythonVersion(
  scanRoot: string,
  inferredFramework: string | undefined,
  runtime: string | null
): Promise<string | null> {
  const isPythonProject = inferredFramework === 'fastapi' || runtime === 'python';
  if (!isPythonProject) {
    return null;
  }

  // 1) Most explicit source for Python projects managed with pyenv.
  const dotPythonVersion = await safeReadText(path.join(scanRoot, '.python-version'));
  if (dotPythonVersion) {
    const fromDotFile = dotPythonVersion.trim();
    if (fromDotFile) {
      return fromDotFile;
    }
  }

  // 2) Fallback to pyproject constraints when available.
  const pyproject = await safeReadText(path.join(scanRoot, 'pyproject.toml'));
  if (pyproject) {
    const fromPoetry = _extractPythonConstraintFromPyproject(pyproject);
    if (fromPoetry) {
      return fromPoetry;
    }
  }

  return null;
}

function _extractPythonConstraintFromPyproject(pyproject: string): string | null {
  const depSection = pyproject.split('[tool.poetry.dependencies]')[1]?.split('[')[0] ?? '';
  const pythonInDependencies = depSection.match(/^python\s*=\s*["']([^"']+)["']/m);
  if (pythonInDependencies?.[1]) {
    return pythonInDependencies[1].trim();
  }

  const requiresPython = pyproject.match(/^requires-python\s*=\s*["']([^"']+)["']/m);
  if (requiresPython?.[1]) {
    return requiresPython[1].trim();
  }

  return null;
}

async function _readWorkspaceHealthSummary(
  scanRoot: string
): Promise<AIWorkspaceHealthSummary | null> {
  const evidence = await _readDoctorEvidence(scanRoot);
  const score = evidence?.healthScore;
  if (!score) {
    return null;
  }

  const total = Number(score.total ?? 0);
  const passed = Number(score.passed ?? 0);
  const warnings = Number(score.warnings ?? 0);
  const errors = Number(score.errors ?? 0);

  return {
    generatedAt: typeof evidence?.generatedAt === 'string' ? evidence.generatedAt : null,
    total,
    passed,
    warnings,
    errors,
  };
}

async function _readWorkspaceVersions(scanRoot: string): Promise<AIWorkspaceVersions> {
  const evidence = await _readDoctorEvidence(scanRoot);
  const versions = evidence?.system?.versions;
  return {
    core: typeof versions?.core === 'string' ? versions.core : null,
    npm: typeof versions?.npm === 'string' ? versions.npm : null,
  };
}

async function _readDoctorEvidence(scanRoot: string): Promise<{
  generatedAt?: string;
  healthScore?: {
    total?: number;
    passed?: number;
    warnings?: number;
    errors?: number;
  };
  system?: {
    versions?: {
      core?: string;
      npm?: string;
    };
  };
} | null> {
  return await safeReadJson(path.join(scanRoot, '.rapidkit', 'reports', 'doctor-last-run.json'));
}

async function safeReadText(filePath: string): Promise<string | null> {
  try {
    return await fs.promises.readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

function normalizeKitName(value: string | null | undefined): RapidKitType {
  switch (value) {
    case 'fastapi.ddd':
      return 'fastapi.ddd';
    case 'fastapi.standard':
      return 'fastapi.standard';
    case 'nestjs.standard':
      return 'nestjs.standard';
    case 'gofiber.standard':
      return 'gofiber.standard';
    case 'gogin.standard':
      return 'gogin.standard';
    default:
      return 'unknown';
  }
}

function normalizeFrameworkHint(
  framework: string | undefined,
  resolved: ProjectScanResolution
): string | undefined {
  if (framework) {
    return framework;
  }
  const normalizedKit = normalizeKitName(resolved.kitName);
  if (normalizedKit.startsWith('fastapi')) {
    return 'fastapi';
  }
  if (normalizedKit.startsWith('nestjs')) {
    return 'nestjs';
  }
  if (normalizedKit.startsWith('go')) {
    return 'go';
  }
  if (resolved.runtime === 'node' || resolved.engine === 'node' || resolved.engine === 'npm') {
    return 'nestjs';
  }
  if (resolved.runtime === 'go' || resolved.engine === 'go') {
    return 'go';
  }
  if (resolved.runtime === 'python' || resolved.engine === 'python' || resolved.engine === 'pip') {
    return 'fastapi';
  }
  return undefined;
}

function resolveFrameworkFamily(ctx: AIModalContext, scanned?: ScannedProjectContext): string {
  const fw = scanned?.kit ?? ctx.framework ?? '';
  if (fw.startsWith('fastapi') || fw === 'fastapi') {
    return 'fastapi';
  }
  if (fw.startsWith('nestjs') || fw === 'nestjs') {
    return 'nestjs';
  }
  if (fw.startsWith('go') || fw.startsWith('gofiber') || fw.startsWith('gogin') || fw === 'go') {
    return 'go';
  }
  return fw;
}

/**
 * Build a first-level directory tree under src/ for prompt context.
 * Limits depth to avoid token bloat.
 */
async function _buildDirTree(projectPath: string, topDirs: string[]): Promise<string> {
  if (topDirs.length === 0) {
    return '';
  }
  const lines: string[] = ['src/'];
  for (const dir of topDirs.slice(0, 8)) {
    lines.push(`  ${dir}/`);
    try {
      const children = (await fs.promises.readdir(path.join(projectPath, 'src', dir)))
        .filter((n) => !n.startsWith('_') && !n.startsWith('.'))
        .slice(0, 6);
      for (const child of children) {
        lines.push(`    ${child}`);
      }
    } catch {
      /* skip unreadable dirs */
    }
  }
  return lines.join('\n');
}

/**
 * Read key entry-point files for the detected kit.
 * Limits each file to 1 500 chars to stay within token budgets.
 */
async function _readRelevantFiles(
  projectPath: string,
  kit: string
): Promise<Array<{ relPath: string; content: string }>> {
  const candidates: string[] = [];

  if (kit === 'fastapi.ddd') {
    candidates.push(
      'src/main.py',
      'src/routing/__init__.py',
      'src/app/application/interfaces.py',
      'src/app/presentation/api/dependencies/__init__.py',
      'src/app/domain/models/__init__.py'
    );
  } else if (kit.startsWith('fastapi')) {
    candidates.push(
      'src/main.py',
      'src/routing/__init__.py',
      'src/modules/free/essentials/settings/settings.py'
    );
  } else if (kit.startsWith('nestjs')) {
    candidates.push(
      'src/main.ts',
      'src/app.module.ts',
      'src/modules/index.ts',
      'src/config/configuration.ts'
    );
  } else if (kit.startsWith('gofiber') || kit.startsWith('gogin')) {
    candidates.push(
      'cmd/server/main.go',
      'internal/config/config.go',
      'internal/server/server.go',
      'internal/handlers/health.go'
    );
  }

  const result: Array<{ relPath: string; content: string }> = [];
  for (const relPath of candidates) {
    try {
      const raw = await fs.promises.readFile(path.join(projectPath, relPath), 'utf8');
      if (raw) {
        result.push({ relPath, content: raw.slice(0, 1800) });
      }
    } catch {
      /* file missing — skip silently */
    }
  }
  return result;
}

/**
 * Run `git diff --stat HEAD` in the project directory.
 * Returns a short status string even when git is unavailable.
 */
async function _getGitDiffStat(projectPath: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('git', ['diff', '--stat', 'HEAD'], {
      cwd: projectPath,
      timeout: 3000,
      encoding: 'utf8',
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });
    const output = stdout.trim().slice(0, 800);
    return output || 'No uncommitted changes detected (git diff --stat HEAD is empty).';
  } catch {
    return 'Git context unavailable (not a repository or git is not installed).';
  }
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
        timeout: 8000,
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
  _modelSelectionCache = null;
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

// ─── Module knowledge base (slugs → what AI needs to know) ─────────────────
const MODULE_CONTEXT_HINTS: Record<string, string> = {
  'free/essentials/settings':
    'Pydantic-settings YAML config at src/modules/free/essentials/settings/settings.py. Use get_settings() via @lru_cache. NestJS: ConfigModule.forRoot with settingsConfiguration.',
  'free/essentials/logging':
    'Structured JSON logging via python-json-logger. Wraps stdlib logging. NestJS: pino-http.',
  'free/essentials/middleware':
    'CORS, rate-limiting, request-id, and security headers middleware at src/modules/free/essentials/middleware/.',
  'free/essentials/deployment':
    'Dockerfile, docker-compose.yml, and GitHub Actions CI at src/modules/free/essentials/deployment/.',
  'free/auth/core':
    'auth_core.py — PBKDF2 password hashing (sha256, 390k iterations), HMAC-SHA256 signed tokens. FastAPI deps at src/modules/free/auth/core/auth/dependencies.py. Routes at src/modules/free/auth/core/routers/auth_core.py. NestJS: AuthCoreService injected via AUTH_CORE_CONFIG token.',
  'free/auth/oauth':
    'OAuth 2.0 PKCE scaffolding. Provider registry in src/modules/free/auth/oauth/. Extend by adding provider configs.',
  'free/auth/session':
    'Signed session tokens in httpOnly cookies. Session store backed by Redis when free/cache/redis is installed.',
  'free/auth/passwordless':
    'Magic link and OTP helpers. Requires free/communication/* for delivery.',
  'free/auth/api_keys':
    'Deterministic API key issuance (slugified prefix + random suffix). HMAC verification. Audit log table.',
  'free/database/db_postgres':
    'SQLAlchemy 2.x async engine (asyncpg) + sync engine (psycopg[binary]). Session factory at src/modules/free/database/db_postgres/postgres.py. NestJS: PostgresService injected via TypeORM or raw pg pool.',
  'free/database/db_mongo':
    'Motor (async MongoDB). Repository base class at src/modules/free/database/db_mongo/.',
  'free/database/db_sqlite':
    'SQLite + aiosqlite for local dev. Same session interface as db_postgres.',
  'free/cache/redis':
    'redis-py async client. Cache helpers at src/modules/free/cache/redis/redis.py. NestJS: ioredis.',
  'free/security/cors':
    'CORS middleware configured from settings YAML. Reads allowed_origins, allow_credentials from config.',
  'free/security/security_headers':
    'Security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options) via starlette/NestJS middleware.',
  'free/observability/core':
    'Prometheus metrics at /metrics, OpenTelemetry tracing, structured health checks. Counter + histogram helpers in src/modules/free/observability/core/.',
  'free/users/users_core':
    'User entity (UUID PK, email, hashed_password, role). CRUD use-cases + FastAPI routes at /api/users. Integrates auth_core. NestJS: UsersModule with UsersService.',
  'free/users/users_profiles':
    'Extended user profile: avatar, bio, social links. Foreign key to users table. Separate profile router/service.',
  'free/business/storage':
    'File storage abstraction (local disk + S3/GCS/Azure blob). Key-based upload/download/delete. MIME type validation.',
  'free/billing/cart':
    'Shopping cart with item management, quantity, price calculation. Requires free/database/* and free/users/users_core.',
  'free/billing/stripe_payment':
    'Stripe Payment Intents + webhook handler + subscription lifecycle. Requires free/users/users_core. Checkout session builder.',
  'free/communication/notifications':
    'Notification system: email (SMTP + template), push (FCM), in-app websocket events. Notification preferences per user.',
  'free/tasks/celery':
    'Celery worker setup with Redis broker. Task discovery via autodiscover_tasks. Beat scheduler support.',
  'free/security/rate_limiting':
    'Production-grade rate limiting. Configurable rules per route/client. Integrates with free/cache/redis for distributed counters.',
  'free/billing/inventory':
    'Inventory and pricing service backing Cart + Stripe. Product/SKU catalog, stock tracking.',
  'free/communication/email':
    'Email delivery (SMTP + SendGrid). Template-based transactional email. Async task-friendly.',
  'free/ai/ai_assistant':
    'Provider-agnostic LLM client (OpenAI / Anthropic). Streaming responses. Prompt template registry.',
};

/**
 * Build the richest possible system prompt, combining static architecture
 * knowledge with live-scanned project context.
 */
export async function buildWorkspaiSystemPrompt(
  ctx: AIModalContext,
  scanned?: ScannedProjectContext
): Promise<string> {
  // ─── 1. Core identity ──────────────────────────────────────────────────
  const identity = `You are the Workspai AI assistant — a principal backend engineer who authored the Workspai/RapidKit platform. You know every file path, naming convention, inject point, and code pattern by heart.`;

  // ─── 2. True kit layout (based on actual templates / scanned files) ────
  const kitSection = buildKitSection(ctx, scanned);

  // ─── 3. Module context (installed in THIS project) ─────────────────────
  const moduleSection = buildModuleSection(ctx, scanned);

  // ─── 4. Coding standards (exact patterns from the real codebase) ───────
  const stdSection = buildStandardsSection(ctx, scanned);

  // ─── 5. Current project state ─────────────────────────────────────────
  const stateSection = buildStateSection(ctx, scanned);

  // ─── 6. Workspace memory (team conventions + project context) ──────────
  const memorySection = await _buildMemorySection(ctx);

  // ─── 7. Instructions ──────────────────────────────────────────────────
  const instructions = `INSTRUCTIONS:
- Always generate code that fits exactly into the layer described above.
- When adding a FastAPI endpoint, put the router in the correct layer (presentation/api/routes/ for DDD, routing/ for Standard).
- When suggesting module installation: rapidkit add module <name>  (e.g. rapidkit add module redis  OR  npx rapidkit add module free/cache/redis)
- Inject points in FastAPI pyproject.toml: # <<<inject:poetry-dependencies>>>
- Inject points in NestJS AppModule: // <<<inject:module-imports>>>
- Never suggest raw HTTP exceptions inside domain or application layers — raise domain exceptions and map them in the presentation layer.
- For migrations: use "alembic revision --autogenerate && alembic upgrade head".
- Response language: match the user's query language (Persian → Persian, English → English).`;

  const prompt = [
    identity,
    clampPromptSection(kitSection, 9000),
    clampPromptSection(moduleSection, 8000),
    clampPromptSection(stdSection, 6000),
    clampPromptSection(stateSection, 7000),
    clampPromptSection(memorySection, 3000),
    instructions,
  ]
    .filter(Boolean)
    .join('\n\n' + '─'.repeat(60) + '\n\n');

  return clampPromptSection(prompt, MAX_SYSTEM_PROMPT_CHARS);
}

function clampPromptSection(section: string, maxChars: number): string {
  if (!section || section.length <= maxChars) {
    return section;
  }
  return `${section.slice(0, maxChars)}\n... [truncated for context budget]`;
}

function buildKitSection(ctx: AIModalContext, scanned?: ScannedProjectContext): string {
  const fw = scanned?.kit ?? ctx.framework;

  if (fw === 'fastapi.ddd' || (ctx.framework === 'fastapi' && scanned?.hasDomainLayer)) {
    return `PROJECT ARCHITECTURE: FastAPI DDD Kit (fastapi.ddd)

Real directory layout (generated by rapidkit create):
  src/
    app/
      config/            ← Pydantic-settings config loader (__init__.py)
      domain/
        models/          ← Dataclasses with @dataclass(slots=True, frozen=True)
                           e.g. Note, NoteDraft (value object)
      application/
        interfaces.py    ← Protocol-based repository contracts + ServiceContext dataclass
                           ServiceContext aggregates ALL infrastructure adapters
        use_cases/       ← Pure Python functions: def create_note(ctx: ServiceContext, draft: NoteDraft) → Note
      infrastructure/
        repositories/    ← Concrete SQLAlchemy 2.x / in-memory impls of domain interfaces
      presentation/
        api/
          routes/        ← APIRouter + Pydantic v2 schemas (e.g. NotePayload, NoteResponse)
          dependencies/
            __init__.py  ← @lru_cache def get_service_context() → ServiceContext
      shared/
        result.py        ← Result[T, E] generic wrapper
      main.py            ← create_app() factory (FastAPI + CORSMiddleware + /api prefix)
    cli.py               ← poetry scripts (dev, test, lint, format)
    modules/free/        ← Installed RapidKit modules
    routing/             ← src/routing/__init__.py re-exports api_router (legacy mount path)
  pyproject.toml         ← poetry; fastapi^0.128, pydantic^2.12, uvicorn[standard]^0.40
  alembic/               ← DB migrations (if db_postgres installed)
  registry.json          ← Installed modules manifest
  config/                ← Per-module YAML configs (e.g. config/database/postgres.yaml)

KEY PATTERNS:
  • AppRouter prefix: /api
  • Domain entities: @dataclass(slots=True) — NO SQLAlchemy mixins in domain
  • Repos: use Protocol in interfaces.py, concrete in infrastructure/repositories/
  • DI wiring: @lru_cache get_service_context() in presentation/api/dependencies/__init__.py
  • Modules install to: src/modules/free/{category}/{slug}/`;
  }

  if (fw === 'fastapi.standard' || ctx.framework === 'fastapi') {
    return `PROJECT ARCHITECTURE: FastAPI Standard Kit (fastapi.standard)

Real directory layout (generated by rapidkit create):
  src/
    modules/free/        ← Installed RapidKit modules (main feature code lives here)
    routing/             ← Root router; src/routing/__init__.py re-exports api_router
    main.py              ← create_app() factory
    cli.py               ← poetry scripts (dev, test, lint, format)
  pyproject.toml         ← poetry; fastapi^0.128, pydantic^2.12, uvicorn[standard]^0.40
  registry.json          ← Installed modules manifest
  config/                ← Per-module YAML configs

KEY PATTERNS:
  • Module path: src/modules/free/{category}/{slug}/
  • Each module exposes a router registered in src/routing/
  • Use pydantic-settings (YAML extras) for all configuration
  • Settings module at: src/modules/free/essentials/settings/settings.py → get_settings()`;
  }

  if (fw === 'nestjs.standard' || ctx.framework === 'nestjs') {
    return `PROJECT ARCHITECTURE: NestJS Standard Kit (nestjs.standard)

Real directory layout (generated by rapidkit create):
  src/
    app.module.ts        ← Root module; imports ConfigModule.forRoot({ isGlobal: true })
    app.controller.ts / app.service.ts
    main.ts              ← NestFactory.create; helmet, compression, Swagger at /docs
    config/
      configuration.ts   ← settingsConfiguration loader
      validation.ts      ← Joi validationSchema
    modules/
      index.ts           ← re-exports as rapidkitModules[]
    modules/free/
      {category}/{slug}/ ← Installed RapidKit modules
        {slug}.module.ts
        {slug}.service.ts
        {slug}.controller.ts
        {slug}.routes.ts
        config/{slug}.validation.ts
    auth/                ← Built-in auth scaffold (auth.module.ts, auth.service.ts, auth.controller.ts)
    examples/            ← Example feature module (examples.module.ts, examples.service.ts, etc.)
  test/                  ← E2E specs (app.e2e-spec.ts, jest-e2e.json)
  package.json           ← @nestjs/core, helmet, compression, @nestjs/swagger
  registry.json          ← Installed modules manifest

KEY PATTERNS:
  • Module inject point in AppModule: // <<<inject:module-imports>>>
  • rapidkitModules[] in src/modules/index.ts aggregates all installed module classes
  • All modules are globally scoped via ConfigModule.forRoot isGlobal: true
  • Auth injection: AUTH_CORE_CONFIG token → @Inject(AUTH_CORE_CONFIG)
  • NestJS modules export providers so other modules can use DI normally`;
  }

  if (
    fw === 'go.fiber' ||
    fw === 'go.gin' ||
    fw === 'gofiber.standard' ||
    fw === 'gogin.standard' ||
    ctx.framework === 'go'
  ) {
    const router = fw === 'gogin.standard' || fw === 'go.gin' ? 'Gin' : 'Fiber v2';
    const kitName =
      fw === 'gogin.standard' || fw === 'go.gin' ? 'gogin.standard' : 'gofiber.standard';
    return `PROJECT ARCHITECTURE: Go Standard Kit (${fw ?? 'go.fiber'})

Real directory layout (generated by rapidkit-npm):
  cmd/server/
    main.go              ← Entry; config.Load(), server.NewRouter(cfg), graceful shutdown, version ldflags
  internal/
    config/
      config.go          ← 12-factor env config: Load() → *Config{Port, Env, GinMode/FiberEnv, LogLevel}
      config_test.go
    server/
      server.go          ← ${router} router factory with all middleware + routes registered
      server_test.go
    handlers/            ← HTTP handlers: health.go, example.go (add one file per domain aggregate)
    middleware/
      requestid.go       ← X-Request-ID header + structured slog Logger
      cors.go            ← CORS via CORS_ALLOW_ORIGINS env var
      ratelimit.go       ← Per-IP fixed-window rate limiter (RATE_LIMIT_RPS env var)
    apierr/
      apierr.go          ← JSON error envelope: {error, code, request_id}
  docs/
    doc.go               ← swaggo package-level OpenAPI annotations
  go.mod                 ← module declaration
  Makefile               ← dev (air), test, build, docs (swag), lint, docker-up
  .air.toml              ← hot reload; pre_cmd regenerates swagger on each reload
  .golangci.yml
  .env.example           ← PORT, APP_ENV, GIN_MODE, LOG_LEVEL, CORS_ALLOW_ORIGINS, RATE_LIMIT_RPS
  Dockerfile             ← Multi-stage alpine with HEALTHCHECK
  rapidkit / rapidkit.cmd ← project launcher (init, dev, start, build, docs, test)

KEY PATTERNS:
  • Structured logging via slog (stdlib, JSON handler; debug level in dev, info in prod)
  • Config via os.LookupEnv with fallback; config.Load() returns typed *Config struct
  • Graceful shutdown: signal.Notify + srv.Shutdown(ctx) with 5s timeout
  • API docs: /docs → /docs/index.html via ${router === 'Fiber v2' ? 'fiber-swagger' : 'gin-swagger'}
  • JSON error envelope: apierr.BadRequest/NotFound/Unauthorized/InternalError(c, msg)
  • Build-time version injection via ldflags: -X main.version -X main.commit -X main.date
  • Kit name: ${kitName}
  • No module system (module_support=false in .rapidkit/project.json)
  • Launcher: rapidkit init → rapidkit dev (hot reload via air)`;
  }

  return '';
}

function buildModuleSection(ctx: AIModalContext, scanned?: ScannedProjectContext): string {
  const fw = resolveFrameworkFamily(ctx, scanned);
  if (fw === 'go') {
    return `WORKSPAI GO KITS:
- Go kits currently do not support the RapidKit module marketplace.
- Supported kits: gofiber.standard, gogin.standard.
- Extend functionality by adding native Go packages + internal adapters in your project.
- For scaffolding updates, use the npm wrapper commands (rapidkit create/init/dev/docs).`;
  }

  const installed = scanned?.installedModules ?? [];

  // Always provide the full module system reference
  const ref = `WORKSPAI MODULE SYSTEM:
- Install command:  rapidkit add module <name>   (e.g. rapidkit add module redis)
                   rapidkit add module <slug>    (e.g. rapidkit add module free/cache/redis)
                   npx rapidkit add module redis  (npm CLI form)
- Remove command:   rapidkit uninstall <slug>
- List installed:   registry.json at project root
- Module path FastAPI: src/modules/free/{category}/{slug}/
- Module path NestJS:  src/modules/free/{category}/{slug}/{slug}.module.ts
- After install: FastAPI → registered in src/routing/; NestJS → added to rapidkitModules[]
- Module inject points: pyproject.toml has # <<<inject:module-dependencies>>>; NestJS AppModule has // <<<inject:module-imports>>>

AVAILABLE CATEGORIES: ai | auth | billing | business | cache | communication | database | essentials | observability | security | tasks | users`;

  if (installed.length === 0 && ctx.type !== 'module') {
    return ref;
  }

  // Module-specific query context
  if (ctx.type === 'module' && ctx.moduleSlug) {
    const hint = MODULE_CONTEXT_HINTS[ctx.moduleSlug] ?? '';
    return `${ref}

MODULE IN FOCUS: ${ctx.name} (${ctx.moduleSlug})
${ctx.moduleDescription ? `Description: ${ctx.moduleDescription}` : ''}
${hint ? `\nDetailed knowledge:\n${hint}` : ''}`;
  }

  // Installed modules for this project
  const moduleLines = installed.map((m) => {
    const hint = MODULE_CONTEXT_HINTS[m.slug];
    return `  • ${m.display_name} (${m.slug} v${m.version})${hint ? '\n    ' + hint : ''}`;
  });

  return `${ref}

INSTALLED IN THIS PROJECT (${installed.length} modules):
${moduleLines.join('\n')}`;
}

function buildStandardsSection(ctx: AIModalContext, scanned?: ScannedProjectContext): string {
  const fw = resolveFrameworkFamily(ctx, scanned);

  if (fw === 'fastapi') {
    return `FASTAPI / PYTHON CODING STANDARDS (exact Workspai patterns):

Domain entities:
  @dataclass(slots=True, frozen=True)
  class NoteDraft:
      title: str
      body: str

Repository protocol (interfaces.py):
  class NoteRepository(Protocol):
      def create(self, draft: NoteDraft) -> Note: ...
      def list(self) -> list[Note]: ...

Use-case (pure function, no FastAPI):
  def create_note(ctx: ServiceContext, draft: NoteDraft) -> Note:
      return ctx.note_repository.create(draft)

APIRouter route:
  @router.post("/notes", response_model=NoteResponse, status_code=201)
  async def create_note_route(payload: NotePayload, ctx = Depends(get_service_context)):
      note = create_note(ctx, NoteDraft(title=payload.title, body=payload.body))
      return NoteResponse(**note.to_dict())

DI wiring (dependencies/__init__.py):
  @lru_cache(maxsize=1)
  def get_service_context() -> ServiceContext:
      return ServiceContext(note_repository=InMemoryNoteRepository())

Pydantic v2 schema:
  class NotePayload(BaseModel):
      title: str = Field(..., max_length=80)
      body: str = Field(..., max_length=500)

Settings (pydantic-settings):
  from src.modules.free.essentials.settings.settings import get_settings
  # get_settings() → Settings (cached, YAML-backed)

Error handling: raise domain exceptions in use-cases, map to HTTPException in routes.
Migrations: alembic revision --autogenerate -m "description" && alembic upgrade head`;
  }

  if (fw === 'nestjs') {
    const hasPg = scanned?.installedModules.some((m) => m.slug.includes('db_postgres'));
    return `NESTJS / TYPESCRIPT CODING STANDARDS (exact Workspai patterns):

Module structure:
  @Module({ imports: [...], controllers: [AuthController], providers: [AuthService] })
  export class AuthModule {}

Service:
  @Injectable()
  export class AuthService {
    constructor(@Inject(AUTH_CORE_CONFIG) private readonly config: AuthCoreConfig) {}
  }

Controller:
  @Controller('/api/auth')
  @ApiTags('auth')
  export class AuthController {
    constructor(private readonly authService: AuthService) {}
    @Post('/login') @HttpCode(200)
    async login(@Body() dto: LoginDto): Promise<TokenResponse> { ... }
  }

DTO (class-validator):
  export class LoginDto {
    @IsEmail() @IsNotEmpty() email: string;
    @IsString() @MinLength(12) password: string;
  }

Config (settingsConfiguration):
  export const settingsConfiguration = () => ({ port: parseInt(process.env.PORT ?? '8000', 10) });
  // Validated by Joi schema in config/validation.ts

${hasPg ? 'PostgreSQL (TypeORM): use @Entity() for ORM models, inject DataSource for raw queries.' : ''}
Error handling: throw NestJS HttpException in controllers; services throw domain errors.
Testing: Jest, @nestjs/testing TestingModule, supertest for e2e.`;
  }

  if (fw === 'go') {
    return `GO CODING STANDARDS (exact Workspai patterns):

Handler:
  func (h *NoteHandler) Create(c *fiber.Ctx) error {
      var req CreateNoteRequest
      if err := c.BodyParser(&req); err != nil { return fiber.ErrBadRequest }
      note, err := h.svc.Create(c.Context(), req)
      if err != nil { return err }
      return c.Status(201).JSON(note)
  }

Service interface:
  type NoteService interface {
      Create(ctx context.Context, req CreateNoteRequest) (Note, error)
      List(ctx context.Context) ([]Note, error)
  }

Config:
  func Load() Config {
      return Config{ Port: getEnv("PORT", "8000"), DBUrl: getEnv("DATABASE_URL", "") }
  }

Error wrapping: fmt.Errorf("create note: %w", err)
Logging: slog.InfoContext(ctx, "note created", "id", note.ID)
Testing: table-driven, testify/assert, mock interfaces with testify/mock.`;
  }

  return '';
}

function buildStateSection(ctx: AIModalContext, scanned?: ScannedProjectContext): string {
  if (!scanned || !ctx.path) {
    return '';
  }

  const scopeLabel = ctx.type === 'workspace' ? 'WORKSPACE' : 'PROJECT';
  const parts: string[] = [`CURRENT ${scopeLabel} STATE: ${scanned.projectName}`];
  parts.push(`  Root:        ${scanned.projectRoot}`);
  parts.push(`  Kit:         ${scanned.kit}`);
  if (scanned.runtime) {
    parts.push(`  Runtime:     ${scanned.runtime}`);
  }
  if (scanned.engine) {
    parts.push(`  Engine:      ${scanned.engine}`);
  }
  if (scanned.pythonVersion) {
    parts.push(`  Python:      ${scanned.pythonVersion}`);
    parts.push(`  python_version: ${scanned.pythonVersion}`);
  }
  if (scanned.rapidkitCliVersion) {
    parts.push(`  RapidKit CLI: ${scanned.rapidkitCliVersion}`);
    parts.push(`  rapidkit_cli_version: ${scanned.rapidkitCliVersion}`);
  }
  if (scanned.rapidkitCoreVersion) {
    parts.push(`  RapidKit Core: ${scanned.rapidkitCoreVersion}`);
    parts.push(`  rapidkit_core_version: ${scanned.rapidkitCoreVersion}`);
  }
  if (scanned.detectionConfidence !== 'none') {
    parts.push(`  Detection:   ${scanned.detectionConfidence}`);
  }
  if (scanned.workspaceHealth) {
    const health = scanned.workspaceHealth;
    parts.push(
      `  Workspace health: ${health.passed}/${health.total} passed (${health.warnings} warn, ${health.errors} error)`
    );
    parts.push(
      `  workspace_health: ${JSON.stringify({
        total: health.total,
        passed: health.passed,
        warnings: health.warnings,
        errors: health.errors,
        generated_at: health.generatedAt,
      })}`
    );
  }
  parts.push(`  Modules:     ${scanned.installedModules.length} installed`);
  if (scanned.hasAlembic) {
    parts.push('  Migrations:  Alembic (alembic/)');
  }
  if (scanned.hasDocker) {
    parts.push('  Docker:      Dockerfile + docker-compose.yml present');
  }
  if (scanned.hasHealthDir) {
    parts.push('  Health dir:  src/health/ (module health endpoints registered)');
  }
  if (scanned.envFile) {
    parts.push(`  Env file:    ${scanned.envFile}`);
  }
  if (scanned.configFiles.length > 0) {
    parts.push(`  Config YAMLs: ${scanned.configFiles.join(', ')}`);
  }
  if (scanned.productionDeps.length > 0) {
    const notable = scanned.productionDeps
      .filter((d) =>
        [
          'sqlalchemy',
          'asyncpg',
          'redis',
          'boto3',
          'stripe',
          'celery',
          'alembic',
          'typeorm',
          'prisma',
        ].includes(d)
      )
      .slice(0, 8);
    if (notable.length > 0) {
      parts.push(`  Notable deps: ${notable.join(', ')}`);
    }
  }

  // ─ v0.18: directory tree ────────────────────────────────────────────
  if (scanned.dirTree) {
    parts.push(
      `\n  Directory layout:\n${scanned.dirTree
        .split('\n')
        .map((l) => '  ' + l)
        .join('\n')}`
    );
  }

  // ─ v0.18: key entry-point files ─────────────────────────────────
  for (const file of scanned.relevantFiles) {
    parts.push(
      `\n  [${file.relPath}]\n${file.content
        .split('\n')
        .slice(0, 25)
        .map((l) => '  ' + l)
        .join('\n')}`
    );
  }

  // ─ v0.18: recent git changes ──────────────────────────────────
  if (scanned.gitDiff) {
    parts.push(
      `\n  Recent uncommitted changes (git diff --stat HEAD):\n${scanned.gitDiff
        .split('\n')
        .map((l) => '  ' + l)
        .join('\n')}`
    );
  }

  return parts.join('\n');
}

/**
 * Inject workspace memory (team conventions + decisions) into the system prompt.
 * Returns an empty string when the project has no memory file.
 */
async function _buildMemorySection(ctx: AIModalContext): Promise<string> {
  if (!ctx.path) {
    return '';
  }
  try {
    const memSvc = WorkspaceMemoryService.getInstance();
    const memory = await memSvc.readNearest(ctx.path);
    const formatted = memSvc.formatForPrompt(memory);
    if (!formatted) {
      return '';
    }
    return `WORKSPACE MEMORY (team-defined conventions and decisions — follow these exactly):\n${formatted}`;
  } catch {
    return '';
  }
}

// ─── buildAIModalUserMessage ────────────────────────────────────────────────

/**
 * Build the user-facing message for an AI modal query.
 */
export function buildAIModalUserMessage(
  mode: AIConversationMode,
  question: string,
  ctx: AIModalContext,
  scanned?: ScannedProjectContext
): string {
  const kitLabel = scanned?.kit ?? ctx.framework ?? ctx.type;
  const installedList = scanned?.installedModules.map((m) => m.slug).join(', ');
  const contextPacket = scanned
    ? {
        project_type: scanned.kit,
        python_version: scanned.pythonVersion,
        rapidkit_cli_version: scanned.rapidkitCliVersion,
        rapidkit_core_version: scanned.rapidkitCoreVersion,
        installed_modules: scanned.installedModules.map((m) => m.slug),
        workspace_health: scanned.workspaceHealth,
        runtime: scanned.runtime,
        engine: scanned.engine,
      }
    : null;
  const ctxHeader = [
    `[${ctx.type.toUpperCase()}] ${ctx.name}`,
    kitLabel && `Kit: ${kitLabel}`,
    ctx.path && `Path: ${ctx.path}`,
    scanned?.pythonVersion && `python_version: ${scanned.pythonVersion}`,
    scanned?.rapidkitCliVersion && `rapidkit_cli_version: ${scanned.rapidkitCliVersion}`,
    scanned?.rapidkitCoreVersion && `rapidkit_core_version: ${scanned.rapidkitCoreVersion}`,
    scanned?.workspaceHealth &&
      `workspace_health: ${JSON.stringify({
        total: scanned.workspaceHealth.total,
        passed: scanned.workspaceHealth.passed,
        warnings: scanned.workspaceHealth.warnings,
        errors: scanned.workspaceHealth.errors,
        generated_at: scanned.workspaceHealth.generatedAt,
      })}`,
    contextPacket && `context_packet: ${JSON.stringify(contextPacket)}`,
    installedList && `Installed modules: ${installedList}`,
  ]
    .filter(Boolean)
    .join('\n');

  if (mode === 'debug') {
    return `${ctxHeader}

Error / Issue to debug:
${question}

Structure your response as:
## Root Cause
(Precise diagnosis, referencing actual Workspai file paths)

## Fix
\`\`\`  ← include exact code matching this project's kit and installed modules
…
\`\`\`
Step-by-step instructions.

## Prevention
(Workspai patterns or module configurations to prevent recurrence)`;
  }

  return `${ctxHeader}

Question: ${question}

Answer precisely using the project's actual kit (${kitLabel}), installed modules, and Workspai coding standards. Include working code examples.`;
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
        content: buildAIModalUserMessage(mode, question, ctx, scanned),
      },
    ],
  };
}

// ─── selectModel: respects workspai.preferredModel VS Code setting ──────────

/**
 * Select the language model according to the user's VS Code preference.
 * Falls back to auto-detection when set to "auto" or unrecognised.
 */
export async function selectModelWithPreference(): Promise<{
  model: vscode.LanguageModelChat;
  modelId: string;
}> {
  const pref = vscode.workspace.getConfiguration('workspai').get<string>('preferredModel', 'auto');

  if (
    _modelSelectionCache &&
    _modelSelectionCache.preference === pref &&
    Date.now() - _modelSelectionCache.cachedAt < MODEL_SELECTION_TTL_MS
  ) {
    return _modelSelectionCache.result;
  }

  const MODEL_MAP: Record<string, string[]> = {
    // ── Claude ────────────────────────────────────────────
    'claude-opus-4-6': ['claude-opus-4-6', 'claude-opus-4-5'],
    'claude-opus-4-5': ['claude-opus-4-5', 'claude-opus-4-6'],
    'claude-sonnet-4-6': ['claude-sonnet-4-6', 'claude-sonnet-4-5'],
    'claude-sonnet-4-5': ['claude-sonnet-4-5', 'claude-sonnet-4-6'],
    'claude-sonnet-4': ['claude-sonnet-4', 'claude-sonnet-4-5'],
    'claude-haiku-4-5': ['claude-haiku-4-5'],
    // ── GPT ──────────────────────────────────────────────
    'gpt-5.4': ['gpt-5.4', 'gpt-5.2'],
    'gpt-5.4-mini': ['gpt-5.4-mini', 'gpt-5.4'],
    'gpt-5.3-codex': ['gpt-5.3-codex', 'gpt-5.2-codex'],
    'gpt-5.2-codex': ['gpt-5.2-codex', 'gpt-5.3-codex'],
    'gpt-5.2': ['gpt-5.2', 'gpt-5.4'],
    'gpt-5-mini': ['gpt-5-mini', 'gpt-5.2'],
    'gpt-4.1': ['gpt-4.1', 'gpt-4o'],
    'gpt-4o': ['gpt-4o', 'gpt-4.1'],
    // ── Gemini ───────────────────────────────────────────
    'gemini-3.1-pro': ['gemini-3.1-pro', 'gemini-2.5-pro'],
    'gemini-3-flash': ['gemini-3-flash', 'gemini-2.5-pro'],
    'gemini-2.5-pro': ['gemini-2.5-pro', 'gemini-3.1-pro'],
    // ── Other ────────────────────────────────────────────
    'grok-code-fast-1': ['grok-code-fast-1'],
    'raptor-mini': ['raptor-mini'],
    // ── Legacy preference aliases (backward compatibility) ────────────
    'claude-3-7-sonnet': ['claude-sonnet-4-6', 'claude-sonnet-4-5'],
    'claude-3-5-sonnet': ['claude-sonnet-4-5', 'claude-sonnet-4'],
    'gpt-4o-mini': ['gpt-5-mini', 'gpt-4o'],
  };

  const rememberSelection = (model: vscode.LanguageModelChat, modelId: string) => {
    const result = { model, modelId };
    _modelSelectionCache = {
      preference: pref,
      result,
      cachedAt: Date.now(),
    };
    return result;
  };

  const allModels = await vscode.lm.selectChatModels();
  const normalizeModelKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const findModelByAlias = (alias: string): vscode.LanguageModelChat | undefined => {
    const target = normalizeModelKey(alias);
    const exact = allModels.find(
      (m) => normalizeModelKey(m.id) === target || normalizeModelKey(m.name ?? '') === target
    );
    if (exact) {
      return exact;
    }
    return allModels.find((m) => {
      const id = normalizeModelKey(m.id);
      const name = normalizeModelKey(m.name ?? '');
      return id.includes(target) || name.includes(target);
    });
  };

  const tryModelAliases = (aliases: string[]) => {
    for (const alias of aliases) {
      const model = findModelByAlias(alias);
      if (model) {
        return rememberSelection(model, model.name ?? model.id);
      }
    }
    return null;
  };

  // Preferred model requested explicitly
  if (pref !== 'auto') {
    const preferred = tryModelAliases(MODEL_MAP[pref] ?? [pref]);
    if (preferred) {
      return preferred;
    }
  }

  // Auto: try quality order (best coding models first, balanced cost)
  const autoOrder = [
    'claude-sonnet-4-6',
    'gpt-5.3-codex',
    'gpt-5.2-codex',
    'claude-sonnet-4-5',
    'gpt-5.4',
    'gpt-5.2',
    'gemini-3.1-pro',
    'gemini-2.5-pro',
    'claude-sonnet-4',
    'gpt-4.1',
    'gpt-4o',
    'gpt-5-mini',
    'gemini-3-flash',
    'claude-haiku-4-5',
    'gpt-5.4-mini',
    'grok-code-fast-1',
  ];
  const autoSelected = tryModelAliases(autoOrder);
  if (autoSelected) {
    return autoSelected;
  }

  // Absolute fallback
  if (allModels.length > 0) {
    return rememberSelection(allModels[0], allModels[0].name ?? allModels[0].id);
  }

  throw new Error(
    'No AI language model available. Please install GitHub Copilot or another compatible Copilot extension.'
  );
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
  const { model, modelId } = await selectModelWithPreference();
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
