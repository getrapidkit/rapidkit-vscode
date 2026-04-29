import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => {
  class CompletionItem {
    label: string;
    kind: number;
    detail?: string;
    documentation?: unknown;
    insertText?: unknown;

    constructor(label: string, kind: number) {
      this.label = label;
      this.kind = kind;
    }
  }

  class MarkdownString {
    value: string;
    constructor(value: string) {
      this.value = value;
    }
  }

  class SnippetString {
    value: string;
    constructor(value: string) {
      this.value = value;
    }
  }

  return {
    CompletionItem,
    CompletionItemKind: {
      Property: 10,
    },
    MarkdownString,
    SnippetString,
  };
});

import { WorkspaiCompletionProvider } from '../providers/completionProvider';

describe('WorkspaiCompletionProvider', () => {
  it('returns config completions for rapidkit.json', () => {
    const provider = new WorkspaiCompletionProvider();

    const completions = provider.provideCompletionItems(
      {
        fileName: '/tmp/demo/rapidkit.json',
        lineAt: () => ({ text: '{' }),
      } as never,
      { character: 1 } as never,
      {} as never,
      {} as never
    );

    expect(completions?.map((item) => item.label)).toEqual(
      expect.arrayContaining(['framework', 'mode', 'profile'])
    );
  });
});
