# Release Notes

## Latest Release: v0.6.1 (February 3, 2026)

### 🛠️ Patch: v0.6.1 — fixes & polish

**Summary:** Small but impactful fixes addressing Setup Status reliability, installation UX improvements, and copy-to-clipboard workflows for modules and installation commands.

#### Fixed & Improved

- 🔧 **Fixed "Checking..." stuck state** — Removed interval polling and implemented debounced installation status updates; also ensure backend sends initial status on panel load
- 🔍 **Improved npm vs pipx detection** — Now correctly distinguishes npm CLI from pipx RapidKit to avoid false positives
- 📋 **Copy install command** — Added single `Manual install` copy button (uses slug) to every module card and copy buttons next to install actions in the Setup Wizard
- 🖥️ **Manual install button UI** — Terminal-style icon and clearer label for manual install command
- 🏷️ **Extension version badge** now shows current version and update status (e.g., `v0.6.1 — Up to date`)

---

## Previous Release: v0.6.0 (February 3, 2026)

### 🎯 Module Browser + Setup Wizard + Installation Methods

**Interactive module browser with 27+ modules, intelligent setup wizard with Python/Poetry validation, and multi-method package manager selection!**

### What's New

#### 🎯 New Features

- **Interactive Module Browser** - Browse and manage 27+ modules
  - Grid view with search and category filters
  - Real-time installation status (installed/update available/not installed)
  - One-click install/update from extension
  - Module details with descriptions
  - Sidebar explorer for quick access
  - Auto-sync installation status

- **Intelligent Setup Wizard** - Pre-flight checks before workspace creation
  - Step 1: Python 3.10+ validation with venv support
  - Step 2: RapidKit Core installation check
  - Step 3: npm package verification
  - Step 4: Package manager selection (Poetry/pip/pipx)
  - Platform-specific guidance (Windows/macOS/Linux)
  - Auto-detecting installed environments

- **Package Manager Selection** - Three installation methods
  - **Poetry** (Recommended) - Automatic venv + dependency resolution
  - **pip** (Optional) - Standard Python package manager
  - **pipx** (Optional) - Isolated Python tool installation
  - Real-time status checking for each method
  - One-click installation with progress feedback
  - Beginner-friendly explanations

- **Enhanced Setup Guidance** - Clearer documentation
  - Updated README with new feature screenshots
  - Simplified "Select Installation Method" text for junior developers
  - Explanations for why each package manager is needed
  - Visual "RECOMMENDED" badge on Poetry card

#### 🔧 Improvements

- Python environment detection with 8 different methods
- Auto-closing progress notifications (800ms)
- Module state synchronization across UI
- Better error messages with platform-specific fixes
- Workspace creation blocking on missing prerequisites
- Installation method cards with visual status indicators
  - Just now / 5m ago / 2h ago / 3d ago
  - Hidden after 7 days
- **Status Icons** - Visual indicators:
  - 🟢 Active workspace (green folder-opened icon)
  - Inactive workspaces (purple folder-library icon)
- **Time Tracking** - Automatic lastAccessed timestamp updates

#### 🎨 UI Improvements

- **Notification Polish** - All notifications now have "OK" button
- **Welcome Page Icons** - Updated to more professional symbols:
  - 💻 VS Code (was 🎨)
  - 🔍 System Check (was 🩺)
  - ⚡ Key Features (was ✨)
- **Minimal Refresh Icons** - Changed from 🔄 to ↻

### Files Updated

**Modified:**
- 15 files updated for npm caching fix
- `src/commands/doctor.ts` - Accurate status checking
- `src/commands/createProject.ts` - Standalone mode + refresh
- `src/commands/createWorkspace.ts` - Auto-refresh
- `src/ui/panels/welcomePanel.ts` - Command reference + Recent Workspaces + refresh
- `src/ui/treeviews/workspaceExplorer.ts` - Time tracking + icons + project count
- `src/core/workspaceManager.ts` - touchWorkspace() method
- `src/extension.ts` - Global context storage
- `CHANGELOG.md` - Updated with v0.5.2 changes
- `package.json` - Version bump to 0.5.2

### System Requirements

- **Node.js**: 14+
- **Python**: 3.10+ (for Python Core)
- **VS Code**: 1.100+

### Installation

Install from VS Code Extensions marketplace or:
```bash
code --install-extension rapidkit.rapidkit-vscode
```

---

## 📋 Version History

| Version | Release Date | Highlights |
|---------|--------------|-----------|
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
