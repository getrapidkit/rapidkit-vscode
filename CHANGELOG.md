# Changelog

All notable changes to the "RapidKit" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]


## [0.6.1] - 2026-02-03

### Added

- 📋 **Copy install commands** on Setup Wizard and Module cards (single-click copy of `rapidkit add module <slug>` and relevant install commands)
- 🖥️ **Manual install** button with terminal-style icon for module cards

### Fixed

- 🛠️ **Setup Status stuck on "Checking..."** — removed interval-based polling and added debounced updates to avoid continuous rechecks and UI flicker
- 🔍 **npm vs pipx detection** — improved detection logic to distinguish npm CLI from pipx-installed RapidKit to prevent false positives
- 📋 **Copy-to-clipboard UX** — unified copy button behavior and added visual feedback for modules and install actions

### Changed

- 🧩 Module Browser: added copy-to-clipboard for module install commands; improved actions layout and consistent button styling
- 🏷️ Header shows current extension version alongside update status (e.g., `v0.6.1 — Up to date`)



## [0.6.0] - 2026-02-03

### Added

- 🎯 **Interactive Module Browser** - Complete module management system
  - Browse 27+ modules with grid/list views
  - Search and category filtering
  - Real-time installation status (installed/update/not-installed)
  - One-click install/update from extension
  - Module details with descriptions and versions
  - Sidebar explorer with module categories
  - Auto-sync status with system environment

- 🔧 **Intelligent Setup Wizard** - Pre-flight validation system
  - Python 3.10+ version checking
  - venv support validation
  - RapidKit Core installation detection
  - npm package verification
  - Package manager (Poetry/pip/pipx) selection
  - Auto-detecting installed environments
  - Platform-specific error messages and guidance

- 📦 **Package Manager Selection** - Multi-method installation
  - Poetry (Recommended) - Automatic virtual environment + dependencies
  - pip (Optional) - Standard Python package manager
  - pipx (Optional) - Isolated tool installation
  - Real-time status detection for each method
  - One-click installation with progress feedback
  - Beginner-friendly explanations for why each is needed

- 📚 **Enhanced Documentation**
  - Updated README with new feature screenshots
  - Simplified setup wizard text for junior developers
  - Visual "RECOMMENDED" badge on Poetry card
  - Better error guidance with platform-specific fixes

### Improved

- Python environment detection now uses 8 different methods
- Auto-closing progress notifications (800ms)
- Module state synchronization across all UI components
- Better error messages with actionable guidance
- Workspace creation properly blocks on missing prerequisites
- Installation method cards with visual feedback

## [0.5.2] - 2026-02-02

### Fixed

- 🔧 **NPM Package Caching Issue** - Always use latest rapidkit npm package
  - Added `--yes` and `@latest` flags to all `npx rapidkit` commands
  - Prevents using cached outdated versions of rapidkit CLI
  - Ensures workspace/project creation always uses latest available version
  - Fixes "Invalid project name" errors caused by old cached CLI versions
  - Updated 15 files: rapidkitCLI.ts, doctor.ts, firstTimeSetup.ts, updateChecker.ts, and more

- 🩺 **Doctor Command Accuracy** - Fixed false positive "All checks passed"
  - RapidKit Core changed from optional (warning) to required (fail)
  - npm package now required for full functionality
  - Command properly fails when critical components missing
  - Aligned with Setup Wizard behavior
  - Now shows accurate system status

- 💬 **Notification Polish** - All notifications now have "OK" button
  - Fixed notifications that couldn't be closed
  - Updated 9 files with proper button handling
  - Removed duplicate "Creating workspace..." notification
  - Better user experience with dismissible messages

### Added

- 📦 **Standalone Project Mode** - Create projects without workspace
  - When creating a project without an existing workspace, users now get 3 options:
    1. Create Workspace First (Recommended) - Full workspace setup then project
    2. Create Standalone Project - Direct project creation without workspace
    3. Cancel
  - Standalone projects are created at `~/RapidKit/rapidkits/` by default
  - Seamless workflow: Creating workspace first automatically prompts for project creation
  - Clear labeling of projects as "standalone" or "workspace" in success messages

- 📋 **Command Reference** - Added to Welcome Page
  - 4 collapsible categories with 14 commands total
  - Workspace Commands (2): Create workspace with various options
  - Project Commands (4): FastAPI/NestJS project creation and dev server
  - Module Commands (5): Real module slugs (auth_core, db_postgres, redis, email, storage)
  - Development & Utilities (3): doctor, version, help commands
  - Copy-to-clipboard functionality with visual feedback (✓ Copied!)
  - Expandable/collapsible categories with ▼ toggle
  - Professional code blocks with hover effects

- 📂 **Recent Workspaces** - Dynamic list in Welcome Page
  - Shows up to 5 most recent workspaces
  - Displays project count and path for each workspace
  - Click to open workspace directly
  - Manual refresh button (↻) for updating list
  - Auto-refreshes after creating workspace or project
  - Empty state with helpful message
  - Sorted by last accessed time

- ⚡ **Workspace Explorer Enhancements**
  - **Project Count**: Shows in label format "workspace-name (3)"
  - **Last Opened Time**: Smart time formatting
    - "Just now" (< 1 minute)
    - "15m ago" (< 1 hour)
    - "3h ago" (< 24 hours)
    - "2d ago" (< 7 days)
    - Hidden after 7 days
  - **Status Icons**: Visual indicators for workspace state
    - Active: 🟢 with green folder-opened icon
    - Inactive: purple folder-library icon
  - **Time Tracking**: Automatic lastAccessed timestamp
    - Updates when workspace selected
    - Persists to workspaces.json
    - Used for sorting in Recent Workspaces

