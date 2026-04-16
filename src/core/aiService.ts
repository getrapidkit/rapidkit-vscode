/**
 * Workspai AI Service
 * Thin wrapper over VS Code Language Model API (vscode.lm).
 * Requires VS Code >= 1.90 and an active Copilot / compatible LLM subscription.
 */

import * as vscode from 'vscode';
import { execSync } from 'child_process';
import { Logger } from '../utils/logger';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIStreamChunk {
  text: string;
  done: boolean;
}

/**
 * Send messages to the LM and stream back text.
 * @param messages – conversation history
 * @param onChunk  – called with each streamed chunk
 * @param token    – cancellation token
 */
export async function streamAIResponse(
  messages: AIMessage[],
  onChunk: (chunk: AIStreamChunk) => void,
  token?: vscode.CancellationToken
): Promise<{ modelId: string }> {
  const logger = Logger.getInstance();

  let model: vscode.LanguageModelChat;
  let modelId: string;
  try {
    ({ model, modelId } = await selectModelWithPreference());
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

export interface AIModalContext {
  type: 'workspace' | 'project' | 'module';
  name: string;
  path?: string;
  framework?: string;
  moduleSlug?: string;
  moduleDescription?: string;
  prefillQuestion?: string;
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
  const empty: ScannedProjectContext = {
    kit: 'unknown',
    projectName: path.basename(projectPath),
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
  };

  if (!projectPath) {
    return empty;
  }

  const ctx = { ...empty };

  // ── helpers ────────────────────────────────────────────────────────────
  const exists = (rel: string) => {
    try {
      fs.accessSync(path.join(projectPath, rel));
      return true;
    } catch {
      return false;
    }
  };
  const readJSON = <T>(rel: string): T | null => {
    try {
      return JSON.parse(fs.readFileSync(path.join(projectPath, rel), 'utf8')) as T;
    } catch {
      return null;
    }
  };
  const readText = (rel: string): string | null => {
    try {
      return fs.readFileSync(path.join(projectPath, rel), 'utf8');
    } catch {
      return null;
    }
  };
  const listDir = (rel: string): string[] => {
    try {
      return fs.readdirSync(path.join(projectPath, rel));
    } catch {
      return [];
    }
  };

  // ── registry.json (installed modules) ─────────────────────────────────
  const registry =
    readJSON<{ installed_modules?: InstalledModule[] }>('registry.json') ??
    readJSON<{ installed_modules?: InstalledModule[] }>('.rapidkit/registry.json');
  if (registry?.installed_modules) {
    ctx.installedModules = registry.installed_modules;
  }

  // ── project layout ─────────────────────────────────────────────────────
  ctx.hasAlembic = exists('alembic') || exists('alembic.ini');
  ctx.hasDocker = exists('Dockerfile') || exists('docker-compose.yml');
  ctx.hasHealthDir = exists('src/health');
  ctx.hasDomainLayer = exists('src/app/domain');
  ctx.hasUseCasesDir = exists('src/app/application/use_cases');
  ctx.topLevelSrcDirs = listDir('src').filter(
    (n) => !n.startsWith('_') && !n.endsWith('.py') && !n.endsWith('.ts')
  );

  // config/*.yaml files
  try {
    ctx.configFiles = fs
      .readdirSync(path.join(projectPath, 'config'))
      .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
  } catch {
    /* no config dir */
  }

  ctx.envFile = exists('.env') ? '.env' : exists('.env.local') ? '.env.local' : null;

  // ── kit detection ───────────────────────────────────────────────────────
  if (framework === 'fastapi' || (!framework && exists('pyproject.toml'))) {
    ctx.kit = ctx.hasDomainLayer ? 'fastapi.ddd' : 'fastapi.standard';
    // extract pydantic, sqlalchemy, other prod deps from pyproject.toml
    const pyproj = readText('pyproject.toml') ?? '';
    const depSection = pyproj.split('[tool.poetry.dependencies]')[1]?.split('[')[0] ?? '';
    const deps: string[] = [];
    for (const line of depSection.split('\n')) {
      const m = line.match(/^([a-zA-Z0-9_-]+)\s*=/);
      if (m && m[1] !== 'python') {
        deps.push(m[1].toLowerCase());
      }
    }
    ctx.productionDeps = deps;
  } else if (framework === 'nestjs' || (!framework && exists('package.json'))) {
    ctx.kit = 'nestjs.standard';
    const pkg = readJSON<{ dependencies?: Record<string, string> }>('package.json');
    ctx.productionDeps = Object.keys(pkg?.dependencies ?? {});
  } else if (framework === 'go' || (!framework && exists('go.mod'))) {
    const gomod = readText('go.mod') ?? '';
    ctx.kit = gomod.toLowerCase().includes('gofiber') ? 'gofiber.standard' : 'gogin.standard';
  }

  return ctx;
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
export function fetchLiveModules(): LiveModuleEntry[] | null {
  const now = Date.now();
  if (_liveModulesCache && now - _liveModulesCache.fetchedAt < LIVE_MODULES_TTL_MS) {
    return _liveModulesCache.modules;
  }
  try {
    const raw = execSync('rapidkit modules list --json-schema 1', {
      timeout: 8000,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    // The CLI prints a preamble line ("🚀 RapidKit") before the JSON — strip it
    const jsonStart = raw.indexOf('{');
    if (jsonStart === -1) {
      return null;
    }
    const parsed = JSON.parse(raw.slice(jsonStart)) as { modules?: LiveModuleEntry[] };
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
      const slugs = mods.map((m) => m.slug).join('  ');
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
export function buildWorkspaiSystemPrompt(
  ctx: AIModalContext,
  scanned?: ScannedProjectContext
): string {
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

  // ─── 6. Instructions ──────────────────────────────────────────────────
  const instructions = `INSTRUCTIONS:
- Always generate code that fits exactly into the layer described above.
- When adding a FastAPI endpoint, put the router in the correct layer (presentation/api/routes/ for DDD, routing/ for Standard).
- When suggesting module installation: rapidkit add module <name>  (e.g. rapidkit add module redis  OR  npx rapidkit add module free/cache/redis)
- Inject points in FastAPI pyproject.toml: # <<<inject:poetry-dependencies>>>
- Inject points in NestJS AppModule: // <<<inject:module-imports>>>
- Never suggest raw HTTP exceptions inside domain or application layers — raise domain exceptions and map them in the presentation layer.
- For migrations: use "alembic revision --autogenerate && alembic upgrade head".
- Response language: match the user's query language (Persian → Persian, English → English).`;

  return [identity, kitSection, moduleSection, stdSection, stateSection, instructions]
    .filter(Boolean)
    .join('\n\n' + '─'.repeat(60) + '\n\n');
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
  const fw = ctx.framework;

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
  if (!scanned || ctx.type !== 'project') {
    return '';
  }

  const parts: string[] = [`CURRENT PROJECT STATE: ${scanned.projectName}`];
  parts.push(`  Kit:         ${scanned.kit}`);
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

  return parts.join('\n');
}

// ─── buildAIModalUserMessage ────────────────────────────────────────────────

/**
 * Build the user-facing message for an AI modal query.
 */
export function buildAIModalUserMessage(
  mode: 'debug' | 'ask',
  question: string,
  ctx: AIModalContext,
  scanned?: ScannedProjectContext
): string {
  const kitLabel = scanned?.kit ?? ctx.framework ?? ctx.type;
  const installedList = scanned?.installedModules.map((m) => m.slug).join(', ');
  const ctxHeader = [
    `[${ctx.type.toUpperCase()}] ${ctx.name}`,
    kitLabel && `Kit: ${kitLabel}`,
    ctx.path && `Path: ${ctx.path}`,
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

  const MODEL_MAP: Record<string, string[]> = {
    'gpt-4o': ['gpt-4o'],
    'gpt-4.1': ['gpt-4.1', 'gpt-4o'],
    'claude-sonnet-4-5': ['claude-sonnet-4-5', 'claude-3-5-sonnet'],
    'claude-3-7-sonnet': ['claude-3-7-sonnet', 'claude-sonnet-4-5'],
    'gpt-4o-mini': ['gpt-4o-mini', 'gpt-4o'],
  };

  // Preferred model requested explicitly
  if (pref !== 'auto' && MODEL_MAP[pref]) {
    for (const id of MODEL_MAP[pref]) {
      const [model] = await vscode.lm.selectChatModels({ id });
      if (model) {
        return { model, modelId: model.name ?? id };
      }
    }
  }

  // Auto: try quality order
  const autoOrder = [
    'claude-sonnet-4-6',
    'claude-sonnet-4-5',
    'claude-3-7-sonnet',
    'claude-3-5-sonnet',
    'gpt-4.1',
    'gpt-4o',
    'gpt-4o-mini',
    'copilot-gpt-4',
    'copilot-gpt-3.5-turbo',
  ];
  for (const id of autoOrder) {
    const [model] = await vscode.lm.selectChatModels({ id });
    if (model) {
      return { model, modelId: model.name ?? id };
    }
  }

  // Absolute fallback
  const all = await vscode.lm.selectChatModels();
  if (all.length > 0) {
    return { model: all[0], modelId: all[0].name ?? all[0].id };
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

/**
 * Parse the user's natural-language description into a structured creation plan.
 * Uses the LLM API (non-streaming) with a strict JSON system prompt.
 */
export async function parseCreationIntent(
  prompt: string,
  mode: 'workspace' | 'project',
  frameworkHint?: string,
  token?: vscode.CancellationToken
): Promise<{ plan: AICreationPlan; modelId: string }> {
  const liveModules = fetchLiveModules();
  const modulesSection = buildModuleListForPrompt(liveModules);

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

  const fw =
    (parsed.framework as AICreateFramework) ?? (frameworkHint as AICreateFramework) ?? 'fastapi';
  const plan: AICreationPlan = {
    type: mode,
    workspaceName: addWspSuffix(sanitizeKebab(parsed.workspaceName ?? 'my-workspace')),
    profile: parsed.profile ?? defaultProfile(fw),
    installMethod: parsed.installMethod ?? 'auto',
    framework: fw,
    kit:
      parsed.kit ??
      (fw === 'nestjs' ? 'nestjs.standard' : fw === 'go' ? 'gofiber.standard' : 'fastapi.standard'),
    projectName: sanitizeKebab(parsed.projectName ?? 'api'),
    suggestedModules: Array.isArray(parsed.suggestedModules)
      ? parsed.suggestedModules
      : ['free/essentials/settings'],
    description: parsed.description ?? prompt,
  };

  return { plan, modelId };
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
