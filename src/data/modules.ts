/**
 * RapidKit Modules Data
 * Source: core/src/modules/free
 */

export interface ModuleData {
  id: string;
  name: string;
  version: string;
  category: string;
  icon: string;
  description: string;
  status: 'stable' | 'beta' | 'experimental';
  dependencies?: string[];
  tags?: string[];
  slug: string; // Full slug like "free/auth/oauth"
}

export const MODULES: ModuleData[] = [
  // AI Modules
  {
    id: 'ai_assistant',
    name: 'Ai Assistant',
    version: '0.1.7',
    category: 'ai',
    icon: '🤖',
    description: 'Provider-agnostic...',
    status: 'stable',
    tags: ['ai', 'core'],
    slug: 'free/ai/ai_assistant',
  },

  // Authentication Modules
  {
    id: 'api_keys',
    name: 'API Keys',
    version: '0.1.0',
    category: 'auth',
    icon: '🔐',
    description: 'Deterministic API key issuance, verification, and auditing',
    status: 'stable',
    tags: ['api-keys', 'auditing', 'auth', 'security'],
    slug: 'free/auth/api_keys',
  },

  {
    id: 'auth_core',
    name: 'Authentication Core',
    version: '0.1.0',
    category: 'auth',
    icon: '🔐',
    description: 'Opinionated password hashing, token signing, and runtime ...',
    status: 'stable',
    tags: ['auth', 'passwords', 'security', 'tokens'],
    slug: 'free/auth/core',
  },

  {
    id: 'oauth',
    name: 'OAuth Providers',
    version: '0.1.0',
    category: 'auth',
    icon: '🔐',
    description: 'Lightweight OAuth 2.0 scaffolding with provider registry,...',
    status: 'stable',
    tags: ['auth'],
    slug: 'free/auth/oauth',
  },

  {
    id: 'passwordless',
    name: 'Passwordless Authentication',
    version: '0.1.0',
    category: 'auth',
    icon: '🔐',
    description: 'Magic link and one-time code authentication helpers for f...',
    status: 'stable',
    tags: ['auth'],
    slug: 'free/auth/passwordless',
  },

  {
    id: 'session',
    name: 'Session Management',
    version: '0.1.0',
    category: 'auth',
    icon: '🔐',
    description: 'Opinionated session management utilities offering signed ...',
    status: 'stable',
    tags: ['auth'],
    slug: 'free/auth/session',
  },

  // Billing Modules
  {
    id: 'cart',
    name: 'Cart',
    version: '0.1.4',
    category: 'billing',
    icon: '💳',
    description: 'Shopping cart service for checkout flows',
    status: 'stable',
    tags: ['billing', 'cart'],
    slug: 'free/billing/cart',
  },

  {
    id: 'inventory',
    name: 'Inventory',
    version: '0.1.5',
    category: 'billing',
    icon: '💳',
    description: 'Inventory and pricing service backing Cart + Stripe',
    status: 'stable',
    tags: ['billing', 'inventory'],
    slug: 'free/billing/inventory',
  },

  {
    id: 'stripe_payment',
    name: 'Stripe Payment',
    version: '0.1.0',
    category: 'billing',
    icon: '💳',
    description: 'Stripe payments and subscriptions',
    status: 'stable',
    tags: ['billing', 'stripe-payment'],
    slug: 'free/billing/stripe_payment',
  },

  // Business Modules
  {
    id: 'storage',
    name: 'Storage',
    version: '0.1.0',
    category: 'business',
    icon: '💼',
    description: 'File Storage & Media Management Module - Upload, store, a...',
    status: 'stable',
    tags: ['business', 'file-upload', 'gcs', 'media-management', 's3', 'storage'],
    slug: 'free/business/storage',
  },

  // Cache Modules
  {
    id: 'redis',
    name: 'Redis Cache',
    version: '0.1.8',
    category: 'cache',
    icon: '🔴',
    description: 'Production-ready Redis runtime with async and sync client...',
    status: 'stable',
    tags: ['cache', 'datastore', 'redis'],
    slug: 'free/cache/redis',
  },

  // Communication Modules
  {
    id: 'email',
    name: 'Email',
    version: '0.1.10',
    category: 'communication',
    icon: '📧',
    description: '',
    status: 'stable',
    tags: ['communication', 'email', 'marketing', 'transactional'],
    slug: 'free/communication/email',
  },

  {
    id: 'notifications',
    name: 'Unified Notifications',
    version: '0.1.17',
    category: 'communication',
    icon: '📧',
    description: 'Email-first notifications runtime offering SMTP delivery,...',
    status: 'stable',
    tags: ['communication', 'email', 'notifications'],
    slug: 'free/communication/notifications',
  },

  // Database Modules
  {
    id: 'db_mongo',
    name: 'Db Mongo',
    version: '0.1.2',
    category: 'database',
    icon: '🗄️',
    description: 'MongoDB integration with async driver support, health dia...',
    status: 'stable',
    tags: ['database', 'db-mongo'],
    slug: 'free/database/db_mongo',
  },

  {
    id: 'db_sqlite',
    name: 'Db Sqlite',
    version: '0.1.3',
    category: 'database',
    icon: '🗄️',
    description: 'SQLite database integration for development',
    status: 'stable',
    tags: ['database', 'db-sqlite'],
    slug: 'free/database/db_sqlite',
  },

  {
    id: 'db_postgres',
    name: 'PostgreSQL',
    version: '0.1.24',
    category: 'database',
    icon: '🗄️',
    description: 'SQLAlchemy async+sync Postgres with clean DI, healthcheck...',
    status: 'stable',
    tags: ['asyncpg', 'connection-pool', 'database', 'postgresql', 'sqlalchemy'],
    slug: 'free/database/db_postgres',
  },

  // Essentials Modules
  {
    id: 'settings',
    name: 'Application Settings',
    version: '0.1.32',
    category: 'essentials',
    icon: '🏗️',
    description: 'Centralized, modular configuration management using Pydan...',
    status: 'stable',
    tags: ['config', 'env', 'settings'],
    slug: 'free/essentials/settings',
  },

  {
    id: 'deployment',
    name: 'Deployment Toolkit',
    version: '0.1.3',
    category: 'essentials',
    icon: '🏗️',
    description: 'Portable Docker, Compose, Makefile, and CI assets for Rap...',
    status: 'stable',
    tags: ['deployment', 'devops', 'essentials'],
    slug: 'free/essentials/deployment',
  },

  {
    id: 'middleware',
    name: 'Middleware',
    version: '0.1.13',
    category: 'essentials',
    icon: '🏗️',
    description: 'HTTP middleware pipeline with FastAPI and NestJS support.',
    status: 'stable',
    tags: ['essentials', 'http', 'middleware'],
    slug: 'free/essentials/middleware',
  },

  {
    id: 'logging',
    name: 'Structured Logging & Observability',
    version: '0.1.2',
    category: 'essentials',
    icon: '🏗️',
    description: 'Structured logging runtime with correlation IDs, multi-si...',
    status: 'stable',
    tags: ['logging', 'observability', 'tracing'],
    slug: 'free/essentials/logging',
  },

  // Observability Modules
  {
    id: 'observability_core',
    name: 'Observability Core',
    version: '0.1.10',
    category: 'observability',
    icon: '📊',
    description: 'Cohesive metrics, tracing, and structured logging foundat...',
    status: 'stable',
    tags: ['logging', 'metrics', 'observability', 'telemetry', 'tracing'],
    slug: 'free/observability/core',
  },

  // Security Modules
  {
    id: 'cors',
    name: 'Cors',
    version: '0.1.0',
    category: 'security',
    icon: '🛡️',
    description: 'Cross-Origin Resource Sharing security module',
    status: 'stable',
    tags: ['security'],
    slug: 'free/security/cors',
  },

  {
    id: 'rate_limiting',
    name: 'Rate Limiting',
    version: '0.1.0',
    category: 'security',
    icon: '🛡️',
    description: 'Production-grade request throttling with configurable rul...',
    status: 'stable',
    tags: ['rate-limiting', 'security', 'throttling'],
    slug: 'free/security/rate_limiting',
  },

  {
    id: 'security_headers',
    name: 'Security Headers',
    version: '0.1.0',
    category: 'security',
    icon: '🛡️',
    description: 'Harden HTTP responses with industry-standard security hea...',
    status: 'stable',
    tags: ['security', 'security-headers'],
    slug: 'free/security/security_headers',
  },

  // Tasks Modules
  {
    id: 'celery',
    name: 'Celery',
    version: '0.1.1',
    category: 'tasks',
    icon: '⚡',
    description: 'Production-ready Celery task orchestration for asynchrono...',
    status: 'stable',
    tags: ['async', 'queue', 'tasks'],
    slug: 'free/tasks/celery',
  },

  // Users Modules
  {
    id: 'users_core',
    name: 'Users Core',
    version: '0.1.0',
    category: 'users',
    icon: '👥',
    description: 'Opinionated user management backbone that ships immutable...',
    status: 'stable',
    tags: ['application', 'domain', 'users'],
    slug: 'free/users/users_core',
  },

  {
    id: 'users_profiles',
    name: 'Users Profiles',
    version: '0.1.0',
    category: 'users',
    icon: '👥',
    description: 'Extends the Users Core module with rich profile modelling...',
    status: 'stable',
    tags: ['personalization', 'user_profiles', 'users'],
    slug: 'free/users/users_profiles',
  },
];

