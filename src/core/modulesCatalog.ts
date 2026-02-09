import * as path from 'path';
import * as fs from 'fs-extra';
import { RapidKitCLI } from './rapidkitCLI';
import { Logger } from '../utils/logger';
import { CATEGORY_INFO, MODULES, ModuleData } from '../data/modules';

export type ModulesCatalogSource = 'live' | 'cache' | 'fallback';

export type ModulesCatalogPayload = {
  schema_version: 1;
  generated_at?: string;
  etag?: string;
  filters?: {
    category?: string | null;
    tag?: string | null;
    detailed?: boolean;
    [key: string]: unknown;
  };
  stats?: {
    total?: number;
    returned?: number;
    invalid?: number;
    [key: string]: unknown;
  };
  modules: Array<Record<string, unknown>>;
  invalid_modules?: Array<{ slug: string; messages?: string[] }>;
  warnings?: string[];
  errors?: string[];
  source?: string;
  fetched_at?: number;
};

export type ModulesCatalogResult = {
  modules: ModuleData[];
  source: ModulesCatalogSource;
  catalog: ModulesCatalogPayload | null;
};

const DEFAULT_TTL_MS = 10 * 60 * 1000;

function cachePath(storagePath: string, workspaceHash?: string): string {
  // Create workspace-specific cache file using hash of workspace path
  const cacheFile = workspaceHash
    ? `modules-catalog-${workspaceHash}.json`
    : 'modules-catalog.json';
  return path.join(storagePath, cacheFile);
}

function getWorkspaceHash(workspacePath: string | undefined): string | undefined {
  if (!workspacePath) {
    return undefined;
  }
  // Create a simple hash of the workspace path to use in cache filename
  // This ensures each workspace gets its own cache file
  const crypto = require('crypto');
  return crypto.createHash('md5').update(workspacePath).digest('hex').substring(0, 8);
}

/**
 * Invalidate the modules catalog cache so the next load fetches fresh data.
 * Called when switching workspaces to ensure correct per-workspace versions.
 */
export async function invalidateModulesCatalogCache(
  storagePath: string,
  workspacePath?: string
): Promise<void> {
  const p = cachePath(storagePath, getWorkspaceHash(workspacePath));
  try {
    if (await fs.pathExists(p)) {
      await fs.remove(p);
    }
  } catch {
    // ignore removal errors
  }
}

function normalizeStatus(value: unknown): ModuleData['status'] {
  if (value === 'beta' || value === 'experimental') {
    return value;
  }
  return 'stable';
}

function fallbackIdFromSlug(slug: string): string {
  if (!slug) {
    return 'unknown';
  }
  const parts = slug.split('/').filter(Boolean);
  return parts[parts.length - 1] || slug;
}

function toModuleData(record: Record<string, unknown>): ModuleData {
  const slug = typeof record.slug === 'string' ? record.slug : '';
  const nameRaw = typeof record.display_name === 'string' ? record.display_name : record.name;
  const name = typeof nameRaw === 'string' && nameRaw.trim() ? nameRaw : fallbackIdFromSlug(slug);
  const idRaw = typeof record.name === 'string' ? record.name : fallbackIdFromSlug(slug);
  const id = idRaw.replace(/\s+/g, '_').toLowerCase();
  const category = typeof record.category === 'string' ? record.category : 'unknown';
  const version = typeof record.version === 'string' ? record.version : '0.0.0';
  const description = typeof record.description === 'string' ? record.description : '';
  const tags = Array.isArray(record.tags)
    ? record.tags.filter((t): t is string => typeof t === 'string')
    : [];
  const status = normalizeStatus(record.status);
  const icon = CATEGORY_INFO[category as keyof typeof CATEGORY_INFO]?.icon ?? '📦';

  return {
    id,
    name,
    version,
    category,
    icon,
    description,
    status,
    tags,
    slug,
  };
}

function normalizeModules(records: Array<Record<string, unknown>>): ModuleData[] {
  return records.map((rec) => toModuleData(rec));
}

async function readCache(
  storagePath: string,
  workspacePath?: string
): Promise<ModulesCatalogPayload | null> {
  const workspaceHash = getWorkspaceHash(workspacePath);
  const p = cachePath(storagePath, workspaceHash);
  if (!(await fs.pathExists(p))) {
    return null;
  }
  try {
    const data = (await fs.readJson(p)) as ModulesCatalogPayload;
    if (data && data.schema_version === 1 && Array.isArray(data.modules)) {
      return data;
    }
  } catch {
    // ignore cache errors
  }
  return null;
}

async function writeCache(
  storagePath: string,
  payload: ModulesCatalogPayload,
  workspacePath?: string
): Promise<void> {
  const workspaceHash = getWorkspaceHash(workspacePath);
  const p = cachePath(storagePath, workspaceHash);
  await fs.ensureDir(path.dirname(p));
  await fs.writeJson(p, payload, { spaces: 2 });
}

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function loadModulesCatalog(opts: {
  cli: RapidKitCLI;
  storagePath: string;
  ttlMs?: number;
  workspacePath?: string;
}): Promise<ModulesCatalogResult> {
  const logger = Logger.getInstance();
  const ttlMs = typeof opts.ttlMs === 'number' ? opts.ttlMs : DEFAULT_TTL_MS;
  const now = Date.now();

  const cached = await readCache(opts.storagePath, opts.workspacePath);
  if (cached?.fetched_at && now - cached.fetched_at < ttlMs) {
    return {
      modules: normalizeModules(cached.modules),
      source: 'cache',
      catalog: cached,
    };
  }

  const live = await opts.cli.run(
    ['modules', 'list', '--json-schema', '1'],
    opts.workspacePath,
    true
  );
  if (live.exitCode === 0) {
    const payload = safeParseJson(live.stdout) as ModulesCatalogPayload | null;
    if (payload && payload.schema_version === 1 && Array.isArray(payload.modules)) {
      const enriched: ModulesCatalogPayload = { ...payload, fetched_at: now };
      await writeCache(opts.storagePath, enriched, opts.workspacePath);
      return {
        modules: normalizeModules(enriched.modules),
        source: 'live',
        catalog: enriched,
      };
    }
  }

  const legacy = await opts.cli.run(['modules', 'list', '--json'], opts.workspacePath, true);
  if (legacy.exitCode === 0) {
    const data = safeParseJson(legacy.stdout);
    if (Array.isArray(data)) {
      const legacyPayload: ModulesCatalogPayload = {
        schema_version: 1,
        generated_at: new Date().toISOString(),
        filters: {
          category: null,
          tag: null,
          detailed: false,
        },
        stats: {
          total: data.length,
          returned: data.length,
          invalid: 0,
        },
        modules: data as Array<Record<string, unknown>>,
        source: 'legacy-json',
        fetched_at: now,
      };
      await writeCache(opts.storagePath, legacyPayload, opts.workspacePath);
      return {
        modules: normalizeModules(legacyPayload.modules),
        source: 'live',
        catalog: legacyPayload,
      };
    }
  }

  if (cached) {
    return {
      modules: normalizeModules(cached.modules),
      source: 'cache',
      catalog: cached,
    };
  }

  logger.warn('[ModulesCatalog] Falling back to static modules list.');
  return {
    modules: MODULES,
    source: 'fallback',
    catalog: null,
  };
}