### Changed

- Updated all CLI invocations to use `npx --yes rapidkit@latest` instead of `npx rapidkit`
- Improved reliability of workspace and project creation commands
- Welcome Page icons updated for professionalism:
  - 💻 VS Code Extension (was 🎨)
  - 🔍 System Check (was 🩺)
  - ⚡ Key Features (was ✨)
- Refresh icons changed from 🔄 to ↻ (minimal and clear)
- Welcome Panel now auto-refreshes after workspace/project creation
- Stored extension context globally for cross-file access
- Enhanced tooltips in workspace explorer with more details

## [0.5.1] - 2026-02-02

### Added

- 🔍 **Comprehensive Python Detection** - 8-method detection for rapidkit-core package
  - Method 1: Python import check
  - Method 2: `python -m pip show`
  - Method 3: Direct pip/pip3 commands
  - Method 4: pyenv versions checking (solves pyenv issue!)
  - Method 5: User site-packages detection
  - Method 6: pipx list checking
  - Method 7: poetry show checking
  - Method 8: conda list checking
  - Handles complex Python environments (pyenv, virtualenv, poetry, conda, pipx)
  - Falls back gracefully when one method fails

- 🧙 **Interactive Setup Wizard** - Integrated into Welcome page
  - Real-time detection of npm and Python Core packages
  - Visual status indicators (✓ installed, ⚠ missing, ⏳ checking)
  - One-click installation with proper npm/pip commands
  - Refresh button to recheck status after installation
  - Progress tracking (X/2 components installed)
  - Persistent state (remembers if user dismissed wizard)
  - Enabled "Finish Setup" button only when both ready
  - Runs doctor command on completion

- 📋 **Comprehensive Doctor Command** - Enhanced system diagnostics
  - Checks Python version and availability
  - Detects rapidkit-core with version checking
  - Verifies venv support
  - Checks Node.js availability
  - Detects Poetry installation and version
  - Checks Git availability
  - Detects npm package (global vs npx cache)
  - Fetches latest versions from registries
  - Shows available updates with version comparisons

- 🎯 **New checkSystem Command** - Quick system status check
  - Shows package installation status
  - Displays version information
  - Checks for available updates
  - Shows installation location
  - Provides installation suggestions

- 📚 **Extensive Documentation** - 5 new comprehensive guides
  - `PYTHON_DETECTION_METHODS.md` - All 8 detection methods explained with scenarios
  - `SETUP_WIZARD_UPDATE.md` - Complete wizard implementation details
  - `WIZARD_TESTING.md` - 10 test cases with step-by-step instructions
  - `WIZARD_VISUAL_GUIDE.md` - UI mockups and interaction flows
  - `WORKSPACE_COMPARISON.md` - Fallback workspace structure documentation

### Changed

- 🧹 **Removed auto-create default workspace** - User must manually create workspace now
  - Prevents unnecessary folder creation
  - Cleaner first-time experience
  - User explicitly chooses workspace location

- 🎨 **Redesigned Actions Panel** - More compact button layout
  - Changed from single-row to 3-column grid
  - Added "Welcome" button for easy access
  - Smaller icons and labels for better space usage
  - Added tooltips for clarity
  - Added new "Check" button for system diagnostics

- 📖 **Welcome Page Styling** - Responsive and compact design
  - Reduced padding and margins for tighter layout
  - Smaller header and logo sizes
  - Improved responsive grid for mobile
  - Better visual hierarchy
  - Enhanced button hover states

### Fixed

- 🐛 **pyenv Python detection** - Now properly detects rapidkit-core in pyenv versions
  - Checks all pyenv Python versions, not just system
  - Uses both `pyenv exec` and direct path methods
  - Solves issue where package in v3.10.19 wasn't detected when global=3.13.5

- 🐛 **Workspace already exists handling** - Returns existing workspace instead of error
  - Silently skips duplicate workspace additions
  - Prevents duplicate notifications
  - Better user experience when adding same workspace twice

- 🐛 **Extension activation flow** - Removed async initialization race conditions
  - Fixed timing issues with context key setup
  - Improved command registration reliability
  - Better error handling during activation

### Documentation

- 📖 Translated all Persian documentation to English
  - PYTHON_DETECTION_METHODS.md now fully English
  - Improved clarity for international users
  - Better maintainability

### Technical Details

**New Files:**
- `src/commands/checkSystem.ts` — Quick system status check
- `src/utils/errorParser.ts` — Error parsing and suggestions
- `docs/PYTHON_DETECTION_METHODS.md` — Detection methods documentation
- `docs/SETUP_WIZARD_UPDATE.md` — Setup wizard implementation guide
- `docs/WIZARD_TESTING.md` — Comprehensive test cases
- `docs/WIZARD_VISUAL_GUIDE.md` — UI/UX documentation
- `docs/WORKSPACE_COMPARISON.md` — Workspace structure reference
- `releases/RELEASE_NOTES_v0.5.1.md` — Release notes

