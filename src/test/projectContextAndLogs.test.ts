import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  registeredCommands,
  showQuickPickMock,
  showWarningMessageMock,
  showInformationMessageMock,
  openTextDocumentMock,
  showTextDocumentMock,
  writeTextMock,
  executeCommandMock,
  trackerMock,
} = vi.hoisted(() => ({
  registeredCommands: new Map<string, (...args: unknown[]) => unknown>(),
  showQuickPickMock: vi.fn(),
  showWarningMessageMock: vi.fn(),
  showInformationMessageMock: vi.fn(),
  openTextDocumentMock: vi.fn(),
  showTextDocumentMock: vi.fn(),
  writeTextMock: vi.fn(),
  executeCommandMock: vi.fn(),
  trackerMock: {
    getCommandTelemetrySummary: vi.fn(),
    getStudioHardGateStatus: vi.fn(),
    getOnboardingExperimentStats: vi.fn(),
    clearCommandTelemetry: vi.fn(),
  },
}));

vi.mock('vscode', () => ({
  commands: {
    registerCommand: (id: string, handler: (...args: unknown[]) => unknown) => {
      registeredCommands.set(id, handler);
      return { dispose: vi.fn() };
    },
    executeCommand: executeCommandMock,
  },
  window: {
    showQuickPick: showQuickPickMock,
    showWarningMessage: showWarningMessageMock,
    showInformationMessage: showInformationMessageMock,
    showTextDocument: showTextDocumentMock,
  },
  workspace: {
    openTextDocument: openTextDocumentMock,
  },
  env: {
    clipboard: {
      writeText: writeTextMock,
    },
  },
  Uri: {
    file: (targetPath: string) => ({ fsPath: targetPath, path: targetPath }),
  },
}));

vi.mock('../utils/workspaceUsageTracker', () => ({
  WorkspaceUsageTracker: {
    getInstance: () => trackerMock,
  },
}));

vi.mock('../commands/projectContextMenu', () => ({
  openProjectFolder: vi.fn(),
  copyProjectPath: vi.fn(),
  deleteProject: vi.fn(),
}));

import { registerProjectContextAndLogCommands } from '../commands/projectContextAndLogs';

describe('projectContextAndLogs telemetry summary contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registeredCommands.clear();

    showQuickPickMock.mockResolvedValue({ value: 'last24h' });
    showInformationMessageMock
      .mockResolvedValueOnce('Copy quick summary')
      .mockResolvedValue(undefined);
    openTextDocumentMock.mockImplementation(async ({ content }: { content: string }) => ({
      uri: { path: '/tmp/telemetry.json' },
      getText: () => content,
    }));
    showTextDocumentMock.mockResolvedValue(undefined);
    writeTextMock.mockResolvedValue(undefined);
    executeCommandMock.mockImplementation(async (commandId: string) => {
      if (commandId === 'workspai.getSelectedWorkspace') {
        return { path: '/tmp/demo-workspace', name: 'demo-workspace' };
      }
      return undefined;
    });

    trackerMock.getCommandTelemetrySummary.mockResolvedValue({
      workspacePath: '/tmp/demo-workspace',
      timeWindow: 'last24h',
      windowStartAt: '2026-04-21T12:30:00.000Z',
      windowEndAt: '2026-04-22T12:30:00.000Z',
      totalEvents: 10,
      lastCommand: 'workspai.aiQuickActions',
      lastCommandAt: '2026-04-22T12:29:00.000Z',
      lastCommandProps: {},
      commandUsage: [
        { command: 'workspai.aiQuickActions', count: 6 },
        { command: 'workspai.chat.ask', count: 3 },
        { command: 'workspai.aimodal.ask', count: 1 },
      ],
      surfaceBreakdown: {
        actionEvents: 6,
        askEvents: 4,
        actionVsAskShare: 60,
        bySurface: [
          { surface: 'action', count: 6, share: 60 },
          { surface: 'chat', count: 3, share: 30 },
          { surface: 'aimodal', count: 1, share: 10 },
          { surface: 'onboarding', count: 0, share: 0 },
          { surface: 'other', count: 0, share: 0 },
        ],
      },
    });

    trackerMock.getStudioHardGateStatus.mockResolvedValue({
      workspacePath: '/tmp/demo-workspace',
      timeWindow: 'last24h',
      windowStartAt: '2026-04-21T12:30:00.000Z',
      windowEndAt: '2026-04-22T12:30:00.000Z',
      thresholds: {
        verifyPhaseReachMin: 80,
        bridgeRouteCompletionMin: 95,
      },
      metrics: {
        loopStarted: 5,
        nextActionClicked: 3,
        actionExecuted: 4,
        verifyOutcomes: 4,
        verifyPhaseReach: 100,
        bridgeRouteCompletionRate: 80,
      },
      gates: {
        verifyPhaseReachPass: true,
        bridgeRouteCompletionPass: false,
        telemetryEvidencePass: true,
        overallPass: false,
      },
    });
  });

  it('includes action-vs-ask and surface mix in copied quick summary', async () => {
    registerProjectContextAndLogCommands();
    const showTelemetrySummary = registeredCommands.get('workspai.showTelemetrySummary');

    expect(showTelemetrySummary).toBeDefined();
    await showTelemetrySummary?.();

    expect(trackerMock.getCommandTelemetrySummary).toHaveBeenCalledWith(
      '/tmp/demo-workspace',
      'last24h'
    );
    expect(trackerMock.getStudioHardGateStatus).toHaveBeenCalledWith(
      '/tmp/demo-workspace',
      'last24h'
    );

    expect(writeTextMock).toHaveBeenCalledTimes(1);
    const quickSummary = writeTextMock.mock.calls[0][0] as string;
    expect(quickSummary).toContain('Action vs Ask share: 60% action (6 action / 4 ask)');
    expect(quickSummary).toContain('Surface mix:');
    expect(quickSummary).toContain('action: 6 (60%)');
    expect(quickSummary).toContain('chat: 3 (30%)');
    expect(quickSummary).toContain('aimodal: 1 (10%)');

    expect(openTextDocumentMock).toHaveBeenCalledTimes(1);
    const openDocArgs = openTextDocumentMock.mock.calls[0][0] as { content: string };
    expect(openDocArgs.content).toContain('"surfaceBreakdown"');
    expect(openDocArgs.content).toContain('"actionVsAskShare": 60');
  });
});
