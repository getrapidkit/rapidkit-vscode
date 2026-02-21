# Release Notes

## Latest Release: v0.13.0 (February 21, 2026)

### 🐹 Release: v0.13.0 — Go Framework Support + Sidebar Quick Actions Redesign

**Summary:** Full Go framework support (Go/Fiber, Go/Gin) in sidebar Quick Actions and Welcome Page, workspace creation routed through Welcome Panel modal, smart init detection for Go projects, and modules disabled for Go projects.

#### Added

- 🐹 **Go Framework Quick Actions** — FastAPI / NestJS / Go buttons now sit in a compact 3-column row in the sidebar Quick Actions panel
- 🪟 **Workspace Button → Welcome Modal** — Clicking Workspace in sidebar opens Welcome Panel and triggers the Create Workspace modal instead of an inline VS Code input box
- 🚫 **Modules Disabled for Go Projects** — Both the sidebar AVAILABLE MODULES panel and the Welcome Page Module Browser show a clear "not available" banner when a Go project is selected; search and filters are hidden
- 🐹 **Go Project Type Detection** — `_detectProjectType` now returns `'go'` via `go.mod` check; `projectType` is propagated through `WorkspaceStatus` to the webview

#### Fixed

- 🔧 **`@latest` Removed from All npx Calls** — All 12 npx invocations across 6 files now use `npx rapidkit` (no version tag), preventing the npm registry version (0.21.2) from overriding the local version (0.22.0) and breaking `create workspace` / `create project` commands
- 🔧 **Go Project Init Check** — `rapidkit.projectDev` command now checks for `go.sum` instead of `node_modules` to determine whether a Go project is initialized
- 🔧 **Go Dev Server Port & Command** — Default port for Go projects set to `3000`; dev command is `npx rapidkit dev` (not `npm run start:dev`)
- 🔧 **openWorkspaceModal Fix** — Sidebar Workspace button was triggering loading state on HeroAction card; now correctly calls `setShowCreateModal(true)`

#### Changed

- 🎨 **Framework Button Size** — Framework buttons in Quick Actions redesigned: smaller icons (16px), reduced padding and min-height (44px), tighter gap — all three fit cleanly in one row
- 🧭 **Module Explorer setProjectPath** — Now accepts optional `projectType` argument forwarded from both tree-selection handlers

#### Technical

- **`WorkspaceStatus` type** — Added `projectType?: 'fastapi' | 'nestjs' | 'go'` field
- **`ModuleBrowser` component** — Added `modulesDisabled` prop; hides search/filters and renders Go banner
- **`WelcomePanel._detectProjectTypeStatic()`** — New static helper reused by both instance method and `updateWithProject`
- **`WelcomePanel.openWorkspaceModal()`** — New static method using `__workspace__` pending modal token
- **`rapidkit.openWorkspaceModal` command** — Registered in `extension.ts`

---

## Previous Release: v0.12.0 (February 15, 2026)

### 🪟 Release: v0.12.0 — Module Details Modal + Workspace-First CLI Resolution

**Summary:** Introduced an in-app module details modal in the Welcome webview, improved workspace-first CLI binary resolution for nested projects, and added automatic workspace/module refresh after module install.

#### Added

- 🪟 **Module Details Modal** — Rich tabbed module details UI (overview, dependencies, configuration, profiles, features, docs)
- 🧩 **Expanded ModuleData Typing** — Support for runtime dependencies, profiles, documentation, compatibility, support, and changelog metadata
- 🔄 **Workspace Status Refresh Hook** — Refreshes installed modules and catalog after successful module installation

#### Changed

- 🧭 **CLI Resolution Strategy** — Searches for workspace `.venv/bin/rapidkit` by walking parent directories before global fallback
- 📡 **Module Info Fetching** — Uses `rapidkit modules info <module> --json` and merges with catalog data
- 🎨 **Webview UX** — Module details now open in modal instead of separate HTML panel

#### Technical

- **UI Architecture:** Replaced standalone HTML module details page with React modal workflow
- **CLI Reliability:** Better `.venv` discovery in nested workspace/project layouts
- **State Sync:** Installed-modules list now refreshes immediately after add-module success

---

## Previous Release: v0.10.0 (February 12, 2026)

### 🚀 Release: v0.10.0 — Smart Project Actions + Intelligent Browser + Port Detection

**Summary:** Introduced unified project actions panel in Welcome Page, smart browser button that activates only when server is running, workspace upgrade detection, and intelligent port tracking for running servers.

#### Added

- 🚀 **Project Actions Panel** — Complete project lifecycle management in Welcome Page with 6 smart buttons (Terminal, Init, Dev/Stop toggle, Test, Browser, Build)
- ⬆️ **Workspace Upgrade Button** — Automatic detection of rapidkit-core updates with one-click upgrade for venv/pipx installations
- 🎯 **Smart Browser Button** — Context-aware browser opening that only enables when dev server is running with port detection
- 📡 **Running Port Detection** — Automatic port extraction and display in sidebar, tooltips, and Welcome Page

#### Improved

- 🎨 **Enhanced Sidebar Icons** — Browser icon only visible for running projects, port displayed next to project name
- 🔄 **State Synchronization** — Real-time UI updates between terminal state, tree view, and webview panels
- 💅 **Disabled Button Styling** — Professional disabled states with clear visual feedback
- 🎯 **Better UX** — No more blind browser opens; button intelligently guides user workflow

#### Technical

