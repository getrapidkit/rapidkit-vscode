# Release Notes

## Latest Release: v0.5.1 (February 2, 2026)

### � Python Detection + Setup Wizard

**Complete Python environment detection + Interactive setup wizard + Comprehensive diagnostics!**

### What's New

- **🔍 8-Method Python Detection** - Detects rapidkit-core in any Python environment
  - System Python, pyenv, virtualenv, poetry, conda, pipx, user site-packages
  - Automatically finds the right Python even with complex setups
  - **Fixed**: Now detects package in pyenv v3.10.19 even when global=system Python

- **🧙 Interactive Setup Wizard** - Built into welcome page
  - Real-time status checking for npm and Python Core
  - One-click installation with correct commands
  - Visual indicators (✓ installed, ⚠ missing, ⏳ checking)
  - Refresh button to verify after manual installation
  - Only enables "Finish Setup" when both components ready
  - Persistent state (remembers user dismissal)

- **💉 Enhanced Doctor Command** - Comprehensive system checks
  - Detects all system requirements with versions
  - Checks for available updates
  - Shows package installation location
  - Distinguishes global npm vs npx cache
  - Compares semantic versions for updates

- **📚 Complete Documentation** - 5 new guides
  - All 8 detection methods explained with real scenarios
  - Setup wizard implementation details
  - 10 comprehensive test cases
  - Visual UI mockups and interaction flows
  - Workspace structure comparison

### Key Improvements

- ✅ Pyenv Python detection now works (Method 4 specifically for this)
- ✅ Simplified welcome page with integrated wizard
- ✅ Better action buttons (3-column layout, compact)
- ✅ Cleaner activation flow (no auto-default workspace)
- ✅ More reliable workspace creation
- ✅ All English documentation (no Persian text)

### Files Updated

**New:**
- `docs/PYTHON_DETECTION_METHODS.md` - 8 detection methods
- `docs/SETUP_WIZARD_UPDATE.md` - Implementation guide
- `docs/WIZARD_TESTING.md` - Test cases
- `docs/WIZARD_VISUAL_GUIDE.md` - UI guide
- `docs/WORKSPACE_COMPARISON.md` - Structure reference
- `src/commands/checkSystem.ts` - Quick check command
- `src/utils/errorParser.ts` - Error parsing

**Modified:**
- `src/commands/doctor.ts` - Version checking
- `src/utils/pythonChecker.ts` - 8-method detection
- `src/ui/panels/welcomePanel.ts` - Integrated wizard
- `src/ui/webviews/actionsWebviewProvider.ts` - Compact layout
- `src/extension.ts` - Simplified activation
- `src/core/workspaceManager.ts` - Better handling
- `package.json` - Version 0.5.1

### System Requirements

- **Node.js**: 14+
- **Python**: 3.10+ (for Python Core)
- **VS Code**: 1.100+

### Installation

Install from VS Code Extensions marketplace or:
```bash
code --install-extension rapidkit.rapidkit-vscode
```

### Setup Steps

1. Open VS Code
2. Welcome page auto-opens with Setup Wizard
3. Wizard shows missing components (npm/Python Core)
4. Click install buttons to add components
5. Click refresh to verify
6. Click "Finish Setup" to run doctor check

### Documentation

- 📖 [Getting Started](./docs/GETTING_STARTED.md)
- 🔍 [Python Detection Methods](./docs/PYTHON_DETECTION_METHODS.md)
- 🧙 [Setup Wizard Guide](./docs/SETUP_WIZARD_UPDATE.md)
- 🧪 [Testing Guide](./docs/WIZARD_TESTING.md)
- 🎨 [Visual Guide](./docs/WIZARD_VISUAL_GUIDE.md)

### Known Issues

- None reported yet

### Feedback

Report issues: https://github.com/getrapidkit/rapidkit-vscode/issues  
Feature requests: https://github.com/getrapidkit/rapidkit-vscode/discussions  
Email: support@getrapidkit.com

---

## Previous Release: v0.5.0 (February 1, 2026)

- **🐍 Python Core Bridge** - Direct integration with `rapidkit-core` engine
  - Smart Python detection: Scenario A (system + core), B (system without core), C (no python)
  - Cached venv in `~/.cache/rapidkit/` (prevents repeated setup)
  - Zero-configuration: Works out of the box
  - Auto-fallback chain: System → Cached → Workspace

- **📋 Shared Workspace Registry** - Cross-tool workspace discovery
  - Registry stored at `~/.rapidkit/workspaces.json`
  - Extension auto-detects workspaces created via npm package
  - npm package can list workspaces created by Extension
  - Workspace detection from any subdirectory using registry fallback

