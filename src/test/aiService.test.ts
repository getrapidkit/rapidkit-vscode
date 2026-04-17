import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const {
  mockSelectChatModels,
  mockPreferredModelGet,
  mockDetectRapidkitProject,
  mockModulesCatalogGetInstance,
  mockGetModulesCatalog,
} = vi.hoisted(() => ({
  mockSelectChatModels: vi.fn(),
  mockPreferredModelGet: vi.fn(),
  mockDetectRapidkitProject: vi.fn(),
  mockModulesCatalogGetInstance: vi.fn(),
  mockGetModulesCatalog: vi.fn(),
}));

vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: () => ({
      get: mockPreferredModelGet,
    }),
  },
  lm: {
    selectChatModels: mockSelectChatModels,
  },
  window: {
    createOutputChannel: () => ({
      appendLine: () => undefined,
      show: () => undefined,
      clear: () => undefined,
      dispose: () => undefined,
    }),
  },
  LanguageModelChatMessage: {
    User: (content: string) => ({ role: 'user', content }),
    Assistant: (content: string) => ({ role: 'assistant', content }),
  },
  LanguageModelTextPart: class {
    value: string;

    constructor(value: string) {
      this.value = value;
    }
  },
}));

vi.mock('../core/bridge/pythonRapidkit', () => ({
  detectRapidkitProject: mockDetectRapidkitProject,
}));

vi.mock('../core/modulesCatalogService', () => ({
  ModulesCatalogService: {
    getInstance: mockModulesCatalogGetInstance,
  },
}));

import {
  parseCreationIntent,
  prepareAIConversation,
  resetAIServiceCaches,
  selectModelWithPreference,
  streamAIResponse,
} from '../core/aiService';
import * as vscode from 'vscode';

