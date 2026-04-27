import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createChatParticipantMock,
  collectDebugPrefillQuestionMock,
  prepareAIConversationMock,
  resolvePreferredAIModalContextMock,
  streamAIResponseMock,
} = vi.hoisted(() => ({
  createChatParticipantMock: vi.fn(),
  collectDebugPrefillQuestionMock: vi.fn(),
  prepareAIConversationMock: vi.fn(),
  resolvePreferredAIModalContextMock: vi.fn(),
  streamAIResponseMock: vi.fn(),
}));

vi.mock('vscode', () => {
  class ThemeIcon {
    id: string;
    constructor(id: string) {
      this.id = id;
    }
  }

  class ChatRequestTurn {
    prompt: string;
    constructor(prompt: string) {
      this.prompt = prompt;
    }
  }

  class ChatResponseMarkdownPart {
    value: { value: string };
    constructor(value: string) {
      this.value = { value };
    }
  }

  class ChatResponseTurn {
    response: unknown[];
    constructor(response: unknown[]) {
      this.response = response;
    }
  }

  return {
    chat: {
      createChatParticipant: createChatParticipantMock,
    },
    window: {
      activeTextEditor: undefined,
    },
    workspace: {
      workspaceFolders: [{ name: 'demo-workspace', uri: { fsPath: '/tmp/demo-workspace' } }],
    },
    ThemeIcon,
    ChatRequestTurn,
    ChatResponseTurn,
    ChatResponseMarkdownPart,
  };
});

vi.mock('../core/aiService', () => ({
  prepareAIConversation: prepareAIConversationMock,
  streamAIResponse: streamAIResponseMock,
}));

vi.mock('../core/aiContextResolver', () => ({
  resolvePreferredAIModalContext: resolvePreferredAIModalContextMock,
}));

vi.mock('../commands/aiDebugger', () => ({
  collectDebugPrefillQuestion: collectDebugPrefillQuestionMock,
}));

import { registerWorkspaiChatParticipant } from '../commands/chatParticipant';

describe('chatParticipant', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    createChatParticipantMock.mockImplementation((_id: string, handler: unknown) => ({
      handler,
      iconPath: undefined,
      followupProvider: undefined,
      dispose: vi.fn(),
    }));

    collectDebugPrefillQuestionMock.mockReturnValue('Error: db connection refused');
    resolvePreferredAIModalContextMock.mockResolvedValue({
      type: 'workspace',
      name: 'demo-workspace',
      path: '/tmp/demo-workspace',
      workspaceRootPath: '/tmp/demo-workspace',
    });

    prepareAIConversationMock.mockResolvedValue({
      messages: [{ role: 'user', content: 'test' }],
      scanned: { projectRoot: '/tmp/demo-workspace' },
    });

    streamAIResponseMock.mockImplementation(
      async (_messages: unknown, onChunk: (chunk: { text?: string }) => void) => {
        onChunk({ text: 'AI answer' });
      }
    );
  });

  it('registers participant with expected id and icon', () => {
    const context = { subscriptions: [] as { dispose: () => void }[] };

    registerWorkspaiChatParticipant(context as any);

    expect(createChatParticipantMock).toHaveBeenCalledWith(
      'workspai.assistant',
      expect.any(Function)
    );
    expect(context.subscriptions).toHaveLength(1);

    const participant = context.subscriptions[0] as unknown as { iconPath: { id: string } };
    expect(participant.iconPath.id).toBe('sparkle');
  });

  it('returns empty ask guidance for blank prompt', async () => {
    const context = { subscriptions: [] as { dispose: () => void }[] };
    registerWorkspaiChatParticipant(context as any);

    const participant = context.subscriptions[0] as unknown as {
      handler: Function;
    };

    const markdown = vi.fn();
    const stream = {
      markdown,
      progress: vi.fn(),
      button: vi.fn(),
    };

    await participant.handler({ prompt: '   ', command: 'ask' }, { history: [] }, stream, {
      isCancellationRequested: false,
    });

    expect(markdown).toHaveBeenCalledWith(
      'Ask me anything about your Workspai project — architecture, modules, configuration, best practices.'
    );
    expect(prepareAIConversationMock).not.toHaveBeenCalled();
  });

  it('uses debug mode and appends editor context prefill', async () => {
    const context = { subscriptions: [] as { dispose: () => void }[] };
    registerWorkspaiChatParticipant(context as any);

    const participant = context.subscriptions[0] as unknown as {
      handler: Function;
    };

    const stream = {
      markdown: vi.fn(),
      progress: vi.fn(),
      button: vi.fn(),
    };

    await participant.handler(
      { prompt: 'why failing?', command: 'debug' },
      { history: [] },
      stream,
      { isCancellationRequested: false }
    );

    expect(prepareAIConversationMock).toHaveBeenCalledWith(
      'debug',
      expect.stringContaining(
        'why failing?\n\n<editor_context>\nError: db connection refused\n</editor_context>'
      ),
      expect.objectContaining({ type: 'workspace', name: 'demo-workspace' }),
      []
    );
    expect(stream.button).toHaveBeenCalledWith(
      expect.objectContaining({ command: 'workspai.debugWithAI' })
    );
    expect(stream.button).toHaveBeenCalledWith(
      expect.objectContaining({ command: 'workspai.workspaceBrain' })
    );
  });

  it('maps followups based on result command metadata', () => {
    const context = { subscriptions: [] as { dispose: () => void }[] };
    registerWorkspaiChatParticipant(context as any);

    const participant = context.subscriptions[0] as unknown as {
      followupProvider: {
        provideFollowups: Function;
      };
    };

    const debugFollowups = participant.followupProvider.provideFollowups(
      { metadata: { command: 'debug' } },
      { history: [] },
      { isCancellationRequested: false }
    );

    const askFollowups = participant.followupProvider.provideFollowups(
      { metadata: { command: 'ask' } },
      { history: [] },
      { isCancellationRequested: false }
    );

    expect(
      debugFollowups.some((f: { label: string }) => f.label === 'Show full corrected file')
    ).toBe(true);
    expect(askFollowups.some((f: { label: string }) => f.label === 'Suggest a module')).toBe(true);
  });
});
