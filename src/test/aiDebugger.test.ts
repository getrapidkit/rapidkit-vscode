import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => ({
  window: {
    activeTextEditor: undefined,
  },
  languages: {
    getDiagnostics: () => [],
  },
  DiagnosticSeverity: {
    Error: 0,
    Warning: 1,
  },
}));

vi.mock('../ui/panels/welcomePanel', () => ({
  WelcomePanel: {
    showAIModal: vi.fn(),
  },
}));

import {
  collectDebugPrefillQuestion,
  formatDiagnostics,
  getEditorSelection,
} from '../commands/aiDebugger';

describe('aiDebugger helpers', () => {
  it('formats diagnostics into compact debugger prefill text', () => {
    const formatted = formatDiagnostics([
      {
        severity: 0,
        range: { start: { line: 2 } },
        message: 'Connection refused',
      },
      {
        severity: 1,
        range: { start: { line: 7 } },
        message: 'Unused config value',
      },
    ] as never);

    expect(formatted).toContain('[ERROR] Line 3: Connection refused');
    expect(formatted).toContain('[WARN] Line 8: Unused config value');
  });

  it('prefers the current editor selection over diagnostics', () => {
    const editor = {
      selection: { isEmpty: false },
      document: {
        getText: vi.fn(() => 'Traceback: boom'),
      },
    };

    expect(getEditorSelection(editor as never)).toBe('Traceback: boom');
    expect(
      collectDebugPrefillQuestion(
        editor as never,
        [
          {
            severity: 0,
            range: { start: { line: 0 } },
            message: 'Should not be used',
          },
        ] as never
      )
    ).toBe('Traceback: boom');
  });
});