describe('aiService', () => {
  let tempProjectPath: string;

  beforeEach(() => {
    vi.clearAllMocks();
    resetAIServiceCaches();
    mockPreferredModelGet.mockReturnValue('auto');
    mockDetectRapidkitProject.mockResolvedValue({ ok: false });
    mockGetModulesCatalog.mockResolvedValue({
      modules: [],
      source: 'fallback',
      catalog: null,
    });
    mockModulesCatalogGetInstance.mockReturnValue({
      getModulesCatalog: mockGetModulesCatalog,
    });
    tempProjectPath = fs.mkdtempSync(path.join(os.tmpdir(), 'workspai-ai-'));
  });

  afterEach(() => {
    fs.rmSync(tempProjectPath, { recursive: true, force: true });
  });

  it('prepares a shared AI conversation with scanned workspace context and memory', async () => {
    fs.mkdirSync(path.join(tempProjectPath, 'src', 'app', 'domain'), { recursive: true });
    fs.mkdirSync(path.join(tempProjectPath, '.rapidkit'), { recursive: true });

    fs.writeFileSync(
      path.join(tempProjectPath, 'pyproject.toml'),
      [
        '[tool.poetry]',
        'name = "demo-api"',
        '[tool.poetry.dependencies]',
        'python = "^3.12"',
        'fastapi = "^0.128.0"',
        'sqlalchemy = "^2.0.0"',
        'redis = "^5.0.0"',
      ].join('\n')
    );
    fs.writeFileSync(
      path.join(tempProjectPath, 'src', 'main.py'),
      'from fastapi import FastAPI\napp = FastAPI()\n'
    );
    fs.writeFileSync(
      path.join(tempProjectPath, 'registry.json'),
      JSON.stringify(
        {
          installed_modules: [
            {
              slug: 'free/auth/core',
              version: '1.0.0',
              display_name: 'Auth Core',
            },
          ],
        },
        null,
        2
      )
    );
    fs.writeFileSync(
      path.join(tempProjectPath, '.rapidkit', 'workspace-memory.json'),
      JSON.stringify(
        {
          context: 'B2B backend with strict domain boundaries',
          conventions: ['Use services through interfaces only'],
          decisions: ['PostgreSQL is the source of truth'],
          lastUpdated: '2026-04-17T00:00:00.000Z',
        },
        null,
        2
      )
    );

    const prepared = await prepareAIConversation('ask', 'Where should I add auth?', {
      type: 'workspace',
      name: 'demo-api',
      path: tempProjectPath,
      framework: 'fastapi',
    });

    expect(prepared.scanned?.kit).toBe('fastapi.ddd');
    expect(prepared.messages[0].content).toContain('CURRENT WORKSPACE STATE');
    expect(prepared.messages[0].content).toContain('WORKSPACE MEMORY');
    expect(prepared.messages[0].content).toContain('Use services through interfaces only');
    expect(prepared.messages[0].content).toContain('src/');
    expect(prepared.messages.at(-1)?.content).toContain('Installed modules: free/auth/core');
  });

  it('caches model selection for repeated AI requests', async () => {
    const model = {
      id: 'gpt-4o',
      name: 'GPT-4o',
      sendRequest: vi.fn(),
    };

    mockSelectChatModels.mockResolvedValue([model]);

    const first = await selectModelWithPreference();
    const second = await selectModelWithPreference();

    expect(first.modelId).toBe('GPT-4o');
    expect(second.modelId).toBe('GPT-4o');
    expect(mockSelectChatModels).toHaveBeenCalledTimes(1);
  });

  it('stops streaming when cancellation is requested mid-response', async () => {
    const model = {
      id: 'gpt-4o',
      name: 'GPT-4o',
      sendRequest: vi.fn(async () => ({
        stream: (async function* () {
          yield new vscode.LanguageModelTextPart('first chunk');
          yield new vscode.LanguageModelTextPart('second chunk');
        })(),
      })),
    };

    mockSelectChatModels.mockResolvedValue([model]);

    const mutableToken = { isCancellationRequested: false };
    const chunks: string[] = [];
    let done = 0;

    await streamAIResponse(
      [{ role: 'user', content: 'Explain this' }],
      (chunk) => {
        if (chunk.text) {
          chunks.push(chunk.text);
          mutableToken.isCancellationRequested = true;
        }
        if (chunk.done) {
          done += 1;
        }
      },
      mutableToken as unknown as vscode.CancellationToken
    );

    expect(chunks).toEqual(['first chunk']);
    expect(done).toBe(1);
  });

  it('uses project-detect contract to resolve the canonical project root and kit', async () => {
    const workspaceRoot = path.join(tempProjectPath, 'workspace-root');
    const projectRoot = path.join(workspaceRoot, 'node-app');
    fs.mkdirSync(path.join(projectRoot, '.rapidkit'), { recursive: true });
    fs.writeFileSync(
      path.join(projectRoot, '.rapidkit', 'project.json'),
      JSON.stringify({ runtime: 'node', kit_name: 'nestjs.standard' }, null, 2)
    );
    fs.writeFileSync(
      path.join(projectRoot, '.rapidkit', 'context.json'),
      JSON.stringify({ engine: 'npm' }, null, 2)
    );
    fs.mkdirSync(path.join(projectRoot, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(projectRoot, 'package.json'),
      JSON.stringify({ dependencies: { '@nestjs/core': '^11.0.0' } }, null, 2)
    );
    fs.writeFileSync(path.join(projectRoot, 'src', 'main.ts'), 'console.log("boot")\n', {
      flag: 'w',
    });

    mockDetectRapidkitProject.mockResolvedValue({
      ok: true,
      data: {
        schema_version: 1,
        input: workspaceRoot,
        confidence: 'strong',
        isRapidkitProject: true,
        projectRoot,
        engine: 'node',
        markers: {},
      },
    });

    const prepared = await prepareAIConversation('ask', 'Explain this service', {
      type: 'workspace',
      name: 'workspace-root',
      path: workspaceRoot,
    });

    expect(prepared.scanned?.projectRoot).toBe(projectRoot);
    expect(prepared.scanned?.kit).toBe('nestjs.standard');
    expect(prepared.messages[0].content).toContain(`Root:        ${projectRoot}`);
    expect(prepared.messages[0].content).toContain('Engine:      node');
    expect(prepared.messages[0].content).toContain('Detection:   strong');
  });

  it('uses the workspace-aware modules catalog when parsing creation intent', async () => {
    const model = {
      id: 'gpt-4o',
      name: 'GPT-4o',
      sendRequest: vi.fn(async (messages: Array<{ content: string }>) => ({
        stream: (async function* () {
          yield new vscode.LanguageModelTextPart(
            JSON.stringify({
              workspaceName: 'billing-suite',
              profile: 'python-only',
              installMethod: 'auto',
              framework: 'fastapi',
              kit: 'fastapi.standard',
              projectName: 'billing-api',
              suggestedModules: ['free/essentials/settings', 'pro/billing/invoices'],
              description: 'Billing APIs for subscription management.',
            })
          );
        })(),
      })),
    };

    mockGetModulesCatalog.mockResolvedValue({
      modules: [
        {
          id: 'invoices',
          name: 'Invoices',
          version: '2.3.0',
          category: 'billing',
          icon: 'x',
          description: 'Invoice workflows',
          status: 'stable',
          tags: ['payments', 'finance'],
          slug: 'pro/billing/invoices',
        },
      ],
      source: 'live',
      catalog: null,
    });
    mockSelectChatModels.mockResolvedValue([model]);

    await parseCreationIntent(
      'Create a billing workspace with invoices',
      'workspace',
      'fastapi',
      tempProjectPath
    );

    expect(mockGetModulesCatalog).toHaveBeenCalledWith(tempProjectPath);
    const systemPrompt = model.sendRequest.mock.calls[0][0][0].content;
    expect(systemPrompt).toContain('pro/billing/invoices');
    expect(systemPrompt).toContain('v2.3.0');
  });

  it('sanitizes invalid AI creation fields and keeps only allowed module slugs', async () => {
    const model = {
      id: 'gpt-4o',
      name: 'GPT-4o',
      sendRequest: vi.fn(async () => ({
        stream: (async function* () {
          yield new vscode.LanguageModelTextPart(
            JSON.stringify({
              workspaceName: '%%% Weird Workspace ###',
              profile: 'random-profile',
              installMethod: 'invalid-install',
              framework: 'django',
              kit: 'nestjs.standard',
              projectName: '*** API ###',
              suggestedModules: [
                'free/essentials/settings',
                'unknown/foo/bar',
                'pro/billing/invoices',
                'not-a-slug',
              ],
              description: '   Build a robust billing API   ',
            })
          );
        })(),
      })),
    };

    mockGetModulesCatalog.mockResolvedValue({
      modules: [
        {
          id: 'settings',
          name: 'Settings',
          version: '1.0.0',
          category: 'essentials',
          icon: 'x',
          description: 'Settings module',
          status: 'stable',
          tags: [],
          slug: 'free/essentials/settings',
        },
        {
          id: 'invoices',
          name: 'Invoices',
          version: '2.3.0',
          category: 'billing',
          icon: 'x',
          description: 'Invoice workflows',
          status: 'stable',
          tags: ['payments'],
          slug: 'pro/billing/invoices',
        },
      ],
      source: 'live',
      catalog: null,
    });
    mockSelectChatModels.mockResolvedValue([model]);

    const { plan } = await parseCreationIntent(
      'Generate a billing service',
      'workspace',
      'fastapi',
      tempProjectPath
    );

    expect(plan.framework).toBe('fastapi');
    expect(plan.kit).toBe('fastapi.standard');
    expect(plan.profile).toBe('python-only');
    expect(plan.installMethod).toBe('auto');
    expect(plan.workspaceName).toBe('weird-workspace-wsp');
    expect(plan.projectName).toBe('api');
    expect(plan.suggestedModules).toEqual(['free/essentials/settings', 'pro/billing/invoices']);
    expect(plan.description).toBe('Build a robust billing API');
  });

  it('resolves legacy preferred model aliases to currently available models', async () => {
    mockPreferredModelGet.mockReturnValue('claude-3-7-sonnet');

    const legacyMappedModel = {
      id: 'anthropic.claude-sonnet-4-6',
      name: 'Claude Sonnet 4.6',
      sendRequest: vi.fn(),
    };

    mockSelectChatModels.mockResolvedValue([legacyMappedModel]);

    const selected = await selectModelWithPreference();

    expect(selected.model).toBe(legacyMappedModel);
    expect(selected.modelId).toBe('Claude Sonnet 4.6');
    expect(mockSelectChatModels).toHaveBeenCalledTimes(1);
  });

  it('auto-corrects near-miss module slug typos in AI creation output', async () => {
    const model = {
      id: 'gpt-4o',
      name: 'GPT-4o',
      sendRequest: vi.fn(async () => ({
        stream: (async function* () {
          yield new vscode.LanguageModelTextPart(
            JSON.stringify({
              workspaceName: 'catalog',
              profile: 'python-only',
              installMethod: 'auto',
              framework: 'fastapi',
              kit: 'fastapi.standard',
              projectName: 'catalog-api',
              suggestedModules: ['free/security/rate-limitng'],
              description: 'Catalog API with rate limiting.',
            })
          );
        })(),
      })),
    };

    mockGetModulesCatalog.mockResolvedValue({
      modules: [
        {
          id: 'rate_limiting',
          name: 'Rate Limiting',
          version: '1.0.0',
          category: 'security',
          icon: 'x',
          description: 'Rate limiter module',
          status: 'stable',
          tags: [],
          slug: 'free/security/rate_limiting',
        },
        {
          id: 'settings',
          name: 'Settings',
          version: '1.0.0',
          category: 'essentials',
          icon: 'x',
          description: 'Settings module',
          status: 'stable',
          tags: [],
          slug: 'free/essentials/settings',
        },
      ],
      source: 'live',
      catalog: null,
    });
    mockSelectChatModels.mockResolvedValue([model]);

    const { plan } = await parseCreationIntent(
      'Create a catalog api with throttling',
      'workspace',
      'fastapi',
      tempProjectPath
    );

    expect(plan.suggestedModules).toContain('free/security/rate_limiting');
    expect(plan.suggestedModules).toContain('free/essentials/settings');
  });
});
