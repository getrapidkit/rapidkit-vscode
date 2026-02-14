# Release Notes

## Latest Release: v0.11.0 (February 14, 2026)

### 🌐 Release: v0.11.0 — Dynamic Examples + Kit Selection + Workspace Export/Import

**Summary:** Introduced dynamic example workspaces from GitHub, enhanced kit selection with dropdown in modal, complete workspace export/import with ZIP archives, and various UX improvements for better visual hierarchy.

#### Added

- 🌐 **Dynamic Example Workspaces** — Real-time loading from GitHub repository with clone tracking and update detection
- 🎨 **Dynamic Kit Selection** — Kit dropdown in project modal with framework filtering and dynamic loading from CLI
- 📦 **Full Workspace Export/Import** — Complete backup/restore with ZIP archives, smart exclusions, and progress tracking
- 🆕 **New Services** — ExamplesService and KitsService for GitHub and CLI integration with caching

#### Changed

- ✨ **UX Improvements** — Larger section headers (24px icons), better spacing, Features moved to footer, Upload icon for export
- 🎯 **Project Creation Flow** — Kit selection in modal, framework-based kit filtering, streamlined workflow
- 📋 **Workspace Context Fix** — Proper workspace path passing to project creation

#### Technical

- **New Dependencies:** archiver, adm-zip for ZIP operations
- **Code Stats:** 3,111 lines added, 701 removed across 20 files
- **Services:** ExamplesService (GitHub API + cache), KitsService (CLI integration + fallback)

#### Removed

- ❌ **Config-Only Export** — Simplified to Full Archive workflow only

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
