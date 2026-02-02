# Release Notes

## Latest Release: v0.5.2 (February 2, 2026)

### 🔧 Critical Fixes + UX Enhancements + Workspace Improvements

**Fixed npm caching issues, added standalone mode, improved notifications, enhanced welcome page, and upgraded workspace explorer!**

### What's New

#### 🔧 Critical Fixes

- **NPM Package Caching Fix** - Resolved "Invalid project name" errors
  - All `npx rapidkit` commands now use `npx --yes rapidkit@latest`
  - Always downloads latest version instead of using stale cache
  - Prevents workspace/project creation failures from outdated CLI

- **Doctor Command Accuracy** - Shows real status instead of false positives
  - RapidKit Core changed from optional (warning) to required (fail)
  - npm package now required for full functionality
  - Result properly reflects when components are missing
  - Aligned with Setup Wizard behavior

#### 📦 New Features

- **Standalone Project Mode** - Create projects without workspace
  - 3-option dialog when no workspace exists:
    1. Create Workspace First (Recommended)
    2. Create Standalone Project
    3. Cancel
  - Standalone projects default to `~/RapidKit/rapidkits/`
  - Clear labeling in success messages

- **Command Reference** - Added to Welcome Page
  - 4 collapsible categories with 14 commands
  - Real module slugs (auth_core, db_postgres, redis, email, storage)
  - Copy-to-clipboard with visual feedback
  - Examples for workspace, project, module, and dev commands

- **Recent Workspaces** - Dynamic list in Welcome Page
  - Shows up to 5 most recent workspaces
  - Displays project count and path
  - Click to open workspace
  - Manual refresh button (↻)
  - Auto-refreshes after creating workspace/project

#### ⚡ Workspace Explorer Enhancements

- **Project Count** - Shows in workspace label: "my-workspace (3)"
- **Last Opened Time** - Smart time display:
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

## v0.5.1 (February 2, 2026)

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


## Links

- 📦 [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=rapidkit.rapidkit-vscode)
- 🐙 [GitHub Repository](https://github.com/getrapidkit/rapidkit-vscode)
- 📚 [Documentation](https://getrapidkit.com/docs)
- 🚀 [npm Package](https://www.npmjs.com/package/rapidkit)