- **🏷️ Unified Workspace Signature** - Changed from `RAPIDKIT_VSCODE_WORKSPACE` to `RAPIDKIT_WORKSPACE`
  - Improves cross-tool compatibility with npm package
  - Constants centralized (no hardcoded strings)
  - Workspace markers include `createdBy: 'rapidkit-vscode'`
  - Backward compatible: Both signatures recognized

- **🔗 Cross-Platform Exec** - Stable command execution anywhere
  - Transparent `python3` vs `python` handling (Unix vs Windows)
  - Timeout management, process isolation, auto-cleanup
  - Proper stdout/stderr capture and exit codes

- **🎯 Project Context Tracking** - Know which project you're working on
  - Tracks selected project in workspace
  - Better module command routing
  - Multi-framework awareness (FastAPI, NestJS)
  - Visual indicators: Checkmark (✓) for selected project

- **🔍 Enhanced Workspace Detection** - Multi-layer workspace discovery
  - Primary: `.rapidkit-workspace` marker file with signature validation
  - Fallback: Structure detection (pyproject.toml + .venv + rapidkit script)
  - Last resort: Shared registry lookup

- **📦 Bridge-Aware Doctor** - System diagnostics include Python engine
  - Checks Python availability across scenarios
  - Verifies `rapidkit-core` installation
  - Detects cached environments

### Architecture Milestone

**RapidKit Ecosystem Fully Unified:**

```
VS Code Extension ↔ Python Bridge → Python Core Engine
                 ↕
        Shared Registry (~/.rapidkit/workspaces.json)
                 ↕
           npm CLI Package
```

- **Single source of truth**: Python engine handles all generation
- **Cross-tool discovery**: Start with CLI, continue in Extension (or vice versa)
- **Unified format**: Same workspace markers across all tools
- **Better UX**: Seamless workflow across tools

---

## Previous Releases

### v0.4.6 (January 1, 2026)

### Poetry Smart Detection + Update Notifications 🐍🔔

**Seamless Poetry integration + Never miss npm package updates!**

### What's New

- **🐍 Smart Poetry Virtualenv Detection** - No more false warnings!
  - Detects `.venv` in project directory
  - Detects Poetry cache virtualenvs (`~/.cache/pypoetry/virtualenvs/`)
  - Uses `poetry env info --path` for accurate detection
  - Synced with rapidkit-npm v0.14.1
- **🔔 Automatic Update Notifications** - Stay up-to-date effortlessly
  - Auto-checks NPM registry every 24 hours
  - Smart notifications: Update Now | Release Notes | Skip Version
  - Manual check: `RapidKit: Check for Updates` command
  - Respects user preferences (dismissible)
- **�️ Missing Workspace Recovery** - Auto-fix deleted workspaces
  - Detects when workspace directory no longer exists
  - Shows recovery dialog: Recreate | Choose New Location | Cancel
  - No need to restart VS Code
  - Eliminates `ENOENT` errors
- **�📦 Enhanced Doctor Command** - Better Poetry detection
  - Shows exact Poetry version
  - Improved error messages
- **🧹 Cleaner Configuration** - Removed 26 deprecated activation events
  - Smaller package.json
  - No functional changes

---

## Previous Releases

### v0.4.5 (December 23, 2025)

### Actions Panel Redesign + Project Quick Actions ⚡

**Professional WebviewView sidebar + One-click project commands!**

### What's New

- **🎨 ACTIONS WebviewView** - Completely redesigned sidebar
  - Professional button design (GitLens-style minimal UI)
  - Inline SVG icons for perfect rendering
  - Framework badges: `PY` / `TS`
  - Sections: Create, Tools, Resources
- **🎨 Welcome Panel SVG Logo** - Upgraded from PNG to SVG
  - Crisp rendering at any display size
  - Official brand colors: #00CFC1 + #1C1C1C
- **🖼️ rapidkit.svg** - Official brand icon with shadow effect
- **⚡ Project Quick Actions** - 5 inline buttons on each project in PROJECTS panel
  - `💻` **Open Terminal** - Opens terminal in project directory
  - `📦` **Install Dependencies** - Runs `npx rapidkit init`
  - `▶️` **Start Dev Server** - Runs `npx rapidkit dev`
  - `🧪` **Run Tests** - Runs `npx rapidkit test` ✨ NEW
  - `🌐` **Open Browser** - Opens Swagger docs with options ✨ NEW