**Modified Files:**
- `src/commands/doctor.ts` — Added version checking and npm detection
- `src/utils/pythonChecker.ts` — Added 8-method detection (4 more methods)
- `src/ui/panels/welcomePanel.ts` — Complete wizard integration
- `src/ui/webviews/actionsWebviewProvider.ts` — 3-column layout
- `src/extension.ts` — Removed auto-workspace, added checkSystem command
- `src/core/workspaceManager.ts` — Better duplicate handling
- `package.json` — Updated to v0.5.1
- `README.md` — Updated for new features
- `CHANGELOG.md` — This entry
- `RELEASE_NOTES.md` — Updated latest release

## [0.5.0] - 2026-02-01

### Added

- 📋 **Shared Workspace Registry** - Cross-tool workspace discovery with npm package
  - Registry stored at `~/.rapidkit/workspaces.json`
  - Extension auto-detects workspaces created via npm package
  - npm package can list workspaces created by Extension
  - Workspace detection from any subdirectory using registry fallback

### Changed

- 🏷️ **Unified Workspace Signature** - Changed from `RAPIDKIT_VSCODE_WORKSPACE` to `RAPIDKIT_WORKSPACE`
  - Improves cross-tool compatibility with npm package
  - Constants centralized in `constants.ts` (no hardcoded strings)
  - Workspace markers include `createdBy: 'rapidkit-vscode'` for attribution
  - Backward compatible: Both old and new signatures are recognized

- 🔍 **Enhanced Workspace Detection** - Multi-layer workspace discovery
  - Primary: `.rapidkit-workspace` marker file with signature validation
  - Fallback: Structure detection (pyproject.toml + .venv + rapidkit script)
  - Last resort: Shared registry lookup (`~/.rapidkit/workspaces.json`)

- 🎯 **Project Selection UX** - Visual indicators for selected project
  - Checkmark (✓) shows currently selected project
  - Blue color highlight for active selection
  - Tooltip displays selection status
  - Better guidance when project selection required

### Fixed

- ✅ **Workspace Creation** - Removed unnecessary Python validation
  - Workspace creation no longer requires Python pre-flight checks
  - Python only needed for project creation (not workspace structure)
  - Clearer error messages distinguish workspace vs project requirements

- ✅ **Module Addition** - Robust workspace detection
  - Uses `findWorkspace` utility with registry fallback
  - Clear messages showing installation target
  - Better error handling when workspace not found

- ✅ **Attribution Consistency** - All workspace markers use correct constants
  - Fixed hardcoded strings in `extension.ts`, `createWorkspace.ts`, `createProject.ts`
  - Centralized constants prevent attribution mismatches
  - Proper `createdBy` tracking (Extension vs npm package)

### Documentation

- 📝 Added workspace registry documentation to README
- 📝 Documented cross-tool compatibility workflow
- 📝 Added examples for npm/Extension interoperability

- **🐍 Python Core Bridge** - Direct integration with `rapidkit-core` Python engine
  - Smart Python detection with 3 resolution scenarios (System Python with core, System Python without core, No Python)
  - Cached venv management in `~/.cache/rapidkit/` (prevents repeated setup)
  - JSON result protocol aligned with npm package for reliable interop
  - Auto-fallback chain: System → Cached Venv → Workspace Venv
  - Zero-configuration: Works out of the box across platforms

- **🔗 Cross-platform Exec Utilities** - Stable command execution
  - Transparent handling of `python3` (Unix) vs `python` (Windows)
  - Proper stdout/stderr capture and exit code handling
  - Timeout management to prevent hanging commands
  - Process isolation with automatic cleanup

- **🎯 Project Context Tracking** - Enhanced project/workspace awareness
  - Tracks selected project in workspace
  - Provides context for module commands
  - Better command routing based on project type (FastAPI vs NestJS)

- **📦 Bridge-Aware Doctor Command** - System diagnostics include Python engine
  - Checks Python availability
  - Verifies `rapidkit-core` installation
  - Detects cached bridge environments
  - npm integration status

### Changed

- **🔄 All commands delegate to Python Core** - Extension is now a smart UX bridge
  - `createWorkspace` → Python engine via bridge
  - `createProject` → Python engine via bridge
  - `addModule` → Python engine via bridge
  - `doctor` → Includes Python/core diagnostics
  - Single source of truth: Python engine handles all generation logic

- **🔄 Workspace Detection Enhanced**
  - Auto-discovers RapidKit workspaces in standard locations
  - Better marker file handling (npm-compatible `RAPIDKIT_VSCODE_WORKSPACE`)
  - Remembers last-selected workspace per project
  - Supports custom workspace paths

- **🔄 Module Explorer Refactored** - Using Python bridge
  - Queries modules from Python engine
  - Better module search and filtering
  - Aligned with npm package module catalog

- **🔄 Aligned with rapidkit-npm v0.15.1**
  - Marker format: `RAPIDKIT_VSCODE_WORKSPACE`, `createdBy: rapidkit-npm`
  - Do not overwrite marker when npm already wrote it
  - Constants: `MARKERS.WORKSPACE_SIGNATURE` = `RAPIDKIT_VSCODE_WORKSPACE`
  - API alignment: `RapidkitJsonResult<T>` protocol

### Fixed

- 🐛 Workspace context lost when quick-switching between projects
- 🐛 Module commands failing due to missing project context
- 🐛 Cross-platform Python inconsistencies (hardcoded `python3` paths)
- 🐛 Process cleanup on command timeout

### Technical Details

