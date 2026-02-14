/**
 * Kits Service
 * Fetches and caches available kits from RapidKit CLI
 */

import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { run } from '../utils/exec';

export interface Kit {
  name: string;
  display_name: string;
  category: 'fastapi' | 'nestjs' | string;
  version: string;
  tags?: string[];
  modules?: string[];
  description: string;
}

export interface KitsListResult {
  schema_version: number;
  ok: boolean;
  filters?: {
    category?: string | null;
    tag?: string | null;
    detailed?: boolean;
  };
  count: number;
  kits: Kit[];
}

interface KitsCache {
  kits: Kit[];
  timestamp: number;
}

export class KitsService {
  private static instance: KitsService | null = null;
  private readonly storagePath: string;
  private readonly cacheFilePath: string;
  private readonly ttlMs: number = 24 * 60 * 60 * 1000; // 24 hours

  private constructor(context: vscode.ExtensionContext) {
    this.storagePath = context.globalStorageUri.fsPath;
    this.cacheFilePath = path.join(this.storagePath, 'kits-cache.json');
  }

  static initialize(context: vscode.ExtensionContext): KitsService {
    if (!KitsService.instance) {
      KitsService.instance = new KitsService(context);
    }
    return KitsService.instance;
  }

  static getInstance(): KitsService {
    if (!KitsService.instance) {
      throw new Error('KitsService not initialized');
    }
    return KitsService.instance;
  }

  /**
   * Get available kits (with caching)
   */
  async getKits(): Promise<Kit[]> {
    try {
      // Check cache first
      const cached = await this._loadCache();
      if (cached && Date.now() - cached.timestamp < this.ttlMs) {
        console.log('[KitsService] Using cached kits');
        return cached.kits;
      }

      // Fetch from CLI
      console.log('[KitsService] Fetching kits from CLI...');
      const result = await run('npx', ['--yes', 'rapidkit@latest', 'list', '--json'], {
        timeout: 15000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      if (result.exitCode !== 0) {
        throw new Error(`rapidkit list failed with exit code ${result.exitCode}`);
      }

      const output = result.stdout?.trim();
      if (!output) {
        throw new Error('Empty output from rapidkit list --json');
      }

      const parsed: KitsListResult = JSON.parse(output);

      if (!parsed.ok || !Array.isArray(parsed.kits)) {
        throw new Error('Invalid response from rapidkit list --json');
      }

      const kits = parsed.kits;

      // Save to cache
      await this._saveCache({ kits, timestamp: Date.now() });
      console.log('[KitsService] Kits fetched and cached:', kits.length);

      return kits;
    } catch (error: any) {
      console.error('[KitsService] Failed to fetch kits:', error.message);

      // Try to use stale cache
      const cached = await this._loadCache();
      if (cached && cached.kits.length > 0) {
        console.log('[KitsService] Using stale cache as fallback');
        return cached.kits;
      }

      // Ultimate fallback: return hardcoded kits
      return this._getFallbackKits();
    }
  }

  /**
   * Get kits by category
   */
  async getKitsByCategory(category: 'fastapi' | 'nestjs'): Promise<Kit[]> {
    const allKits = await this.getKits();
    return allKits.filter((kit) => kit.category === category);
  }

  /**
   * Invalidate cache to force refresh
   */
  async invalidateCache(): Promise<void> {
    try {
      if (await fs.pathExists(this.cacheFilePath)) {
        await fs.remove(this.cacheFilePath);
        console.log('[KitsService] Cache invalidated');
      }
    } catch (error) {
      console.error('[KitsService] Failed to invalidate cache:', error);
    }
  }

  private async _loadCache(): Promise<KitsCache | null> {
    try {
      if (await fs.pathExists(this.cacheFilePath)) {
        return await fs.readJson(this.cacheFilePath);
      }
    } catch (error) {
      console.error('[KitsService] Failed to load cache:', error);
    }
    return null;
  }

  private async _saveCache(cache: KitsCache): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.cacheFilePath));
      await fs.writeJson(this.cacheFilePath, cache, { spaces: 2 });
    } catch (error) {
      console.error('[KitsService] Failed to save cache:', error);
    }
  }

  private _getFallbackKits(): Kit[] {
    // Hardcoded fallback kits (synced from npm templates)
    return [
      {
        name: 'fastapi.standard',
        display_name: 'FastAPI Standard Kit',
        category: 'fastapi',
        version: '0.1.0',
        tags: ['fastapi', 'minimal', 'modular'],
        description: 'Standard FastAPI starter that defers features to RapidKit modules.',
      },
      {
        name: 'fastapi.ddd',
        display_name: 'FastAPI DDD Kit',
        category: 'fastapi',
        version: '0.1.0',
        tags: ['clean-architecture', 'ddd', 'fastapi', 'modular'],
        description: 'Opinionated FastAPI starter aligned with domain-driven design practices.',
      },
      {
        name: 'nestjs.standard',
        display_name: 'NestJS Standard Kit',
        category: 'nestjs',
        version: '0.1.0',
        tags: ['javascript', 'modular', 'nestjs', 'scalable', 'standard', 'typescript'],
        description:
          'Production-ready NestJS starter kit with modular RapidKit integration and TypeScript best practices.',
      },
    ];
  }
}