export const CATEGORY_INFO = {
  ai: { name: 'AI', color: '#9B59B6', icon: '🤖' },
  auth: { name: 'Authentication', color: '#F59E0B', icon: '🔐' },
  billing: { name: 'Billing', color: '#E91E63', icon: '💳' },
  business: { name: 'Business', color: '#FF6B6B', icon: '💼' },
  cache: { name: 'Cache', color: '#CB3837', icon: '🔴' },
  communication: { name: 'Communication', color: '#4ECDC4', icon: '📧' },
  database: { name: 'Database', color: '#3775A9', icon: '🗄️' },
  essentials: { name: 'Essentials', color: '#2196F3', icon: '🏗️' },
  observability: { name: 'Observability', color: '#10B981', icon: '📊' },
  security: { name: 'Security', color: '#F59E0B', icon: '🛡️' },
  tasks: { name: 'Tasks', color: '#8E44AD', icon: '⚡' },
  users: { name: 'Users', color: '#3498DB', icon: '👥' },
};

export function getModulesByCategory(category: string): ModuleData[] {
  if (category === 'all') {
    return MODULES;
  }
  return MODULES.filter((m) => m.category === category);
}

export function getCategories(): string[] {
  return Array.from(new Set(MODULES.map((m) => m.category)));
}

export function getTotalModuleCount(): number {
  return MODULES.length;
}