**New Files:**
- `src/core/bridge/pythonRapidkit.ts` — Python bridge with Scenario A/B/C resolution
- `src/utils/exec.ts` — Cross-platform command execution wrapper
- `src/core/selectedProject.ts` — Project context management

**Refactored Files:**
- `src/core/rapidkitCLI.ts` — Bridge integration
- `src/commands/{addModule,createProject,createWorkspace,doctor}.ts` — Bridge delegation
- `src/core/{workspaceDetector,workspaceManager}.ts` — Enhanced detection
- `src/ui/treeviews/moduleExplorer.ts` — Python bridge backend
- `src/utils/constants.ts` — Marker alignment

---

## [0.4.7] - 2026-01-23

### Fixed

- **🐛 Missing workspace directory handling** - Fixed crash when selected workspace no longer exists
  - Extension now detects when workspace directory has been deleted
  - Shows helpful options: "Recreate Workspace", "Choose New Location", or "Cancel"
  - Automatically recreates workspace if user chooses to do so
  - Prevents `ENOENT: no such file or directory` error when creating projects
  - No need to restart VS Code if workspace is accidentally deleted

### Changed

- **📦 Updated dependencies** - Updated 11 packages to latest stable versions
  - @types/node: 20.19.24 → 20.19.30
  - @types/vscode: 1.106.1 → 1.108.1
  - @typescript-eslint/\*: 8.48.1 → 8.53.1
  - vitest: 4.0.15 → 4.0.18
  - @vitest/coverage-v8: 4.0.15 → 4.0.18
  - prettier: 3.7.4 → 3.8.1
  - fs-extra: 11.3.2 → 11.3.3
  - @vscode/test-cli: 0.0.4 → 0.0.12
  - Fixed 3 security vulnerabilities (1 low, 2 moderate)
- **🔄 Compatibility** - Synced with rapidkit-npm v0.14.2
  - Compatible with latest npm package features
  - Aligned documentation and messaging

## [0.4.6] - 2026-01-01

### Added

- **🐍 Smart Poetry virtualenv detection** - Extension now detects Poetry virtualenvs in cache
  - Checks both `.venv` in project directory and Poetry cache (`~/.cache/pypoetry/virtualenvs/`)
  - Uses `poetry env info --path` to find virtualenv location
  - Eliminates false "not initialized" warnings for Poetry projects
  - Synced with rapidkit-npm v0.14.1 Poetry detection improvements
- **🔔 Update notification system** - Automatic checks for rapidkit npm package updates
  - Checks NPM registry every 24 hours for new versions
  - Shows notification with update, release notes, and dismiss options
  - Manual check command: `RapidKit: Check for Updates`
  - Respects user preferences (can dismiss specific versions)
- **📦 Enhanced Doctor command** - Better Poetry detection in system check
  - Shows exact Poetry version instead of raw output
  - Improved error messages and recommendations

### Changed

- **🧹 Removed redundant activationEvents** - Cleaned up package.json
  - VS Code auto-generates activation events from contributes
  - Removed 26 lines of deprecated configuration
  - No functional changes, just cleaner code

### Fixed

- **🐛 Poetry cache virtualenv support** - FastAPI projects no longer show false initialization warnings
  - Before: Extension only checked for `.venv` folder
  - After: Checks Poetry cache, `.venv`, and Poetry config
  - Aligns with rapidkit-npm v0.14.1 behavior

## [0.4.5] - 2025-12-23

### Added