- **📂 Project File Tree** - Expand project to see key files
  - Shows `src/`, `tests/`, config, README
  - Click any file to open it directly
- **🎨 Framework Icons** - Visual distinction for projects
  - 🐍 Green icon for FastAPI (Python)
  - 🔴 Red icon for NestJS (TypeScript)
- **📝 Better Marketplace Description** - Clean architecture focus
- **🐛 No More Workspace Switch** - Clicking project doesn't reload VS Code

---

## Previous Releases

### v0.4.4 (December 22, 2025)

**Doctor Enhancement & Code Quality**

- **🩺 RapidKit npm Check in Doctor** - System check now verifies `npx rapidkit --version`
- **🔄 Dynamic Version Markers** - Marker files now use extension version from package.json
- **🐛 TypeScript Fix** - Added `'preview'` to `RapidKitModule.status` type
- **📝 Documentation** - Updated CHANGELOG links (0.4.0-0.4.3)

---

### v0.4.3 (December 12, 2025)

**UI/UX Enhancements & Complete Module Catalog**

- **🧩 Complete Module Explorer** - 27 modules across 12 categories (AI, Auth, Billing, Business, Cache, Communication, Database, Essentials, Observability, Security, Tasks, Users)
  - All marked as "🔜 Coming Soon" preview
  - Full integration planned for Q1 2026
- **📢 Enhanced Notifications** - Action buttons for better workflow
  - Project creation: `📂 Open in Editor`, `⚡ Open Terminal`, `🧩 Add Modules`, `📖 View Docs`
  - Module addition: `📖 View Module Docs`, `➕ Add Another Module`
  - System check: `📊 View Full Report` or `🔧 View Issues`
- **🎨 Cleaner UI**
  - Removed TEMPLATES tab (redundant)
  - Enhanced ACTIONS panel with categories (Quick Start, Resources, Feedback)
  - Safer context menus - dangerous operations at bottom
- **📊 Better Status Bar** - Shows project count: `🚀 RapidKit | X Projects | Ready`

---

| Version | Date | Highlights |
|---------|------|------------|
| [v0.5.0](releases/RELEASE_NOTES_v0.5.0.md) | Feb 1, 2026 | Core bridge, Python integration, workspace registry |
| [v0.4.7](releases/RELEASE_NOTES_v0.4.7.md) | Jan 23, 2026 | Bug fix & dependency updates, security fixes |
| [v0.4.6](releases/RELEASE_NOTES_v0.4.6.md) | Jan 1, 2026 | Poetry smart detection, update notifications |
| [v0.4.5](releases/RELEASE_NOTES_v0.4.5.md) | Dec 23, 2025 | Project quick actions, no workspace switch |
| [v0.4.4](releases/RELEASE_NOTES_v0.4.4.md) | Dec 22, 2025 | Doctor npm check, dynamic versions |
| [v0.4.3](releases/RELEASE_NOTES_v0.4.3.md) | Dec 12, 2025 | Module explorer, UI enhancements |
| [v0.4.2](releases/RELEASE_NOTES_v0.4.2.md) | Dec 5, 2025 | Logging commands, marketplace improvements |
| [v0.4.1](releases/RELEASE_NOTES_v0.4.1.md) | Dec 4, 2025 | Documentation update, README rewrite |
| [v0.4.0](releases/RELEASE_NOTES_v0.4.0.md) | Dec 3, 2025 | Smart location detection, npm migration |
| [v0.3.1](releases/RELEASE_NOTES_v0.3.1.md) | Dec 3, 2025 | Bug fixes |
| [v0.3.0](releases/RELEASE_NOTES_v0.3.0.md) | Dec 2, 2025 | New features |
| [v0.1.3](releases/RELEASE_NOTES_v0.1.3.md) | Nov 2025 | Improvements |
| [v0.1.2](releases/RELEASE_NOTES_v0.1.2.md) | Nov 2025 | Bug fixes |
| [v0.1.1](releases/RELEASE_NOTES_v0.1.1.md) | Nov 2025 | Minor updates |
| [v0.1.0](releases/RELEASE_NOTES_v0.1.0.md) | Nov 2025 | Initial release |

For complete changelog, see [CHANGELOG.md](CHANGELOG.md).

---

## Links

- 📦 [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=rapidkit.rapidkit-vscode)
- 🐙 [GitHub Repository](https://github.com/getrapidkit/rapidkit-vscode)
- 📚 [Documentation](https://getrapidkit.com/docs)
- 🚀 [npm Package](https://www.npmjs.com/package/rapidkit)
