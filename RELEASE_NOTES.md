# Release Notes

## Latest Release: v0.17.0 (April 16, 2026)

### ✦ AI Assistant, Doctor Fix with AI, Code Actions & Minimizable Modal

**Summary:** Introduces deep AI integration across the extension — editor Code Actions for inline debug/explain, AI-powered fix suggestions directly from the Workspace Health panel, AI module recommendations in the Create Project flow, and a minimizable floating pill for the AI Create modal. Consolidates the Quick Actions sidebar to a single **AI Assistant** button.

#### Added

- ✦ **AI Debug Actions (Code Actions)** — `✦ Debug with Workspai AI` and `✦ Explain error with AI` quick-fix lightbulb actions appear in the editor for Python, TypeScript, JavaScript, and Go files with diagnostics or a text selection; opens the AI modal with the error/selection pre-filled in Debug mode
- ✦ **Doctor Fix with AI** — each issue in the **Workspace Health** sidebar now has a ✨ inline button; clicking it opens the AI modal with the full issue context pre-filled
- ✦ **AI Module Suggestions** — the Create Project modal has a new "Suggest modules with AI" button that recommends the top modules for your chosen framework and project description
- **Minimizable AI Create modal** — a `−` button appears during `thinking` and `creating` steps; collapses to a floating pill in the bottom-left corner so the dashboard stays usable; auto-restores when creation completes

#### Changed

- **Quick Actions sidebar** — consolidated to a single `✦ AI Assistant` button that opens the AI modal; redundant "Workspace Brain" button removed
- **`rapidkit.debugWithAI` command** — now opens the main Workspai panel AI modal with context pre-filled, instead of a separate HTML tab
- **`rapidkit.workspaceBrain` command** — now focuses the main Workspai panel instead of opening a separate HTML tab
- **Doctor Fix with AI** — issue text passed directly as `prefillQuestion` to the AI modal (no scratch-doc workaround)

#### Fixed

- `AIModal.tsx` — added `context` to `useEffect` dependency array so `prefillQuestion` is correctly applied when modal is already mounted

---

## v0.16.0 (March 22, 2026)

### 🩺 Workspace Health Sidebar + Module Install Modal

**Summary:** Introduces the **Doctor Evidence Viewer** — a persistent sidebar panel that reads `.rapidkit/reports/doctor-last-run.json` and renders an inline health dashboard (score bar, system tool status, per-project issues) without any extra CLI call. Also wires the **Available Modules** sidebar item click directly into the same install confirmation modal used on the welcome page, so users see exactly what will be installed and where before confirming.

#### Added

- 🩺 **`WORKSPACE HEALTH` sidebar panel** (`DoctorEvidenceProvider`)
  - Reads `.rapidkit/reports/doctor-last-run.json` from the active workspace — zero CLI overhead
  - **Summary row:** health score bar (e.g. `70%  ███████░░░`) with `✅ passed  ⚠️ warnings  ❌ errors` counts
  - **Timestamp row:** `Last checked: Xm ago` with `(cached scan)` badge when CLI reused cache
  - **System Tools** (collapsible): per-tool status row — `✅ Python`, `⚠️ pipx`, `❌ ...` with message detail
  - **Projects** (collapsible): each project with health icon; unhealthy projects expand to show individual issues
  - **No-data state:** single click-to-run item (`No health data — run doctor to scan`)
  - **No-workspace state:** placeholder until workspace is selected
  - Three `view/title` toolbar icon buttons:
    - `$(run)` **Re-run Doctor** — opens terminal at workspace CWD, runs `npx rapidkit doctor workspace`
    - `$(wrench)` **Auto-fix Issues** — opens terminal, runs `npx rapidkit doctor workspace --fix`
    - `$(refresh)` **Refresh** — re-reads evidence file from disk immediately
  - **File watcher:** auto-refreshes the panel the moment the CLI writes new evidence (no manual refresh needed)
  - **Live workspace sync:** uses a live getter `() => workspaceExplorer.getSelectedWorkspace()` so the correct workspace is always used, regardless of initialization timing
  - **`onDidChangeTreeData` subscription:** workspace switch immediately triggers a panel reload

- 📦 **Module install modal from `AVAILABLE MODULES` sidebar**
  - New command `rapidkit.showModuleInstallModal`
  - Clicking any installable module in the sidebar now opens the **`InstallModuleModal`** — the same confirmation modal used by welcome page module cards
  - Modal shows: module name, version, description, category tags, installation target (workspace name + path), and exact CLI command (`npx rapidkit add module <slug>`)
  - User must explicitly click **Install Module** to proceed — no silent execution
  - Module data is normalized with `display_name` field to match the webview `ModuleData` interface

#### Changed

- 🔄 **Workspace-switch health refresh** now hooks directly into `workspaceExplorer.onDidChangeTreeData` — fires immediately after `selectedWorkspace` is updated, before any command event chain
- 🧩 **`WelcomePanel`** gains two new static methods:
  - `setExtensionContext(context)` — stores context so sidebar-triggered flows can open the panel without passing context through the call chain
  - `showModuleInstallModal(moduleData)` — opens the panel (if needed) and posts `openModuleInstallModal` to the React webview
- 🪟 **`App.tsx`** handles new `openModuleInstallModal` message — sets `selectedModule` and opens `showInstallModal`, identical to the welcome page card click flow

#### Fixed

- ⏱️ **Workspace Health not showing on reload** — fixed initial workspace path not being passed to the provider because `workspaceSelected` event only fires when workspace *changes*, not on first load. Now explicitly seeded after `workspaceExplorer.refresh()` completes.
- 🗂️ **Stale health data after workspace switch** — fixed by always re-reading evidence from disk in `getChildren` instead of relying on in-memory cache

### 🧪 Contract Regression Log (v0.16.0)

| Area | Expected Contract | Status | Notes |
|------|-------------------|--------|-------|
| doctor workspace | `npx rapidkit doctor workspace` | ✅ | Rerun button uses terminal at workspace CWD |
| doctor fix | `npx rapidkit doctor workspace --fix` | ✅ | Auto-fix button aligned |
| add module | `npx rapidkit add module <slug>` | ✅ | Shown in modal before execution |
| evidence file path | `<workspace>/.rapidkit/reports/doctor-last-run.json` | ✅ | Provider reads this exact path |


## 📋 Version History

| Version | Release Date | Highlights |
|---------|--------------|-----------|
| [v0.16.0](releases/RELEASE_NOTES_v0.16.0.md) | Mar 22, 2026 | 🩺 Doctor Evidence Viewer sidebar, 📦 module install modal from sidebar, 🔄 live workspace-switch health refresh |
| [v0.15.0](releases/RELEASE_NOTES_v0.15.0.md) | Feb 27, 2026 | 🚀 platform-safe command layer, 🪟 tool-aware workspace modal, ⚡ workspace list performance, 🩺 doctor path clarity |
| [v0.14.0](releases/RELEASE_NOTES_v0.14.0.md) | Feb 25, 2026 | 🎯 Workspace-vs-project correctness, 👁️ persisted setup toggle, 🌐 example link/clone fixes, 🏷️ profile tags |
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
