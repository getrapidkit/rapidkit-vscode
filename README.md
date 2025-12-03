# RapidKit for Visual Studio Code

<div align="center">

**🚀 The Official VS Code Extension for RapidKit**

Create production-ready FastAPI and NestJS projects with ease!

[![Version](https://img.shields.io/visual-studio-marketplace/v/rapidkit.rapidkit-vscode)](https://marketplace.visualstudio.com/items?itemName=rapidkit.rapidkit-vscode)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/rapidkit.rapidkit-vscode)](https://marketplace.visualstudio.com/items?itemName=rapidkit.rapidkit-vscode)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/rapidkit.rapidkit-vscode)](https://marketplace.visualstudio.com/items?itemName=rapidkit.rapidkit-vscode)
[![npm version](https://img.shields.io/npm/v/rapidkit)](https://www.npmjs.com/package/rapidkit)
[![npm downloads](https://img.shields.io/npm/dm/rapidkit)](https://www.npmjs.com/package/rapidkit)

</div>

## ✨ Features

### 🎯 **Workspace & Project Management**
- **Create RapidKit Workspaces** - Initialize new workspaces with workspace wizard
- **Generate Projects** - Create FastAPI or NestJS projects with interactive wizard
- **Project Explorer** - Browse and manage all your RapidKit projects in one place
- **Auto-Detection** - Automatically detects existing RapidKit projects

### 🧩 **Module System**
- **Module Browser** - Explore 100+ available modules organized by category
- **One-Click Installation** - Add modules to your project with a single click
- **Dependency Management** - Automatic dependency resolution and installation
- **Module Search** - Quick search for specific modules

### 📦 **Template Management**
- **Template Preview** - Preview templates before using them
- **Framework-Specific** - FastAPI and NestJS templates with best practices
- **Live Rendering** - See how your project will look before generation

### 💡 **IntelliSense & Code Actions**
- **Smart Completion** - Auto-completion for RapidKit configuration files
- **Hover Documentation** - Inline docs for configuration options
- **Quick Fixes** - Automatic fixes for common configuration issues
- **JSON Schema Validation** - Real-time validation for config files

### 🔧 **Developer Tools**
- **System Doctor** - Check system requirements (Python, Node.js, Poetry, Git)
- **Status Bar** - Real-time project status at a glance
- **Demo Generator** - Quick demo project generation for testing
- **File Watchers** - Auto-refresh on project changes

### 📝 **Code Snippets**
- **Python Snippets** - FastAPI routes, services, repositories, tests
- **TypeScript Snippets** - NestJS modules, controllers, services, DTOs
- **YAML Snippets** - Module configs, profiles, workspace definitions

## 🚀 Getting Started

### Prerequisites

- **Visual Studio Code** 1.85.0 or higher
- **Python** 3.10+ (for FastAPI projects)
- **Node.js** 18+ (for NestJS projects and CLI)
- **Poetry** (for Python dependency management)
- **Git** (for version control)

### Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "RapidKit"
4. Click Install

Or install from command line:
```bash
code --install-extension rapidkit.rapidkit-vscode
```

### Quick Start

1. **Create a Workspace**
   - Press `Ctrl+Shift+P` (Cmd+Shift+P on Mac)
   - Type "RapidKit: Create Workspace"
   - Follow the interactive wizard

2. **Generate a Project**
   - Open Command Palette (`Ctrl+Shift+P`)
   - Type "RapidKit: Create Project"
   - Choose framework (FastAPI/NestJS)
   - Select mode (demo/full)

3. **Add Modules**
   - Browse modules in the Module Explorer
   - Click on a module to install
   - Or use Command Palette: "RapidKit: Add Module"

## 📖 Usage

### Creating Your First Project

#### Method 1: Using Keyboard Shortcuts
```
Ctrl+Shift+R Ctrl+Shift+W  - Create Workspace
Ctrl+Shift+R Ctrl+Shift+P  - Create Project
Ctrl+Shift+R Ctrl+Shift+M  - Add Module
```

#### Method 2: Using Command Palette
1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Type "RapidKit" to see all available commands
3. Select the command you want to run

#### Method 3: Using Activity Bar
1. Click the RapidKit icon in the Activity Bar
2. Use the Project Explorer to manage projects
3. Browse modules and templates

### Working with Modules

The Module Explorer shows all available modules organized by category:

- **🔐 Auth** - Authentication & authorization
- **💾 Cache** - Caching solutions (Redis, Memcached)
- **📡 Communication** - Email, SMS, notifications
- **⚙️ Core** - Essential utilities
- **🗄️ Database** - Database integrations
- **🔒 Security** - Security features
- **👤 Users** - User management

Click any module to see:
- Description
- Dependencies
- Supported frameworks
- Installation status

### Configuration

Configure RapidKit through VS Code settings:

```json
{
  "rapidkit.pythonVersion": "3.10",
  "rapidkit.nodeVersion": "18.0.0",
  "rapidkit.defaultFramework": "fastapi",
  "rapidkit.showWelcomeOnStartup": true,
  "rapidkit.autoRefresh": true,
  "rapidkit.debug": false
}
```

### Code Snippets

#### Python (FastAPI)
- `rk-module` - Create RapidKit module
- `rk-fastapi-route` - FastAPI router with CRUD
- `rk-service` - Service class
- `rk-repository` - Repository pattern
- `rk-test` - Test case template

#### TypeScript (NestJS)
- `rk-nest-module` - NestJS module
- `rk-nest-controller` - NestJS controller
- `rk-nest-service` - NestJS service
- `rk-dto` - DTO with validation
- `rk-entity` - TypeORM entity

#### YAML
- `rk-module-yaml` - Module definition
- `rk-base-config` - Base configuration
- `rk-snippets` - Snippets config
- `rk-workspace` - Workspace config

## 🎨 UI Components

### Status Bar

The status bar shows your current RapidKit context:

- **⚡ Ready** - Extension is ready
- **⏳ Working** - Operation in progress
- **❌ Error** - Something went wrong

Click the status bar item to see more details.

### Tree Views

**Project Explorer**
- View all RapidKit projects
- See installed modules
- Quick actions (add module, open dashboard)

**Module Explorer**
- Browse available modules by category
- Search for modules
- View module details

**Template Explorer**
- Browse templates by framework
- Preview templates
- Quick project generation

### Webviews

**Welcome Panel**
- Quick start guide
- Common actions
- Documentation links
- Feature highlights

**Template Preview**
- Syntax-highlighted template code
- Project structure visualization
- Feature list
- One-click project creation

## 🔧 Troubleshooting

### Running System Check

If you encounter issues, run the system doctor:

```
Ctrl+Shift+P > RapidKit: System Check
```

This checks:
- ✅ Python installation and version
- ✅ Node.js installation and version
- ✅ Poetry availability
- ✅ Git installation
- ✅ RapidKit CLI availability

### Common Issues

**"Python not found"**
- Install Python 3.10+
- Add Python to PATH
- Restart VS Code

**"Poetry not found"**
- Install Poetry: `curl -sSL https://install.python-poetry.org | python3 -`
- Add Poetry to PATH
- Restart terminal/VS Code

**"Module installation fails"**
- Check internet connection
- Verify Python/Node.js versions
- Run `RapidKit: System Check`
- Check Output panel for detailed errors

**"Projects not showing in Explorer"**
- Open a folder containing RapidKit projects
- Run `RapidKit: Refresh Projects`
- Check if `pyproject.toml` or `.rapidkit` exists

## 📚 Documentation

- [Official Documentation](https://getrapidkit.com/docs)
- [RapidKit Website](https://getrapidkit.com)
- [GitHub Repository](https://github.com/getrapidkit/rapidkit-npm)
- [Discord Community](https://discord.gg/rapidkit)

## 🤝 Contributing

Contributions are welcome! Please see our [Contributing Guide](CONTRIBUTING.md).

## 📝 License

This extension is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

Built with ❤️ by the RapidKit team.

Special thanks to:
- VS Code Extension API team
- RapidKit community
- All contributors

## 📬 Support

- **Issues**: [GitHub Issues](https://github.com/getrapidkit/rapidkit-vscode/issues)
- **Discussions**: [GitHub Discussions](https://github.com/getrapidkit/rapidkit-vscode/discussions)
- **Discord**: [Join our server](https://discord.gg/rapidkit)
- **Email**: support@getrapidkit.com

---

<div align="center">

**Made with 🚀 by [RapidKit](https://getrapidkit.com)**

⭐ Star us on [GitHub](https://github.com/getrapidkit/rapidkit-vscode)

</div>
