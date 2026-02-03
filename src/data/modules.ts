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
    name: 'AI Assistant',
    version: '0.1.7',
    category: 'ai',
    icon: '🤖',
    description: 'AI-powered assistant integration for intelligent features',
    status: 'stable',
    slug: 'free/ai/ai_assistant',
  },

  // Auth Modules
  {
    id: 'api_keys',
    name: 'API Keys',
    version: '0.1.0',
    category: 'auth',
    icon: '🔑',
    description: 'API key issuance, verification, and auditing',
    status: 'stable',
    slug: 'free/auth/api_keys',
  },
  {
    id: 'auth_core',
    name: 'Authentication Core',
    version: '0.1.0',
    category: 'auth',
    icon: '🔐',
    description: 'Password hashing, token signing, and runtime auth',
    status: 'stable',
    slug: 'free/auth/core',
  },
  {
    id: 'oauth_providers',
    name: 'OAuth Providers',
    version: '0.1.0',
    category: 'auth',
    icon: '🔗',
    description: 'Lightweight OAuth 2.0 scaffold with provider registry',
    status: 'stable',
    slug: 'free/auth/oauth',
  },
  {
    id: 'passwordless_auth',
    name: 'Passwordless Authentication',
    version: '0.1.0',
    category: 'auth',
    icon: '✉️',
    description: 'Magic link and one-time code authentication helpers',
    status: 'stable',
    slug: 'free/auth/passwordless',
  },
  {
    id: 'session_management',
    name: 'Session Management',
    version: '0.1.0',
    category: 'auth',
    icon: '🎫',
    description: 'Opinionated session management with signed tokens',
    status: 'stable',
    slug: 'free/auth/session',
  },

  // Billing Modules
  {
    id: 'cart',
    name: 'Cart',
    version: '0.1.4',
    category: 'billing',
    icon: '🛒',
    description: 'Shopping cart service for checkout flows',
    status: 'stable',
    slug: 'free/billing/cart',
  },
  {
    id: 'inventory',
    name: 'Inventory',
    version: '0.1.4',
    category: 'billing',
    icon: '📦',
    description: 'Inventory and pricing service backing Cart + Stripe',
    status: 'stable',
    slug: 'free/billing/inventory',
  },
  {
    id: 'stripe_payment',
    name: 'Stripe Payment',
    version: '0.1.0',
    category: 'billing',
    icon: '💳',
    description: 'Stripe payments and subscription management',
    status: 'stable',
    slug: 'free/billing/stripe_payment',
  },

  // Business Modules
  {
    id: 'storage',
    name: 'Storage',
    version: '0.1.0',
    category: 'business',
    icon: '📁',
    description: 'File storage & media management - Upload, store, and retrieve',
    status: 'stable',
    slug: 'free/business/storage',
  },

  // Cache Modules
  {
    id: 'redis',
    name: 'Redis Cache',
    version: '0.1.8',
    category: 'cache',
    icon: '🔴',
    description: 'Production Redis runtime with async and sync client',
    status: 'stable',
    slug: 'free/cache/redis',
  },

  // Communication Modules
  {
    id: 'email',
    name: 'Email',
    version: '0.1.10',
    category: 'communication',
    icon: '📧',
    description: 'Email delivery with SMTP support',
    status: 'stable',
    slug: 'free/communication/email',
  },
  {
    id: 'notifications',
    name: 'Unified Notifications',
    version: '0.1.17',
    category: 'communication',
    icon: '🔔',
    description: 'Email-first notification runtime offering SMTP delivery',
    status: 'stable',
    slug: 'free/communication/notifications',
  },

  // Database Modules
  {
    id: 'db_mongo',
    name: 'MongoDB',
    version: '0.1.2',
    category: 'database',
    icon: '🍃',
    description: 'MongoDB integration with async driver support and health diagnostics',
    status: 'stable',
    slug: 'free/database/db_mongo',
  },
  {
    id: 'db_sqlite',
    name: 'SQLite',
    version: '0.1.3',
    category: 'database',
    icon: '💾',
    description: 'SQLite database integration for development',
    status: 'stable',
    slug: 'free/database/db_sqlite',
  },
  {
    id: 'db_postgres',
    name: 'PostgreSQL',
    version: '0.1.24',
    category: 'database',
    icon: '🐘',
    description: 'SQLAlchemy async+sync Postgres with clean DI and health checks',
    status: 'stable',
    slug: 'free/database/db_postgres',
  },

  // Essentials Modules
  {
    id: 'settings',
    name: 'Application Settings',
    version: '0.1.32',
    category: 'essentials',
    icon: '⚙️',
    description: 'Centralized modular configuration management using Pydantic',
    status: 'stable',
    slug: 'free/essentials/settings',
  },
  {
    id: 'deployment',
    name: 'Deployment Toolkit',
    version: '0.1.3',
    category: 'essentials',
    icon: '🚀',
    description: 'Portable Docker, Compose, Makefile, and CI assets for RapidKit',
    status: 'stable',
    slug: 'free/essentials/deployment',
  },
  {
    id: 'middleware',
    name: 'Middleware',
    version: '0.1.13',
    category: 'essentials',
    icon: '🔗',
    description: 'HTTP middleware pipeline with FastAPI and NestJS support',
    status: 'stable',
    slug: 'free/essentials/middleware',
  },
  {
    id: 'logging',
    name: 'Structured Logging & Observability',
    version: '0.1.2',
    category: 'essentials',
    icon: '📝',
    description: 'Structured logging runtime with correlation IDs and multi-sink',
    status: 'stable',
    slug: 'free/essentials/logging',
  },

  // Observability Modules
  {
    id: 'observability_core',
    name: 'Observability Core',
    version: '0.1.10',
    category: 'observability',
    icon: '📊',
    description: 'Cohesive metrics, tracing, and structured logging foundation',
    status: 'stable',
    slug: 'free/observability/core',
  },

  // Security Modules
  {
    id: 'cors',
    name: 'CORS',
    version: '0.1.0',
    category: 'security',
    icon: '🌐',
    description: 'Cross-Origin Resource Sharing security module',
    status: 'stable',
    slug: 'free/security/cors',
  },
  {
    id: 'rate_limiting',
    name: 'Rate Limiting',
    version: '0.1.0',
    category: 'security',
    icon: '⏱️',
    description: 'Production request throttling with configurable rules',
    status: 'stable',
    slug: 'free/security/rate_limiting',
  },
  {
    id: 'security_headers',
    name: 'Security Headers',
    version: '0.1.0',
    category: 'security',
    icon: '🛡️',
    description: 'Harden HTTP responses with industry-standard security headers',
    status: 'stable',
    slug: 'free/security/security_headers',
  },

  // Tasks Modules
  {
    id: 'celery',
    name: 'Celery',
    version: '0.1.1',
    category: 'tasks',
    icon: '⚡',
    description: 'Production Celery task orchestration for asynchronous jobs',
    status: 'stable',
    slug: 'free/tasks/celery',
  },

  // Users Modules
  {
    id: 'users_core',
    name: 'Users Core',
    version: '0.1.0',
    category: 'users',
    icon: '👥',
    description: 'Opinionated user management backbone that ships immutable',
    status: 'stable',
    slug: 'free/users/users_core',
  },
  {
    id: 'users_profiles',
    name: 'Users Profiles',
    version: '0.1.0',
    category: 'users',
    icon: '👤',
    description: 'Extends the Users Core module with rich profile modelling',
    status: 'stable',
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
