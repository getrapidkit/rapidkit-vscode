# Release Notes v0.15.0

## 🚀 Platform-Safe Command Layer + Smarter Workspace UX

**Release Date:** February 27, 2026  
**Type:** Minor Release (Features + Reliability + Performance)

This release strengthens cross-platform command execution, improves create-workspace UX with real tool-awareness, and reduces perceived latency in the `WORKSPACES` tree for larger setups.

---

## ✨ Highlights

### 🧩 Modular Command Registration

The extension command surface is now organized into focused modules:

- `coreCommands`
- `workspaceSelection`
- `workspaceOperations`
- `projectLifecycle`
- `fileManagement`
- `projectContextAndLogs`

**Impact:** Better maintainability, clearer ownership per command area, and safer incremental changes.

### 🪟 Tool-Aware Create Workspace Modal

Create Workspace flow now performs runtime/tool detection as the modal opens.

- Detects Python / venv / Poetry / pipx availability
- Auto-selects supported install method where possible
- Disables unsupported options with inline reason text
- Avoids duplicate Poetry prompt in modal-based flow

**Impact:** Cleaner UX, fewer invalid selections, reduced confusion during workspace creation.

### ⚡ Workspace Sidebar Performance Improvements

`WORKSPACES` rendering was optimized for environments with many entries:

- Added cache for global installed version checks
- Added cache for latest version checks
- Parallelized workspace enrichment work in tree provider

**Impact:** Faster initial load and refresh responsiveness in sidebar.

### 🖥️ Platform-Safe Terminal Command Execution

Terminal command construction and dispatch are centralized and platform-aware.

- New `platformCapabilities` utilities for quoting/building shell commands
- New `terminalExecutor` abstraction for terminal lifecycle and command dispatch
- Drift guards enforce command contract and terminal API usage boundaries

**Impact:** More predictable behavior across Linux/macOS/Windows.

### 🩺 Doctor Output Clarity

Workspace doctor path rendering was refined:

- Launcher aliases are no longer shown in install-path output
- Real installation paths remain visible
- Output ordering is deterministic

**Impact:** Clearer diagnostics with less ambiguity.

---

## ✅ Quality & Validation

- Focused contract and platform tests passed:
  - `driftGuard.test.ts`
  - `platformCapabilities.test.ts`
  - `workspaceDetector.test.ts`
  - `workspaceManager.test.ts`
  - `rapidkitCLI.test.ts`
- Verified command/lint/typecheck path via `npm run test -- <targeted-tests>` (includes `pretest` compile/lint)

---

## 📦 Notes

- No breaking change intended for user-facing commands.
- Existing command contracts for `doctor`, `create workspace`, `create project`, and `bootstrap --profile` are preserved.

---

## 🔗 Related Files

- `CHANGELOG.md`
- `RELEASE_NOTES.md`
- `src/utils/platformCapabilities.ts`
- `src/utils/terminalExecutor.ts`
- `src/core/coreVersionService.ts`
- `src/ui/treeviews/workspaceExplorer.ts`
