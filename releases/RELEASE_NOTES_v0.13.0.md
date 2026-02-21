# Release Notes — v0.13.0

**Release Date:** February 21, 2026

## 🐹 Go Framework Support + Sidebar Quick Actions Redesign

### Summary

Full Go framework support (Go/Fiber, Go/Gin) in sidebar Quick Actions and Welcome Page, workspace creation routed through Welcome Panel modal, smart init detection for Go projects, and modules properly hidden/disabled for Go projects. Several critical fixes for workspace and project creation failures caused by `@latest` npm version mismatch.

---

## ✨ Added

### 🐹 Go Framework in Sidebar Quick Actions
- FastAPI / NestJS / Go buttons now appear in a compact **3-column row** in the sidebar Quick Actions panel
- Buttons are sized smaller (16px icons, 44px min-height, 9.5px label font) to fit cleanly in a single row
- Go icon (`go.svg`) used in both sidebar and Welcome Page Quick Links

### 🪟 Workspace Button → Welcome Panel Modal
- Clicking the **Workspace** button in sidebar now:
  1. Opens the Welcome Panel (if not already open)
  2. Automatically triggers the **Create Workspace modal**
- Implemented via new `WelcomePanel.openWorkspaceModal()` static method
- Uses `__workspace__` pending-modal token in the existing `_pendingModal` mechanism
- New `rapidkit.openWorkspaceModal` VS Code command registered

### 🚫 Modules Disabled for Go Projects
- **Sidebar AVAILABLE MODULES** — when a Go project is selected, the module list is replaced with an info message: *"Modules not available for Go projects"*
- **Welcome Page Module Browser** — shows a 🐹 Go banner; search and filter controls are hidden
- `ModuleExplorerProvider.setProjectPath(path, type?)` now accepts an optional `projectType` argument
- `ModuleBrowser` React component accepts a new `modulesDisabled` prop

### 🐹 Go Project Type Detection
- `_detectProjectType` / `_detectProjectTypeStatic` now detects Go projects via `go.mod`
- `projectType` is included in the `updateWorkspaceStatus` message sent to the webview
- `WorkspaceStatus` TypeScript interface extended with `projectType?: 'fastapi' | 'nestjs' | 'go'`

---

## 🔧 Fixed

### `@latest` Removed from All npx Calls
**Root cause:** npm registry had `rapidkit@0.21.2` while local dev version was `0.22.0`. Using `npx rapidkit@latest` downloaded the stale registry version which:
- Does not have the `create workspace` subcommand → *"Operation Failed / An unknown error occurred"*
- Has different project creation interface → *"rapidkit create project exited with code 1"*

**Fix:** Removed `@latest` from all 12 npx invocations across:
- `src/core/rapidkitCLI.ts` (6 calls)
- `src/core/kitsService.ts`
- `src/utils/firstTimeSetup.ts`
- `src/utils/updateChecker.ts`
- `src/commands/doctor.ts`
- `src/commands/checkSystem.ts`

### Go Project Init Detection
- `rapidkit.projectDev` command was checking for `node_modules` for all non-FastAPI projects
- Go projects don't have `node_modules` → false "not initialized" warning on every start attempt
- **Fix:** Go projects now check for `go.sum` (present after `go mod tidy`)
- Default port changed from `8000` to `3000` for Go projects
- Dev command changed from `npm run start:dev` to `npx rapidkit dev` for Go projects

### openWorkspaceModal Opened Loading State Instead of Modal
- `App.tsx` handler for `openWorkspaceModal` message was calling `setIsCreatingWorkspace(true)` (activates loading spinner on HeroAction card) instead of `setShowCreateModal(true)` (opens Create Workspace modal)
- **Fix:** Corrected to `setShowCreateModal(true)`

---

## 🔄 Changed

| Component | Before | After |
|-----------|--------|-------|
| Framework button height | 56px | 44px |
| Framework button icon size | 20px | 16px |
| Framework button padding | 8px 4px | 5px 2px |
| Framework button label | 10.5px | 9.5px |
| Go project dev port | 8000 | 3000 |
| Workspace button action | VS Code input box | Welcome Panel + modal |

---

## 🔬 Technical Details

- `WelcomePanel._detectProjectTypeStatic(path)` — new public static method to avoid code duplication
- `WelcomePanel.openWorkspaceModal(context)` — queues `__workspace__` in `_pendingModal`; panel `ready` handler distinguishes it from framework modals
- `ModuleBrowser` — `modulesDisabled` prop hides `module-controls` block and replaces grid with Go banner
- Both `rapidkit.selectProject` command and `projectsTreeView.onDidChangeSelection` handler now forward `item.project.type` to `moduleExplorer.setProjectPath()`

---

## 📦 Package

- **Version:** 0.13.0
- **Marketplace:** [RapidKit on VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=rapidkit.rapidkit-vscode)
