# Changelog

All notable changes to the "RapidKit" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2025-11-07

### Added
- 🎉 First stable pre-release version
- Enhanced workspace and project management
- Improved module browser with better categorization
- Better error handling and user feedback
- Performance optimizations

### Changed
- Updated to production-ready status
- Improved UI/UX across all features
- Better integration with RapidKit CLI

### Fixed
- Various bug fixes and stability improvements

## [0.1.0] - 2024-01-15

### Added
- Initial release of RapidKit VS Code extension
- Workspace creation wizard with interactive prompts
- Project generation for FastAPI and NestJS frameworks
- Module browser with 100+ modules organized by category
- Template preview with syntax highlighting
- Project explorer tree view
- Module explorer tree view
- Template explorer tree view
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
- Activity bar integration
- Output channel for logging

### Changed
- None

### Deprecated
- None

### Removed
- None

### Fixed
- None

### Security
- None

## [0.0.1] - 2024-01-01

### Added
- Project scaffolding
- Basic extension structure
- Initial configuration

---

## Release Notes

### 0.1.0

🎉 **Initial Release**

Welcome to RapidKit for Visual Studio Code! This is the first public release of the official VS Code extension for RapidKit.

**Key Features:**
- 🚀 Create workspaces and projects with interactive wizards
- 🧩 Browse and install 100+ modules
- 📦 Preview templates before generation
- 💡 IntelliSense support for configuration files
- 📝 Code snippets for FastAPI and NestJS
- 🔧 System doctor for troubleshooting

**Getting Started:**
1. Press `Ctrl+Shift+P` and type "RapidKit: Create Workspace"
2. Follow the wizard to create your first project
3. Add modules from the Module Explorer
4. Start coding!

**Feedback:**
We'd love to hear your feedback! Please report issues or suggestions on our [GitHub repository](https://github.com/getrapidkit/rapidkit-vscode/issues).

Thank you for using RapidKit! 🚀

---

[Unreleased]: https://github.com/getrapidkit/rapidkit-vscode/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/getrapidkit/rapidkit-vscode/releases/tag/v0.1.0
[0.0.1]: https://github.com/getrapidkit/rapidkit-vscode/releases/tag/v0.0.1