- **🖼️ rapidkit.svg** - Official RapidKit brand icon in SVG format
  - 3-layer design: shadow (#1C1C1C), main R (#00CFC1), crown (#1C1C1C)
  - 24x24 viewBox, scalable to any size
- **🎨 ACTIONS WebviewView** - Completely redesigned sidebar with professional buttons
  - Replaced TreeView with WebviewView for rich UI
  - Minimal, compact design (GitLens-style)
  - Inline SVG icons (codicons don't work in webviews)
  - Framework badges: `PY` for FastAPI, `TS` for NestJS
  - Smooth hover effects with brand colors
  - Organized sections: Create, Tools, Resources
- **⚡ Project Quick Actions** - 5 inline action buttons on each project in PROJECTS panel
  - `$(terminal)` **Open Terminal** - Opens terminal in project directory
  - `$(package)` **Install Dependencies** - Runs `npx rapidkit init`
  - `$(play)` **Start Dev Server** - Runs `npx rapidkit dev`
  - `$(beaker)` **Run Tests** - Runs `npx rapidkit test` ✨ NEW
  - `$(globe)` **Open Browser** - Opens `localhost:8000/docs` with options ✨ NEW
- **📂 Project File Tree** - Expand project to see key files
  - Shows `src/`, `tests/`, config files, README
  - Click any file to open it in editor
  - Smart detection based on framework (FastAPI vs NestJS)

### Changed

- **🎨 Welcome Panel SVG Logo** - Upgraded from PNG to SVG for better quality
  - Uses `rapidkit.svg` instead of `icon.png`
  - Crisp rendering at any size
  - Official brand colors: #00CFC1 (cyan) + #1C1C1C (shadow)
- **📝 Better Description** - Updated marketplace description to match website
  - New: "Scaffold production-ready FastAPI & NestJS APIs with clean architecture"
- **🎨 Improved Project Icons** - Framework-specific icons and colors
  - 🐍 Python icon (green) for FastAPI projects
  - 🟢 Class icon (red) for NestJS projects
- **📖 README Sync** - Aligned with npm package documentation
  - Commands now show `npx rapidkit` prefix
  - Python requirement updated to 3.11+
  - Added 27+ modules link

### Fixed

- **🐛 Remove annoying workspace switch** - Clicking project no longer switches VS Code workspace
  - Before: Click = reload entire VS Code with new workspace 😱
  - After: Click = expand/collapse, use action icons instead ✅
- **🐛 rapidkitTemplates error** - Removed orphan TreeView registration
  - Fixed "No view is registered with id: rapidkitTemplates" notification

### Requirements

- **VS Code** 1.100+ (updated from 1.85)

## [0.4.4] - 2025-12-22

### Added

- **🩺 RapidKit npm check in Doctor** - System check now verifies `npx rapidkit --version`
  - Shows installed version or "Not cached" status
  - Helps diagnose npm package availability

### Changed

- **🔄 Dynamic version markers** - Marker files now use extension version from package.json
  - New `getExtensionVersion()` utility function
  - Centralized constants in `utils/constants.ts`
  - No more hardcoded version strings

### Fixed

- **🐛 TypeScript error** - Added `'preview'` to `RapidKitModule.status` type
  - Fixed 30 compilation errors in `moduleExplorer.ts`
- **📝 CHANGELOG links** - Updated version links to include all releases (0.4.0-0.4.3)

## [0.4.3] - 2025-12-12

### Added

- **🧩 Enhanced Module Explorer** - Complete module catalog with 27 modules across 12 categories
  - 🌟 AI (1 module)
  - 🛡️ Authentication (5 modules)
  - 💳 Billing (3 modules)
  - 💼 Business (1 module)
  - ⚡ Cache (1 module)
  - 📧 Communication (2 modules)
  - 🗄️ Database (3 modules)
  - 🔧 Essentials (4 modules)
  - 📊 Observability (1 module)
  - 🔒 Security (3 modules)
  - ✅ Tasks (1 module)
  - 👤 Users (2 modules)
  - All modules marked with "🔜 Coming Soon" preview status

### Changed

- **🎨 UI/UX Improvements**
  - Removed TEMPLATES tab (redundant, simplified sidebar)
  - Enhanced ACTIONS panel with categorized links (Quick Start, Resources, Feedback)
  - Optimized context menus - moved dangerous operations (Delete, Remove) to bottom using `z_danger@99` group
  - Upgraded status bar to show project count: `🚀 RapidKit | X Projects | Ready`
- **📢 Enhanced Notifications** - Added action buttons for better workflow
  - After project creation: `📂 Open in Editor`, `⚡ Open Terminal`, `🧩 Add Modules`, `📖 View Docs`
  - After adding module: `📖 View Module Docs`, `➕ Add Another Module`
  - System check results: `📊 View Full Report` or `🔧 View Issues`
- **📝 Welcome Page** - Updated version reference to `v0.4.x` for consistency

### Fixed

- Doctor command async/await handling for notification action buttons
- Terminal integration for post-creation workflows

## [0.4.2] - 2025-12-05

### Added

- **🪵 Logging Commands** - New command palette options for log management
  - `rapidkit.showLogs` - Display RapidKit logs output panel
  - `rapidkit.closeLogs` - Close the logs panel
  - `rapidkit.clearLogs` - Clear all logs output
- **Logger Enhancements**
  - Added `clear()` method to Logger class
  - Added `getOutputChannel()` method for direct OutputChannel access

### Changed

- **📺 Marketplace Presentation**
  - Replaced static PNG screenshot with animated GIF (1200×642px)
  - Removed duplicate icon from README
  - Optimized README layout for marketplace gallery

## [0.4.1] - 2025-12-04

### Changed

- 📝 **Updated notification messages** for rapidkit npm v0.12.3 smart CLI delegation
  - Project success: Shows `rapidkit init && rapidkit dev` (no source activate needed)
  - Workspace success: Shows `rapidkit create` command tip
- 📚 **New README** - Completely rewritten for clarity and quick reference
  - Added screenshot for marketplace gallery
  - Simplified structure with project commands and keyboard shortcuts
  - Clear requirements table

### Documentation

- 📁 Moved all release notes to `releases/` folder for cleaner root
- Created main `RELEASE_NOTES.md` with links to history
- Removed `.vsix` files from git tracking
- Added `preview` and `qna` fields to package.json for marketplace

## [0.4.0] - 2025-12-03

### 🚀 **MAJOR REFACTORING: Complete Migration to npm Package**

This is a **breaking change** that completely refactors the extension to use the RapidKit npm package instead of Python CLI.

### Changed

- 🔄 **Complete architecture overhaul** - Migrated from Python-based CLI to npm package
  - **RapidKitCLI Class**: Completely rewritten to use `npx rapidkit` commands
  - Removed Python/Poetry dependencies - no longer required
  - Workspace creation: `npx rapidkit <workspace-name>`
  - Project creation: `npx rapidkit <project> --template <fastapi|nestjs>`
  - Workspace projects: `rapidkit create <project> --template <template>`
  - All CLI commands use `--yes` flag for non-interactive mode

- 📦 **Smart Location Detection** - Intelligent workspace and project location management
  - **3-Scenario Detection**: Selected workspace → Current RapidKit workspace → Ask user
  - **Default Workspace**: `~/RapidKit/rapidkits/` (automatically created if needed)
  - **Custom Locations**: Full support for user-selected directories outside RapidKit
  - **Auto-Registration**: Workspaces automatically added to manager after creation
  - **Marker Files**: `.rapidkit-workspace` created for custom locations to enable extension recognition

- 🎯 **Simplified wizards**
  - **WorkspaceWizard**: Only asks for workspace name (location always `~/RapidKit/`)
  - **ProjectWizard**: Accepts preselected framework for direct FastAPI/NestJS creation
  - Removed package manager selection (always uses npm)
  - Removed git initialization prompt (always enabled)
  - Streamlined user experience with fewer prompts

- ⚡ **Updated commands**
  - `createWorkspace`: Uses `npx rapidkit` to create workspace containers
  - `createProject`: Smart location detection with default/custom choice
  - `createFastAPIProject`: Direct FastAPI project creation (NEW)
  - `createNestJSProject`: Direct NestJS project creation (NEW)
  - `openDocs`: Open RapidKit documentation (NEW)

- 🎨 **Button-Style Actions UI** - Professional action buttons in sidebar
  - Removed traditional tree view items
  - Added button-style actions similar to Source Control view
  - Proper newline formatting for better UX
  - Quick access to Create Workspace, FastAPI, and NestJS projects

- 🔧 **Type system updates**
  - Simplified `WorkspaceConfig`: Removed `mode`, `installMethod`, `pythonVersion`
  - Simplified `ProjectConfig`: Removed `kit`, `modules`, `author`, `license`, `description`
  - Focused on essential configuration only

- ✅ **Enhanced Workspace Validation** - No more annoying confirmation dialogs
  - Accepts workspaces with `.rapidkit/` directory (npm CLI created)
  - Accepts workspaces with `.rapidkit-workspace` marker (extension created)
  - Supports both old (`RAPIDKIT_VSCODE_WORKSPACE`) and new (`rapidkit-vscode`) signatures
  - Silently skips invalid folders instead of prompting user

### Removed

- ❌ **Python CLI dependencies**: No longer depends on Python RapidKit CLI
- ❌ **Generate Demo feature**: Removed (unnecessary with only 2 templates)
- ❌ **Demo workspace mode**: Workspaces are now standard npm package workspaces
- ❌ **Kit selection**: Templates are managed by npm package
- ❌ **Module wizard step**: Module installation moved to post-creation workflow
- ❌ **Poetry integration**: Not needed anymore
- ❌ **Annoying confirmation dialogs**: "Add it anyway?" removed

### Added

- ✨ **npm package integration**: Full integration with `rapidkit` npm package (v0.12.1+)
- ✨ **Smart location choice**: Default workspace vs Custom location with intelligent detection
- ✨ **Marker file system**: `.rapidkit-workspace` files for custom location recognition
- ✨ **Auto-registration**: Workspaces automatically appear in list after creation
- ✨ **Direct framework commands**: Separate commands for FastAPI and NestJS
- ✨ **Better error handling**: Contextual help links to documentation
- ✨ **Improved progress reporting**: More accurate progress indicators
- ✨ **Verification steps**: Automatic project/workspace verification after creation
- ✨ **Parent directory creation**: `fs.ensureDir()` before all CLI calls to prevent ENOENT errors

### Fixed

- 🐛 **Fixed interactive prompts blocking**: Added `--yes` flag to all CLI commands
- 🐛 **Fixed custom location not showing in list**: Auto-registration after project creation
- 🐛 **Fixed workspace validation**: Enhanced to accept npm CLI created workspaces
- 🐛 **Fixed directory creation errors**: Parent directories created before CLI execution
- 🐛 **Fixed import order conflict**: Moved path import inside function to avoid variable shadowing

### Benefits

- 🎯 **Simpler**: No Python/Poetry installation required
- ⚡ **5-6x Faster**: Direct npm execution vs Python environment setup
- 🔄 **Consistent**: Single source of truth (npm package) for templates
- 🐛 **Fewer bugs**: Less complexity = fewer edge cases
- 📦 **Smaller**: Removed bundled templates (managed by npm package)
- 🎨 **Better UX**: Smart defaults, no annoying dialogs, professional UI

### Migration Notes

- **For Users**: Extension now requires Node.js/npm (already available in VS Code)
- **For Developers**: Python RapidKit CLI no longer needed for development
- **Workspaces**: Existing workspaces continue to work, new API for creation
- **Templates**: Managed by npm package, always up-to-date
- **Custom Locations**: Now fully supported with marker files

### Technical Details

- Updated `RapidKitCLI` class with new methods:
  - `createWorkspace(options)`: Workspace creation with `--yes` flag
  - `createProject(options)`: Standalone project creation with `--yes` flag
  - `createProjectInWorkspace(options)`: Project inside workspace with `--yes` flag
- Enhanced `WorkspaceManager.isRapidKitWorkspace()` to check both `.rapidkit/` and marker files
- Refactored all command handlers to use new CLI API
- Updated TypeScript types to match new simplified workflow
- Removed legacy Python CLI integration code
- Added marker file creation for custom locations

## [0.3.2] - 2025-12-03

### Changed

- 🌐 **Updated domain references** - Migrated all URLs from `rapidkit.top` to `getrapidkit.com`
  - Updated package.json viewsWelcome contents
  - Updated README.md documentation links and support email
  - Updated source files (createWorkspace.ts, welcomePanel.ts)
  - Updated CONTRIBUTING.md contact information
  - Updated schema URLs to use new domain
- ⚡ **Enhanced development workflow** - Added comprehensive developer tools
  - Added `husky` for Git hooks management
  - Added `lint-staged` for pre-commit code quality checks
  - Added `typecheck` script for TypeScript validation
  - Added `validate` script combining typecheck, lint, format check, and tests
  - Configured pre-commit hook to run lint-staged automatically
- 📦 **Updated dependencies** - Upgraded to latest stable versions
  - Updated `@types/vscode` to 1.106.1
  - Updated `@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser` to 8.48.1
  - Updated `@vitest/coverage-v8` and `vitest` to 4.0.15
  - Updated `@vscode/vsce` to 3.7.1
  - Updated `execa` to 9.6.1
  - Updated `prettier` to 3.7.4
  - Updated `yaml` to 2.8.2
  - Updated `lint-staged` to 16.2.7

### Fixed

- 🔒 **Security improvements** - Fixed npm audit vulnerabilities
  - Fixed glob vulnerability (GHSA-5j98-mcp5-4vw2)
  - Fixed js-yaml prototype pollution (GHSA-mh29-5h37-fv8m)
  - Resolved all moderate and high severity vulnerabilities
- 🐛 **Code quality fixes** - Cleaned up ESLint warnings
  - Fixed empty catch blocks in generateDemo.ts
  - Added meaningful comments to intentionally empty catch blocks
  - Reduced ESLint warnings from 13 to 9 (errors eliminated)

### Documentation

- 📚 Updated all documentation links to point to getrapidkit.com
- 📧 Updated support email to support@getrapidkit.com
- 🔗 Updated schema references to use new domain

## [0.3.1] - 2025-11-15

### Fixed

- 🐛 **Fixed code quality warnings** - Addressed 9 ESLint warnings related to unused error variables
  - Prefixed unused error variables with underscore (`_error`) per ESLint rules in:
    - `src/commands/doctor.ts` (4 warnings fixed)
    - `src/core/workspaceManager.ts` (4 warnings fixed)
    - `src/ui/treeviews/projectExplorer.ts` (1 warning fixed)
  - Improved error handling patterns for consistency

### Changed

- Modified test infrastructure to disable Vitest tests until VS Code mocking is properly configured
- Updated npm test script to focus on compilation and linting verification
- Updated vitest.config.ts to exclude test files requiring VS Code API

## [0.3.0] - 2025-11-10

### Fixed

- 🐛 **CRITICAL FIX: Fixed Generate Demo Project hanging issue** - The command was using `stdio: 'pipe'` which prevented output from being shown to users, making it appear frozen
  - Changed `stdio: 'pipe'` to `stdio: 'inherit'` in `RapidKitCLI.generateDemo()`
  - Changed `stdio: 'inherit'` in `RapidKitCLI.createWorkspace()` for consistent output streaming
  - Progress indicator now updates every 500ms so users can see the operation is running
- Fixed Generate Demo Project button to work correctly with demo workspaces
- Fixed command to automatically detect and use `generate-demo.js` script in demo workspaces
- Added automatic workspace context retrieval when Generate Demo button is clicked
- Demo workspaces now properly generate projects without requiring folder selection

### Changed

- Improved `generateDemoCommand` to accept workspace parameter and retrieve selected workspace from context
- Added progress interval tracking during demo project generation
- Added `rapidkit.getSelectedWorkspace` command to ProjectExplorer for getting current workspace
- Enhanced demo workspace detection logic to check for `generate-demo.js` file

## [0.2.0] - 2025-11-08

### Changed

- ⚡ **Bundle Optimization**: Reduced extension bundle size by 55% (464KB → 209KB)
- Enabled aggressive tree-shaking to remove unused code
- Removed console.log statements and debugger calls in production builds
- Removed legal comments from bundled output
- Improved extension load time and performance

### Fixed

- Fixed production mode detection in esbuild configuration (now supports both `--production` flag and `NODE_ENV=production`)

## [0.1.3] - 2025-11-07

### Fixed

- Fixed NestJS projects not appearing in Projects view
- Project explorer now correctly detects both FastAPI (pyproject.toml) and NestJS (package.json) projects

### Changed

- Simplified kit selection to show only `standard` kit for both frameworks
- Removed incomplete kits (advanced, ddd) from project creation wizard until they are fully ready

## [0.1.2] - 2025-11-07

### Fixed

- 🔥 **CRITICAL FIX**: Fixed commands not being registered when installed from VSIX package
- Fixed missing runtime dependencies in packaged extension causing activation failures
- Fixed "command 'rapidkit.createWorkspace' not found" errors
- Fixed "command 'rapidkit.addWorkspace' not found" errors
- Fixed "command 'rapidkit.refreshWorkspaces' not found" errors
- Updated `.vscodeignore` to include all necessary `node_modules` dependencies
- All buttons and commands now work correctly in installed VSIX

### Changed

- Improved dependency packaging to ensure runtime libraries are available
- Updated build configuration to prevent pruning of required dependencies
- Updated Vitest to v4.0.7 to align with @vitest/coverage-v8 peer requirements

## [0.1.1] - 2025-11-07

### Fixed

- 🔧 Fixed workspace and project selection context keys not being set properly
- Fixed buttons in workspace explorer not becoming enabled after selecting workspace
- Fixed project creation button not working in Projects view
- Fixed context menu items not appearing due to context key timing issues
- Improved async handling of context key updates to ensure proper UI state

## [0.1.0] - 2025-11-07

### Added

- 🎉 Initial pre-release version
- Workspace creation wizard with interactive prompts
- Project generation for FastAPI and NestJS frameworks
- Module browser with 100+ modules organized by category
- Template preview with syntax highlighting
- Project explorer tree view
- Module explorer tree view
- Template explorer tree view
- Workspace explorer tree view
- Status bar integration with real-time updates
- System doctor for checking requirements (Python, Node.js, Poetry, Git)
- IntelliSense providers:
  - Code actions for quick fixes
  - Completion provider for configuration files
  - Hover provider for inline documentation
- Code snippets:
  - 6 Python snippets (FastAPI routes, services, repositories, tests)
  - 6 TypeScript snippets (NestJS modules, controllers, services, DTOs)
  - 5 YAML snippets (module configs, profiles, workspace definitions)
- JSON schema validation:
  - `.rapidkitrc.json` schema
  - `rapidkit.json` schema
  - `module.yaml` schema
- Commands:
  - `rapidkit.createWorkspace` - Create new RapidKit workspace
  - `rapidkit.createProject` - Create new project
  - `rapidkit.addModule` - Add module to project
  - `rapidkit.generateDemo` - Generate demo project
  - `rapidkit.previewTemplate` - Preview template
  - `rapidkit.doctor` - Check system requirements
  - `rapidkit.showWelcome` - Show welcome panel
  - `rapidkit.refreshProjects` - Refresh project list
  - `rapidkit.refreshWorkspaces` - Refresh workspace list
- Keyboard shortcuts:
  - `Ctrl+Shift+R Ctrl+Shift+W` - Create workspace
  - `Ctrl+Shift+R Ctrl+Shift+P` - Create project
  - `Ctrl+Shift+R Ctrl+Shift+M` - Add module
- Welcome webview panel with quick actions
- Template preview webview panel
- File watchers for auto-refresh on changes
- Configuration options:
  - `rapidkit.pythonVersion` - Python version requirement
  - `rapidkit.nodeVersion` - Node.js version requirement
  - `rapidkit.defaultFramework` - Default framework selection
  - `rapidkit.showWelcomeOnStartup` - Show welcome on startup
  - `rapidkit.autoRefresh` - Auto-refresh on file changes
  - `rapidkit.debug` - Enable debug logging
- Context menu integration
- Activity bar integration with RapidKit icon
- Output channel for detailed logging
- Demo mode for quick workspace creation
- Package manager selection for NestJS projects (npm, yarn, pnpm)

### Fixed

- NestJS project creation package manager parameter handling
- Extension activation on startup
- Command registration order for reliable button functionality

---

## Release Notes

### 0.1.0

🎉 **First Pre-Release**

Welcome to RapidKit for Visual Studio Code! This is the first pre-release of the official VS Code extension for RapidKit.

**Key Features:**

- 🚀 Create workspaces and projects with interactive wizards
- 🧩 Browse and install 100+ modules
- 📦 Preview templates before generation
- 💡 IntelliSense support for configuration files
- 📝 Code snippets for FastAPI and NestJS
- 🔧 System doctor for troubleshooting

**Getting Started:**

1. Click the RapidKit icon in the Activity Bar
2. Click "Create New Workspace" to get started
3. Follow the wizard to create your first project
4. Add modules from the Module Explorer
5. Start coding!

**Important Notes:**

- This is a pre-release version - please report any issues
- Demo mode is enabled by default for easy testing
- Full mode will be available in future stable releases

**Feedback:**
We'd love to hear your feedback! Please report issues or suggestions on our [GitHub repository](https://github.com/getrapidkit/rapidkit-vscode/issues).

Thank you for using RapidKit! 🚀

---

[Unreleased]: https://github.com/getrapidkit/rapidkit-vscode/compare/v0.6.1...HEAD
[0.6.1]: https://github.com/getrapidkit/rapidkit-vscode/releases/tag/v0.6.1
[0.4.5]: https://github.com/getrapidkit/rapidkit-vscode/releases/tag/v0.4.5
[0.4.4]: https://github.com/getrapidkit/rapidkit-vscode/releases/tag/v0.4.4
[0.4.3]: https://github.com/getrapidkit/rapidkit-vscode/releases/tag/v0.4.3
[0.4.2]: https://github.com/getrapidkit/rapidkit-vscode/releases/tag/v0.4.2
[0.4.1]: https://github.com/getrapidkit/rapidkit-vscode/releases/tag/v0.4.1
[0.4.0]: https://github.com/getrapidkit/rapidkit-vscode/releases/tag/v0.4.0
[0.3.2]: https://github.com/getrapidkit/rapidkit-vscode/releases/tag/v0.3.2
[0.3.1]: https://github.com/getrapidkit/rapidkit-vscode/releases/tag/v0.3.1
[0.3.0]: https://github.com/getrapidkit/rapidkit-vscode/releases/tag/v0.3.0
[0.2.0]: https://github.com/getrapidkit/rapidkit-vscode/releases/tag/v0.2.0
[0.1.3]: https://github.com/getrapidkit/rapidkit-vscode/releases/tag/v0.1.3
[0.1.2]: https://github.com/getrapidkit/rapidkit-vscode/releases/tag/v0.1.2
[0.1.1]: https://github.com/getrapidkit/rapidkit-vscode/releases/tag/v0.1.1
[0.1.0]: https://github.com/getrapidkit/rapidkit-vscode/releases/tag/v0.1.0
