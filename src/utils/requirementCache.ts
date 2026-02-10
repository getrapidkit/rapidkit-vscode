/**
 * Requirement Cache
 * Caches Python and Poetry availability checks to speed up workspace creation
 */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

interface PythonCheckResult {
  available: boolean;
  version?: string;
  versionNumber?: { major: number; minor: number };
  meetsMinimumVersion: boolean;
  command?: 'python3' | 'python';
  venvSupport: boolean;
  rapidkitCoreInstalled: boolean;
  error?: string;
  recommendation?: string;
}

class RequirementCache {
  private static instance: RequirementCache;
  private pythonCache: CacheEntry<PythonCheckResult> | null = null;
  private poetryCache: CacheEntry<boolean> | null = null;

  // Cache TTL: 5 minutes (300000 ms)
  private readonly TTL = 5 * 60 * 1000;

  private constructor() {}

  static getInstance(): RequirementCache {
    if (!RequirementCache.instance) {
      RequirementCache.instance = new RequirementCache();
    }
    return RequirementCache.instance;
  }

  /**
   * Get cached Python check result or null if expired/not cached
   */
  getCachedPythonCheck(): PythonCheckResult | null {
    if (!this.pythonCache) {
      return null;
    }

    const now = Date.now();
    const age = now - this.pythonCache.timestamp;

    if (age > this.TTL) {
      // Cache expired
      this.pythonCache = null;
      return null;
    }

    return this.pythonCache.value;
  }

  /**
   * Cache Python check result
   */
  cachePythonCheck(result: PythonCheckResult): void {
    this.pythonCache = {
      value: result,
      timestamp: Date.now(),
    };
  }

  /**
   * Get cached Poetry check result or null if expired/not cached
   */
  getCachedPoetryCheck(): boolean | null {
    if (!this.poetryCache) {
      return null;
    }

    const now = Date.now();
    const age = now - this.poetryCache.timestamp;

    if (age > this.TTL) {
      // Cache expired
      this.poetryCache = null;
      return null;
    }

    return this.poetryCache.value;
  }

  /**
   * Cache Poetry check result
   */
  cachePoetryCheck(result: boolean): void {
    this.poetryCache = {
      value: result,
      timestamp: Date.now(),
    };
  }

  /**
   * Invalidate all caches (force fresh check)
   */
  invalidateAll(): void {
    this.pythonCache = null;
    this.poetryCache = null;
  }

  /**
   * Invalidate Python cache only
   */
  invalidatePython(): void {
    this.pythonCache = null;
  }

  /**
   * Invalidate Poetry cache only
   */
  invalidatePoetry(): void {
    this.poetryCache = null;
  }

  /**
   * Get cache statistics (for debugging)
   */
  getStats(): {
    pythonCached: boolean;
    pythonAge?: number;
    poetryCached: boolean;
    poetryAge?: number;
  } {
    const now = Date.now();
    return {
      pythonCached: this.pythonCache !== null,
      pythonAge: this.pythonCache ? now - this.pythonCache.timestamp : undefined,
      poetryCached: this.poetryCache !== null,
      poetryAge: this.poetryCache ? now - this.poetryCache.timestamp : undefined,
    };
  }
}

export const requirementCache = RequirementCache.getInstance();