- **New Component:** `ProjectActions.tsx` with conditional rendering and smart toggles
- **Type Enhancement:** `WorkspaceStatus` now includes `runningPort?: number`
- **Integration:** Real-time server state tracking via `runningServers` Map
- **Performance:** Minimal overhead with regex-based port extraction from terminal names

#### User Experience

- ✨ **Workflow Clarity** — Clear visual states guide user: Dev → Browser (enabled) → Stop → Browser (disabled)
- ✨ **Port Transparency** — Always know which port your server is running on
- ✨ **One-Click Upgrades** — No more manual core updates; orange button appears when needed
- ✨ **Centralized Actions** — All project operations accessible from welcome page

---

## 📋 Version History

| Version | Release Date | Highlights |
|---------|--------------|-----------|
| [v0.13.0](releases/RELEASE_NOTES_v0.13.0.md) | Feb 21, 2026 | 🐹 Go framework support, 🪟 Workspace modal routing, 🔧 @latest fix, 🚫 Modules disabled for Go |
| [v0.12.0](releases/RELEASE_NOTES_v0.12.0.md) | Feb 15, 2026 | 🪟 Module details modal, 🧭 workspace-first CLI resolution, 🔄 post-install refresh |
| [v0.11.0](releases/RELEASE_NOTES_v0.11.0.md) | Feb 14, 2026 | 🌐 Dynamic Examples, 🎨 Kit Selection, 📦 Workspace Export/Import |
| [v0.10.0](releases/RELEASE_NOTES_v0.10.0.md) | Feb 12, 2026 | 🚀 Project Actions, 🎯 Smart Browser, 📡 Port Detection |
| [v0.9.0](releases/RELEASE_NOTES_v0.9.0.md) | Feb 10, 2026 | 🎭 Modal system, ⚡ Smart caching, 📱 Responsive design |
| [v0.8.0](releases/RELEASE_NOTES_v0.8.0.md) | Feb 9, 2026 | 🎨 Workspace cards redesign, Dynamic version display, Project statistics |
| [v0.7.0](releases/RELEASE_NOTES_v0.7.0.md) | Feb 6, 2026 | 🩺 Workspace health check, Setup status panel, Diagnostics integration |
| [v0.6.1](releases/RELEASE_NOTES_v0.6.1.md) | Feb 3, 2026 | 🛠️ Fixes & polish: setup stability, module copy commands, detection improvements |
| [v0.6.0](releases/RELEASE_NOTES_v0.6.0.md) | Feb 3, 2026 | 🎯 Module Browser, Setup Wizard, Package Manager Selection |
| [v0.5.2](releases/RELEASE_NOTES_v0.5.2.md) | Feb 2, 2026 | 🔧 NPM caching fix, Standalone mode, Recent workspaces |
| [v0.5.1](releases/RELEASE_NOTES_v0.5.1.md) | Feb 2, 2026 | 📝 Documentation translation, Consistency improvements |
| [v0.5.0](releases/RELEASE_NOTES_v0.5.0.md) | Feb 1, 2026 | 🐍 Python Core bridge, Workspace registry integration |
| [v0.4.7](releases/RELEASE_NOTES_v0.4.7.md) | Jan 23, 2026 | 🐛 Bug fixes, Dependency updates, Security patches |
| [v0.4.6](releases/RELEASE_NOTES_v0.4.6.md) | Jan 1, 2026 | 🎯 Poetry smart detection, Update notifications |
| [v0.4.5](releases/RELEASE_NOTES_v0.4.5.md) | Dec 23, 2025 | ⚡ Project quick actions, No workspace switching |
| [v0.4.4](releases/RELEASE_NOTES_v0.4.4.md) | Dec 22, 2025 | 🩺 Doctor npm check, Dynamic versions |
| [v0.4.3](releases/RELEASE_NOTES_v0.4.3.md) | Dec 12, 2025 | 📚 Module explorer, UI enhancements |
| [v0.4.2](releases/RELEASE_NOTES_v0.4.2.md) | Dec 5, 2025 | 📝 Logging commands, Marketplace improvements |
| [v0.4.1](releases/RELEASE_NOTES_v0.4.1.md) | Dec 4, 2025 | 📖 Documentation update, README rewrite |
| [v0.4.0](releases/RELEASE_NOTES_v0.4.0.md) | Dec 3, 2025 | 🎯 Smart location detection, npm migration |
| [v0.3.1](releases/RELEASE_NOTES_v0.3.1.md) | Dec 3, 2025 | 🐛 Bug fixes |
| [v0.3.0](releases/RELEASE_NOTES_v0.3.0.md) | Dec 2, 2025 | ✨ New features |
| [v0.1.3](releases/RELEASE_NOTES_v0.1.3.md) | Nov 2025 | 🔧 Improvements |
| [v0.1.2](releases/RELEASE_NOTES_v0.1.2.md) | Nov 2025 | 🐛 Bug fixes |
| [v0.1.1](releases/RELEASE_NOTES_v0.1.1.md) | Nov 2025 | ✏️ Minor updates |
| [v0.1.0](releases/RELEASE_NOTES_v0.1.0.md) | Nov 2025 | 🎉 Initial release |

---

## Links

- 📦 [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=rapidkit.rapidkit-vscode)
- 🐙 [GitHub Repository](https://github.com/getrapidkit/rapidkit-vscode)
- 📚 [Documentation](https://getrapidkit.com/docs)
- 🚀 [npm Package](https://www.npmjs.com/package/rapidkit)
