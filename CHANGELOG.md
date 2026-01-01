# Changelog

All notable changes to the "RapidKit" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **🐛 Missing workspace directory handling** - Fixed crash when selected workspace no longer exists
  - Extension now detects when workspace directory has been deleted
  - Shows helpful options: "Recreate Workspace", "Choose New Location", or "Cancel"
  - Automatically recreates workspace if user chooses to do so
  - Prevents `ENOENT: no such file or directory` error when creating projects
  - No need to restart VS Code if workspace is accidentally deleted

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

[Unreleased]: https://github.com/getrapidkit/rapidkit-vscode/compare/v0.4.5...HEAD
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
