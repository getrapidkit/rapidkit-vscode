/**
 * C02: BYOP Discovery Pipeline
 *
 * Automatically detect runtime, framework, topology, and entry points
 * from any backend repository, enabling import-first analysis for
 * unsupported stacks.
 *
 * Discovery sources (in priority order):
 * 1. detectFromPackageManager - package.json, pyproject.toml, go.mod, etc
 * 2. detectFromDockerfile - Extract base image and RUN commands
 * 3. detectFromEntryPoints - Find main.py, server.js, main.go, etc
 * 4. detectFromImports - Sample top-level imports in source files
 * 5. detectFromBuildConfig - Makefile, docker-compose.yml, tox.ini, etc
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types
// ============================================================================

export type RuntimeType = 'python' | 'nodejs' | 'go' | 'java' | 'ruby' | 'csharp' | 'unknown';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface DiscoverySignal {
  source: DiscoverySource;
  framework?: string;
  runtime?: RuntimeType;
  confidence?: number; // 0-1
  evidence?: string; // What file or pattern was matched
  reason?: string;
}

export type DiscoverySource =
  | 'packageManager'
  | 'dockerfile'
  | 'entryPoint'
  | 'imports'
  | 'buildConfig'
  | 'unknown';

export interface SignalSet {
  source: DiscoverySource;
  signals: DiscoverySignal[];
  timestamp: string; // ISO timestamp
}

export interface DiscoveryResult {
  projectPath: string;
  runtime: RuntimeType;
  framework?: string;
  version?: string;
  entryPoint?: string;
  confidenceLevel: ConfidenceLevel;
  reason: string; // Explanation of discovery process
  signalBreakdown: SignalSet[]; // All signals collected (for transparency)
  detectedAt: string; // ISO timestamp
}

export interface PartialTopology {
  serviceCount?: number;
  dataStoreTypes?: string[];
  apiFramework?: string;
  queue?: string;
}

// ============================================================================
// BYOP Discovery Engine
// ============================================================================

export class ByopDiscoveryEngine {
  private projectPath: string;
  private signals: SignalSet[] = [];

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * Main discovery method
   * Runs all detection sources and merges signals into final result
   */
  async discover(): Promise<DiscoveryResult> {
    this.signals = [];

    // Collect signals from all sources
    await Promise.all([
      this.detectFromPackageManager(),
      this.detectFromDockerfile(),
      this.detectFromEntryPoints(),
      this.detectFromImports(),
      this.detectFromBuildConfig(),
    ]);

    // Merge signals and determine runtime/framework
    const { runtime, framework, confidenceLevel, reason } = this.mergeSignals();

    return {
      projectPath: this.projectPath,
      runtime,
      framework,
      confidenceLevel,
      reason,
      signalBreakdown: this.signals,
      detectedAt: new Date().toISOString(),
    };
  }

  /**
   * Detect from package managers (npm, pip, go.mod, etc)
   */
  private async detectFromPackageManager(): Promise<void> {
    const signalSet: SignalSet = {
      source: 'packageManager',
      signals: [],
      timestamp: new Date().toISOString(),
    };

    // Check package.json (Node.js)
    const packageJsonPath = path.join(this.projectPath, 'package.json');
    if (this.fileExists(packageJsonPath)) {
      const packageJson = this.readJson(packageJsonPath);
      if (packageJson?.dependencies || packageJson?.devDependencies) {
        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
        };

        if (allDeps['fastapi']) {
          signalSet.signals.push({
            source: 'packageManager',
            runtime: 'nodejs',
            framework: 'fastapi',
            confidence: 0.95,
            evidence: 'package.json contains fastapi dependency',
          });
        }
        if (allDeps['@nestjs/core']) {
          signalSet.signals.push({
            source: 'packageManager',
            runtime: 'nodejs',
            framework: 'nestjs',
            confidence: 0.98,
            evidence: 'package.json contains @nestjs/core',
          });
        }
        if (allDeps['express']) {
          signalSet.signals.push({
            source: 'packageManager',
            runtime: 'nodejs',
            framework: 'express',
            confidence: 0.9,
            evidence: 'package.json contains express',
          });
        }
        if (allDeps['koa']) {
          signalSet.signals.push({
            source: 'packageManager',
            runtime: 'nodejs',
            framework: 'koa',
            confidence: 0.85,
            evidence: 'package.json contains koa',
          });
        }
        if (signalSet.signals.length === 0) {
          signalSet.signals.push({
            source: 'packageManager',
            runtime: 'nodejs',
            confidence: 0.7,
            evidence: 'package.json present, Node.js runtime detected',
          });
        }
      }
    }

    // Check pyproject.toml (Python)
    const pyprojectPath = path.join(this.projectPath, 'pyproject.toml');
    if (this.fileExists(pyprojectPath)) {
      const pyprojectContent = fs.readFileSync(pyprojectPath, 'utf-8');

      if (pyprojectContent.includes('fastapi')) {
        signalSet.signals.push({
          source: 'packageManager',
          runtime: 'python',
          framework: 'fastapi',
          confidence: 0.95,
          evidence: 'pyproject.toml contains fastapi',
        });
      }
      if (pyprojectContent.includes('django')) {
        signalSet.signals.push({
          source: 'packageManager',
          runtime: 'python',
          framework: 'django',
          confidence: 0.95,
          evidence: 'pyproject.toml contains django',
        });
      }
      if (pyprojectContent.includes('flask')) {
        signalSet.signals.push({
          source: 'packageManager',
          runtime: 'python',
          framework: 'flask',
          confidence: 0.9,
          evidence: 'pyproject.toml contains flask',
        });
      }
      if (signalSet.signals.length === 0) {
        signalSet.signals.push({
          source: 'packageManager',
          runtime: 'python',
          confidence: 0.7,
          evidence: 'pyproject.toml present, Python runtime detected',
        });
      }
    }

    // Check go.mod (Go)
    const goModPath = path.join(this.projectPath, 'go.mod');
    if (this.fileExists(goModPath)) {
      const goModContent = fs.readFileSync(goModPath, 'utf-8');

      if (goModContent.includes('github.com/gin-gonic/gin')) {
        signalSet.signals.push({
          source: 'packageManager',
          runtime: 'go',
          framework: 'gin',
          confidence: 0.95,
          evidence: 'go.mod contains github.com/gin-gonic/gin',
        });
      }
      if (goModContent.includes('github.com/labstack/echo')) {
        signalSet.signals.push({
          source: 'packageManager',
          runtime: 'go',
          framework: 'echo',
          confidence: 0.95,
          evidence: 'go.mod contains github.com/labstack/echo',
        });
      }
      if (goModContent.includes('github.com/valyala/fasthttp')) {
        signalSet.signals.push({
          source: 'packageManager',
          runtime: 'go',
          framework: 'fasthttp',
          confidence: 0.85,
          evidence: 'go.mod contains github.com/valyala/fasthttp',
        });
      }
      if (signalSet.signals.length === 0) {
        signalSet.signals.push({
          source: 'packageManager',
          runtime: 'go',
          confidence: 0.8,
          evidence: 'go.mod present, Go runtime detected',
        });
      }
    }

    if (signalSet.signals.length > 0) {
      this.signals.push(signalSet);
    }
  }

  /**
   * Detect from Dockerfile
   */
  private async detectFromDockerfile(): Promise<void> {
    const dockerfilePath = path.join(this.projectPath, 'Dockerfile');
    if (!this.fileExists(dockerfilePath)) {
      return;
    }

    const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf-8');
    const signalSet: SignalSet = {
      source: 'dockerfile',
      signals: [],
      timestamp: new Date().toISOString(),
    };

    // Extract base image
    const baseImageMatch = dockerfileContent.match(/FROM\s+([^\s:]+):?([^\s]*)/);
    if (baseImageMatch) {
      const baseImage = baseImageMatch[1];
      const version = baseImageMatch[2];

      if (baseImage.includes('python')) {
        signalSet.signals.push({
          source: 'dockerfile',
          runtime: 'python',
          confidence: 0.95,
          evidence: `Dockerfile base image: ${baseImage}:${version}`,
        });
      } else if (baseImage.includes('node')) {
        signalSet.signals.push({
          source: 'dockerfile',
          runtime: 'nodejs',
          confidence: 0.95,
          evidence: `Dockerfile base image: ${baseImage}:${version}`,
        });
      } else if (baseImage.includes('golang')) {
        signalSet.signals.push({
          source: 'dockerfile',
          runtime: 'go',
          confidence: 0.95,
          evidence: `Dockerfile base image: ${baseImage}:${version}`,
        });
      } else if (baseImage.includes('openjdk') || baseImage.includes('java')) {
        signalSet.signals.push({
          source: 'dockerfile',
          runtime: 'java',
          confidence: 0.95,
          evidence: `Dockerfile base image: ${baseImage}:${version}`,
        });
      } else if (baseImage.includes('ruby')) {
        signalSet.signals.push({
          source: 'dockerfile',
          runtime: 'ruby',
          confidence: 0.95,
          evidence: `Dockerfile base image: ${baseImage}:${version}`,
        });
      }
    }

    // Extract frameworks from RUN commands
    const runCommands = dockerfileContent.match(/RUN\s+(.+?)(?:\n|$)/g) || [];
    runCommands.forEach((cmd) => {
      if (cmd.includes('pip install fastapi') || cmd.includes('fastapi')) {
        signalSet.signals.push({
          source: 'dockerfile',
          framework: 'fastapi',
          confidence: 0.85,
          evidence: 'Dockerfile RUN command mentions fastapi',
        });
      }
      if (cmd.includes('npm install') && cmd.includes('@nestjs')) {
        signalSet.signals.push({
          source: 'dockerfile',
          framework: 'nestjs',
          confidence: 0.85,
          evidence: 'Dockerfile RUN command installs @nestjs packages',
        });
      }
    });

    if (signalSet.signals.length > 0) {
      this.signals.push(signalSet);
    }
  }

  /**
   * Detect from entry points (main.py, server.js, etc)
   */
  private async detectFromEntryPoints(): Promise<void> {
    const signalSet: SignalSet = {
      source: 'entryPoint',
      signals: [],
      timestamp: new Date().toISOString(),
    };

    // Check for Python entry points
    const pythonFiles = ['main.py', 'app.py', 'server.py', 'wsgi.py', 'run.py'];
    for (const file of pythonFiles) {
      const filePath = path.join(this.projectPath, file);
      if (this.fileExists(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        if (content.includes('FastAPI(')) {
          signalSet.signals.push({
            source: 'entryPoint',
            runtime: 'python',
            framework: 'fastapi',
            confidence: 0.95,
            evidence: `Found ${file} with FastAPI() instantiation`,
          });
          break;
        }
        if (content.includes('Flask(')) {
          signalSet.signals.push({
            source: 'entryPoint',
            runtime: 'python',
            framework: 'flask',
            confidence: 0.95,
            evidence: `Found ${file} with Flask() instantiation`,
          });
          break;
        }
        if (content.includes('django')) {
          signalSet.signals.push({
            source: 'entryPoint',
            runtime: 'python',
            framework: 'django',
            confidence: 0.85,
            evidence: `Found ${file} with Django references`,
          });
          break;
        }
      }
    }

    // Check for Node.js entry points
    const nodeFiles = ['server.js', 'index.js', 'app.js', 'main.js'];
    for (const file of nodeFiles) {
      const filePath = path.join(this.projectPath, file);
      if (this.fileExists(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        if (content.includes('NestFactory.create') || content.includes('@nestjs')) {
          signalSet.signals.push({
            source: 'entryPoint',
            runtime: 'nodejs',
            framework: 'nestjs',
            confidence: 0.95,
            evidence: `Found ${file} with NestJS patterns`,
          });
          break;
        }
        if (content.includes('express()') || content.includes('new express.Router')) {
          signalSet.signals.push({
            source: 'entryPoint',
            runtime: 'nodejs',
            framework: 'express',
            confidence: 0.95,
            evidence: `Found ${file} with Express patterns`,
          });
          break;
        }
      }
    }

    // Check for Go entry points
    const goFiles = ['main.go'];
    for (const file of goFiles) {
      const filePath = path.join(this.projectPath, file);
      if (this.fileExists(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        if (content.includes('github.com/gin-gonic/gin')) {
          signalSet.signals.push({
            source: 'entryPoint',
            runtime: 'go',
            framework: 'gin',
            confidence: 0.9,
            evidence: `Found ${file} with Gin framework`,
          });
          break;
        }
        if (content.includes('github.com/labstack/echo')) {
          signalSet.signals.push({
            source: 'entryPoint',
            runtime: 'go',
            framework: 'echo',
            confidence: 0.9,
            evidence: `Found ${file} with Echo framework`,
          });
          break;
        }
      }
    }

    if (signalSet.signals.length > 0) {
      this.signals.push(signalSet);
    }
  }

  /**
   * Detect from source file imports
   */
  private async detectFromImports(): Promise<void> {
    const signalSet: SignalSet = {
      source: 'imports',
      signals: [],
      timestamp: new Date().toISOString(),
    };

    // Sample imports from Python files
    const pythonDir = path.join(this.projectPath, 'src');
    if (fs.existsSync(pythonDir)) {
      const pyFiles = this.findFilesWithExtension(pythonDir, '.py', 5);
      for (const file of pyFiles.slice(0, 10)) {
        // Sample first 10 files
        const content = fs.readFileSync(file, 'utf-8');
        const imports = content.split('\n').slice(0, 50).join('\n'); // First 50 lines

        if (imports.includes('from fastapi import')) {
          signalSet.signals.push({
            source: 'imports',
            runtime: 'python',
            framework: 'fastapi',
            confidence: 0.9,
            evidence: `Found 'from fastapi import' in ${path.basename(file)}`,
          });
          break;
        }
        if (imports.includes('from flask import')) {
          signalSet.signals.push({
            source: 'imports',
            runtime: 'python',
            framework: 'flask',
            confidence: 0.9,
            evidence: `Found 'from flask import' in ${path.basename(file)}`,
          });
          break;
        }
      }
    }

    // Sample imports from Node.js files
    const srcDir = path.join(this.projectPath, 'src');
    if (fs.existsSync(srcDir)) {
      const tsFiles = this.findFilesWithExtension(srcDir, '.ts', 5);
      const jsFiles = this.findFilesWithExtension(srcDir, '.js', 5);
      const allFiles = [...tsFiles, ...jsFiles];

      for (const file of allFiles.slice(0, 10)) {
        const content = fs.readFileSync(file, 'utf-8');
        const imports = content.split('\n').slice(0, 50).join('\n');

        if (imports.includes('@nestjs/core')) {
          signalSet.signals.push({
            source: 'imports',
            runtime: 'nodejs',
            framework: 'nestjs',
            confidence: 0.9,
            evidence: `Found @nestjs/core import in ${path.basename(file)}`,
          });
          break;
        }
        if (imports.includes('express')) {
          signalSet.signals.push({
            source: 'imports',
            runtime: 'nodejs',
            framework: 'express',
            confidence: 0.75,
            evidence: `Found express import in ${path.basename(file)}`,
          });
          break;
        }
      }
    }

    if (signalSet.signals.length > 0) {
      this.signals.push(signalSet);
    }
  }

  /**
   * Detect from build config (Makefile, docker-compose.yml, tox.ini)
   */
  private async detectFromBuildConfig(): Promise<void> {
    const signalSet: SignalSet = {
      source: 'buildConfig',
      signals: [],
      timestamp: new Date().toISOString(),
    };

    // Check Makefile
    const makefilePath = path.join(this.projectPath, 'Makefile');
    if (this.fileExists(makefilePath)) {
      const makefileContent = fs.readFileSync(makefilePath, 'utf-8');
      if (makefileContent.includes('pytest') || makefileContent.includes('python')) {
        signalSet.signals.push({
          source: 'buildConfig',
          runtime: 'python',
          confidence: 0.7,
          evidence: 'Makefile contains python/pytest commands',
        });
      }
      if (makefileContent.includes('npm') || makefileContent.includes('yarn')) {
        signalSet.signals.push({
          source: 'buildConfig',
          runtime: 'nodejs',
          confidence: 0.7,
          evidence: 'Makefile contains npm/yarn commands',
        });
      }
    }

    // Check docker-compose.yml
    const dockerComposePath = path.join(this.projectPath, 'docker-compose.yml');
    if (this.fileExists(dockerComposePath)) {
      const dockerComposeContent = fs.readFileSync(dockerComposePath, 'utf-8');
      if (dockerComposeContent.includes('python')) {
        signalSet.signals.push({
          source: 'buildConfig',
          runtime: 'python',
          confidence: 0.7,
          evidence: 'docker-compose.yml contains python service',
        });
      }
      if (dockerComposeContent.includes('node')) {
        signalSet.signals.push({
          source: 'buildConfig',
          runtime: 'nodejs',
          confidence: 0.7,
          evidence: 'docker-compose.yml contains node service',
        });
      }
    }

    if (signalSet.signals.length > 0) {
      this.signals.push(signalSet);
    }
  }

  /**
   * Merge all signals and determine final runtime/framework
   */
  private mergeSignals(): {
    runtime: RuntimeType;
    framework?: string;
    confidenceLevel: ConfidenceLevel;
    reason: string;
  } {
    const runtimeVotes: Record<RuntimeType, number> = {
      python: 0,
      nodejs: 0,
      go: 0,
      java: 0,
      ruby: 0,
      csharp: 0,
      unknown: 0,
    };

    const frameworkVotes: Record<string, number> = {};
    let runtimeSignalCount = 0;

    // Count votes from all signals
    this.signals.forEach((signalSet) => {
      signalSet.signals.forEach((signal) => {
        if (signal.runtime) {
          runtimeVotes[signal.runtime] += signal.confidence ?? 0.5;
          runtimeSignalCount += 1;
        }
        if (signal.framework) {
          frameworkVotes[signal.framework] =
            (frameworkVotes[signal.framework] ?? 0) + (signal.confidence ?? 0.5);
        }
      });
    });

    // Determine winning runtime
    let maxRuntime: RuntimeType = 'unknown';
    let maxRuntimeScore = 0;
    Object.entries(runtimeVotes).forEach(([runtime, score]) => {
      if (score > maxRuntimeScore) {
        maxRuntimeScore = score;
        maxRuntime = runtime as RuntimeType;
      }
    });

    // Determine winning framework
    let framework: string | undefined = undefined;
    let maxFrameworkScore = 0;
    Object.entries(frameworkVotes).forEach(([fw, score]) => {
      if (score > maxFrameworkScore) {
        maxFrameworkScore = score;
        framework = fw;
      }
    });

    // Calculate confidence level
    let confidenceLevel: ConfidenceLevel = 'low';
    const averageConfidence = runtimeSignalCount > 0 ? maxRuntimeScore / runtimeSignalCount : 0;
    if (averageConfidence >= 0.8) {
      confidenceLevel = 'high';
    } else if (averageConfidence >= 0.5) {
      confidenceLevel = 'medium';
    } else {
      confidenceLevel = 'low';
    }

    // Build reason
    let reason = `Discovery completed with ${runtimeSignalCount} signals. `;
    if (maxRuntime !== 'unknown') {
      reason += `Runtime: ${maxRuntime} (confidence: ${confidenceLevel}).`;
    } else {
      reason += 'Runtime: Could not determine (defaulting to unknown).';
    }
    if (framework) {
      reason += ` Framework: ${framework}.`;
    }

    return {
      runtime: maxRuntime,
      framework,
      confidenceLevel,
      reason,
    };
  }

  /**
   * Helper: Check if file exists
   */
  private fileExists(filePath: string): boolean {
    try {
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  }

  /**
   * Helper: Read JSON file safely
   */
  private readJson(filePath: string): any {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Helper: Find files with given extension
   */
  private findFilesWithExtension(
    dir: string,
    ext: string,
    maxDepth: number,
    currentDepth: number = 0
  ): string[] {
    const files: string[] = [];

    if (currentDepth >= maxDepth) {
      return files;
    }

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isFile() && entry.name.endsWith(ext)) {
          files.push(fullPath);
        } else if (
          entry.isDirectory() &&
          !entry.name.startsWith('.') &&
          entry.name !== 'node_modules'
        ) {
          files.push(...this.findFilesWithExtension(fullPath, ext, maxDepth, currentDepth + 1));
        }
      }
    } catch {
      // Ignore directory read errors
    }

    return files;
  }
}
