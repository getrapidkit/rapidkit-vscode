# RapidKit for VS Code

<div align="center">

**Build production-ready APIs at warp speed**

FastAPI & NestJS scaffolding with clean architecture, 27+ modules, and automation-first workflows

[![Version](https://img.shields.io/visual-studio-marketplace/v/rapidkit.rapidkit-vscode?style=flat-square&color=blue)](https://marketplace.visualstudio.com/items?itemName=rapidkit.rapidkit-vscode)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/rapidkit.rapidkit-vscode?style=flat-square&color=green)](https://marketplace.visualstudio.com/items?itemName=rapidkit.rapidkit-vscode)
[![npm](https://img.shields.io/npm/v/rapidkit?style=flat-square&color=red&label=npm)](https://www.npmjs.com/package/rapidkit)

[Install Extension](https://marketplace.visualstudio.com/items?itemName=rapidkit.rapidkit-vscode) · [Documentation](https://www.getrapidkit.com/docs) · [Report Bug](https://github.com/getrapidkit/rapidkit-vscode/issues)

</div>

---

## 📸 Screenshot

![RapidKit VS Code Extension](media/screenshots/rapidki-vscode-screens.webp)

---

## 🎉 What's New in v0.5.2

**Critical fixes + UX enhancements + Workspace improvements!**

- 🔧 **NPM Caching Fix** - Resolved "Invalid project name" errors by always using latest CLI
- 📦 **Standalone Mode** - Create projects without workspace (3-option dialog)
- 🩺 **Accurate Doctor** - Shows real status instead of false positives
- 📋 **Command Reference** - 14 ready-to-copy commands in Welcome Page
- 📂 **Recent Workspaces** - Dynamic list with auto-refresh
- ⚡ **Workspace Explorer** - Project count, smart time display, status icons
- 💬 **Better Notifications** - All messages now have "OK" button

[See full release notes →](releases/RELEASE_NOTES_v0.5.2.md)

---

## ⚡ Quick Start

```
1. Ctrl+Shift+P → "RapidKit: Create Project"
2. Choose: FastAPI or NestJS
3. Enter project name
4. Done! 🎉
```

Your project is ready with:
- ✅ Full project structure
- ✅ Dependencies configured
- ✅ Dev server ready (`rapidkit dev`)
- ✅ API docs at `/docs`

---

## 🎯 What is RapidKit?

RapidKit generates **production-ready backend projects** with **clean architecture** built-in:

| Framework | Language | Features |
|-----------|----------|----------|
| **FastAPI** | Python | Async, auto-docs, type hints, Poetry |
| **NestJS** | TypeScript | Modular, decorators, DI, npm/yarn/pnpm |

**Plus 27+ production-ready modules:** Auth, Database, Cache, Logging, and more!

### 🧩 Available Modules

<details>
<summary><b>Click to see all 27 modules</b></summary>

| Category | Modules |
|----------|--------|
| 🔐 **Auth** | Authentication Core, API Keys, OAuth, Passwordless, Session Management |
| 💳 **Billing** | Cart, Inventory, Stripe Payment |
| 🗄️ **Database** | PostgreSQL, MongoDB, SQLite |
| 🔒 **Security** | CORS, Rate Limiting, Security Headers |
| 📧 **Communication** | Email, Unified Notifications |
| 👥 **Users** | Users Core, Users Profiles |
| ⚙️ **Essentials** | Settings, Middleware, Logging, Deployment |
| 📊 **Observability** | Observability Core |
| 💾 **Caching** | Redis Cache |
| 🤖 **AI** | AI Assistant |
| ⚡ **Tasks** | Celery |
| 💼 **Business** | Storage |

**Install via Extension:** Browse Modules sidebar • **Install via CLI:** `rapidkit add module <slug>`

</details>

---

## 📂 Project Structure

### FastAPI Project
```
my-api/
├── rapidkit              # CLI script
├── .rapidkit/            # RapidKit config
│   ├── cli.py            # CLI commands
│   ├── project.json      # Project metadata
│   └── activate          # Environment activation
├── src/
│   ├── main.py           # FastAPI app entry
│   ├── routing/          # API routes
│   │   └── health.py     # Health check endpoint
│   └── modules/          # Feature modules
├── tests/                # Test suite
├── pyproject.toml        # Poetry config
├── Makefile              # Make commands
└── README.md
```

### NestJS Project
```
my-api/
├── rapidkit              # CLI script
├── .rapidkit/            # RapidKit config
├── src/
│   ├── main.ts           # NestJS entry
│   ├── app.module.ts     # Root module
│   ├── config/           # Configuration
│   └── examples/         # Example module
├── test/                 # Test suite
├── package.json          # npm config
└── README.md
```

---

## 🛠️ Project Commands

After creating a project, use these commands:

```bash
cd my-api
npx rapidkit init      # Install dependencies
npx rapidkit dev       # Start dev server (port 8000)
npx rapidkit test      # Run tests
npx rapidkit build     # Build for production
npx rapidkit lint      # Lint code
npx rapidkit format    # Format code
```

> **Note:** `npx rapidkit` auto-detects when you're inside a project. Or install globally: `npm i -g rapidkit`

---

## 🎨 Extension Features

### Commands (Ctrl+Shift+P)

| Command | Description |
|---------|-------------|
| `RapidKit: Create Workspace` | Create a new workspace for multiple projects |
| `RapidKit: Create Project` | Generate a FastAPI or NestJS project |
| `RapidKit: Create FastAPI Project` | Quick FastAPI project creation |
| `RapidKit: Create NestJS Project` | Quick NestJS project creation |
| `RapidKit: System Doctor` | Check system requirements |
| `RapidKit: Open Documentation` | Open RapidKit docs |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+R Ctrl+Shift+W` | Create Workspace |
| `Ctrl+Shift+R Ctrl+Shift+P` | Create Project |

### Sidebar

- **Workspaces View** - Manage all your RapidKit workspaces
- **Projects View** - Browse projects in current workspace
- **Modules View** - Explore and install modules

---

## 📋 Requirements

| Tool | Version | Required For |
|------|---------|--------------|
| VS Code | 1.100+ | Extension |
| Node.js | 18+ | CLI & NestJS |
| Python | 3.10+ | FastAPI & RapidKit Core |
| Poetry | Latest | FastAPI dependencies (auto-installed) |
| Git | Latest | Version control |

**Check requirements:** Run `RapidKit: System Doctor` from Command Palette.

---

## 🌐 RapidKit Ecosystem

RapidKit consists of three integrated components that work seamlessly together:

### 1️⃣ VS Code Extension (This Extension)

[![Version](https://img.shields.io/visual-studio-marketplace/v/rapidkit.rapidkit-vscode?style=flat-square&label=version)](https://marketplace.visualstudio.com/items?itemName=rapidkit.rapidkit-vscode) [![Installs](https://img.shields.io/visual-studio-marketplace/i/rapidkit.rapidkit-vscode?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=rapidkit.rapidkit-vscode)

**Installation:**
```bash
# VS Code Marketplace
code --install-extension rapidkit.rapidkit-vscode
```

**Features:**
- 🎨 Visual workspace management
- 🚀 One-click project creation
- 📂 Sidebar navigation
- 🩺 System diagnostics
- ⌨️ Command palette integration

[📦 Install from Marketplace](https://marketplace.visualstudio.com/items?itemName=rapidkit.rapidkit-vscode)

---

### 2️⃣ npm Package (CLI Bridge)

[![npm](https://img.shields.io/npm/v/rapidkit?style=flat-square)](https://www.npmjs.com/package/rapidkit) [![downloads](https://img.shields.io/npm/dm/rapidkit?style=flat-square&label=downloads)](https://www.npmjs.com/package/rapidkit)

**Installation:**
```bash
# Use directly (no install needed)
npx rapidkit my-workspace

# Or install globally
npm install -g rapidkit
```

**Features:**
- 🔧 Full CLI for workspace & project management
- 🐍 Bridges TypeScript to Python Core
- 📦 Manages Poetry/venv automatically
- 📋 Shared workspace registry

**Quick Commands:**
```bash
rapidkit create          # Interactive mode
rapidkit workspace list  # List all workspaces
rapidkit add module auth # Add modules to project
```

[📦 View on npm](https://www.npmjs.com/package/rapidkit) • [💻 GitHub Repo](https://github.com/getrapidkit/rapidkit-npm)

---

### 3️⃣ Python Core (Generation Engine)

[![PyPI](https://img.shields.io/pypi/v/rapidkit-core?style=flat-square)](https://pypi.org/project/rapidkit-core/) [![Python](https://img.shields.io/pypi/pyversions/rapidkit-core?style=flat-square)](https://pypi.org/project/rapidkit-core/)

**Installation:**
```bash
# Auto-installed by Extension & npm package
# Or install manually:
pip install rapidkit-core
```

**Features:**
- 🏗️ Core code generation engine
- 📚 27+ production-ready modules
- 🎯 FastAPI & NestJS templates
- 🔄 Module registry & dependency management

**Provides:**
- Auth, Database, Cache, Redis
- Logging, Monitoring, Testing
- API clients, WebSockets, Storage
- Deployment, Security, and more...

[🐍 View on PyPI](https://pypi.org/project/rapidkit-core/)

---

### 🔗 How They Work Together

```mermaid
graph TD
    A[VS Code Extension] -->|commands| B[npm Package CLI]
    B -->|executes| C[Python Core Engine]
    C -->|generates| D[Your FastAPI/NestJS Project ✨]
```

**Integration Flow:**
1. **Extension** provides beautiful UI and VS Code integration
2. **npm Package** bridges TypeScript and Python ecosystems  
3. **Python Core** handles all code generation and scaffolding
4. **Result** is a production-ready project with clean architecture

---

### 🔄 Cross-Tool Workspace Compatibility

All workspaces are **fully compatible** across tools:

| Feature | Description |
|---------|-------------|
| **Shared Registry** | `~/.rapidkit/workspaces.json` stores all workspaces |
| **Unified Signature** | Both tools use `RAPIDKIT_WORKSPACE` marker |
| **Auto-Detection** | Works from any subdirectory in either tool |
| **Module Management** | Add via Extension UI or `rapidkit add module` |

**Example Workflow:**
```bash
# 1. Create workspace via npm
npx rapidkit my-workspace

# 2. Open in VS Code (auto-detected)
code my-workspace

# 3. Create project via Extension UI (Ctrl+Shift+P → RapidKit: Create Project)

# 4. Add modules via CLI
cd my-project
rapidkit add module auth
rapidkit add module redis

# 5. View all workspaces
rapidkit workspace list
```

---

## � Troubleshooting

### Extension not showing commands?
- Reload VS Code: `Ctrl+Shift+P` → `Developer: Reload Window`
- Check VS Code version: 1.100+ required

### Python not found?
- Run `RapidKit: System Doctor` to check requirements
- Install Python 3.10+ from [python.org](https://python.org)
- Restart VS Code after Python installation

### Project not creating?
- Ensure Node.js 18+ and Python 3.10+ are installed
- Check `Output` panel (View → Output → RapidKit)
- Report issue with logs at [GitHub Issues](https://github.com/getrapidkit/rapidkit-vscode/issues)

### Workspace not detected?
- Ensure `.rapidkit-workspace` marker exists
- Run `rapidkit workspace sync` from terminal
- Check `~/.rapidkit/workspaces.json` registry

---

## �🔗 Links

- 📖 **Documentation:** [www.getrapidkit.com/docs](https://www.getrapidkit.com/docs)
- 🧩 **Modules:** [27+ production-ready modules](https://www.getrapidkit.com/modules)
- 🐛 **Issues:** [GitHub Issues](https://github.com/getrapidkit/rapidkit-vscode/issues)
- 💬 **Community:** [Discord Server](https://discord.gg/rapidkit)
- 📝 **Changelog:** [CHANGELOG.md](CHANGELOG.md)

---

## 📄 License

MIT © [RapidKit](https://www.getrapidkit.com)
