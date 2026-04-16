# Release Notes — v0.17.0 (April 16, 2026)

## ✦ AI Assistant, Doctor Fix with AI, Code Actions & Minimizable Modal

### What's New

#### AI Debug Actions (Code Actions)

The editor lightbulb now shows AI-powered quick-fix actions for Python, TypeScript, JavaScript, and Go files:

- **`✦ Debug with Workspai AI`** — pre-fills the AI modal with the selected text or the first diagnostic error on the current line, switches to Debug mode automatically
- **`✦ Explain error with AI`** — same trigger but phrases the prompt as an explanation request

Actions appear whenever there is a text selection **or** the cursor is on a line with diagnostics (errors/warnings from any language server).

---

#### Doctor Fix with AI

Each issue row in the **WORKSPACE HEALTH** sidebar panel now has a ✨ inline action button. Clicking it opens the main Workspai AI modal with the full issue context (project name, issue type, message) pre-filled — ready for immediate AI analysis and fix suggestions.

No more copying error text manually.

---

#### AI Module Suggestions

The **Create Project** modal now includes a **"Suggest modules with AI"** button below the module list. It reads your chosen framework and project description, calls the AI service, and returns a ranked list of recommended modules — selectable with one click.

---

#### Minimizable AI Create Modal

During AI workspace creation (`thinking` and `creating` steps), a `−` minimize button appears in the modal header. Clicking it collapses the modal to a small floating pill in the bottom-left corner:

```
╭─────────────────────────────╮
│  ⟳  Creating workspace…     │
╰─────────────────────────────╯
```

The pill shows the current creation stage label with a spinner. Clicking the pill restores the full modal. The modal also auto-restores when creation completes.

---

### Changed

- **Quick Actions sidebar** — consolidated from two buttons to a single `✦ AI Assistant` (`$(sparkle)`) button; the separate "Workspace Brain" button has been removed
- **`rapidkit.debugWithAI`** — rerouted to open the main Workspai panel AI modal with `prefillQuestion` from editor context (selection or diagnostics), instead of spawning a separate HTML webview tab
- **`rapidkit.workspaceBrain`** — rerouted to focus the main Workspai panel; no separate HTML tab
- **Doctor Fix with AI** — previous scratch-document workaround removed; issue text is now passed directly as `prefillQuestion` via `WelcomePanel.showAIModal()`

---

### Fixed

- **`AIModal.tsx` stale prefill** — `context` was missing from the `useEffect` dependency array, causing `prefillQuestion` to be ignored when the modal was already mounted from a previous interaction. Now correctly re-applies context on every change.

---

### Technical Changes

- New file: `src/commands/aiDebugger.ts` — `registerAIDebuggerCommand` + `AIDebugCodeActionsProvider`
- New file: `src/commands/workspaceBrain.ts` — `registerWorkspaceBrainCommand`
- New file: `src/core/aiService.ts` — `AIModalContext`, `gatherProjectContext`, `streamAIResponse`
- New file: `webview-ui/src/components/AIModal.tsx` — Ask AI / Debug tabs, prefill support
- New file: `webview-ui/src/components/AICreateModal.tsx` — AI workspace creation modal with minimize
- New file: `webview-ui/src/components/AIActions.tsx` — AI action buttons for workspace/module cards
- `src/providers/codeActionsProvider.ts` — `AIDebugCodeActionsProvider` registered for py/ts/js/go
- `src/ui/treeviews/doctorEvidenceProvider.ts` — ✨ Fix with AI inline tree item action
- `webview-ui/src/components/CreateProjectModal.tsx` — AI module suggestion button
- `package.json` — `rapidkit.debugWithAI` icon changed to `$(sparkle)`, title to `"AI Assistant"`; `workspaceBrain` view/title button removed from Quick Actions
