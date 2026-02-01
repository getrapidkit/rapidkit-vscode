# 🚀 Getting Started with RapidKit Extension (First-Time Users)

## What You Need Before Starting

### Required ✅
- **Python 3.10+** with venv support (aligned with RapidKit Core requirements)
- **Node.js 20+** (for NestJS projects)

### Optional but Recommended 📦
- **Poetry** (auto-installed by extension if missing)
- **Git** (for version control)

## First-Time Setup Flow

### Step 1: Install Python with venv Support

#### Ubuntu/Debian:
```bash
sudo apt update
# Install Python 3.10 or higher with venv support
sudo apt install python3.10 python3.10-venv
# or Python 3.11, 3.12, 3.13...
sudo apt install python3.13 python3.13-venv
```

#### macOS:
```bash
# Install Python 3.10+
brew install python@3.13
```

#### Windows:
Download Python 3.10+ from [python.org](https://www.python.org/downloads/) and ensure "pip" is selected during installation.

### Step 2: Install the Extension

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "RapidKit"
4. Click Install

### Step 3: Create Your First Workspace
 (name, location, author)
5. **Wait 30-60 seconds** for first-time setup:
   - ⬇️ Downloading RapidKit CLI from npm
   - 🐍 Creating Python virtual environment with Poetry
   - 📦 Installing RapidKit Core engine (Python 3.10+ required)
5. **Wait 30-60 seconds** for first-time setup:
   - ⬇️ Downloading RapidKit CLI from npm
   - 🐍 Creating Python virtual environment
   - 📦 Installing RapidKit Core engine
   - ✅ Validating setup

### Step 4: Create Your First Project

After workspace is created:

1. **Open Command Palette** (Ctrl+Shift+P)
2. Type: `RapidKit: Create Project`
3. Choose framework:
   - **FastAPI** (Python)
   - **NestJS** (TypeScript)
4. Fill in project details
5. Wait for project generation
6. Start coding! 🎉

## What Happens Behind the Scenes?

### Extension → npm Package → Python Core

```
[VS Code Extension]
       ↓
[npx rapidkit] ← auto-downloads if not present
       ↓
[npm bridge] ← detects/creates Python venv
       ↓
[rapidkit-core] ← installed in workspace venv
       ↓
[Your Projects] ← fully functional!
```

### Why This Architecture?

- **Extension**: Beautiful UI and VS Code integration
- **npm package**: Cross-platform CLI that works everywhere
- **Python Core**: The actual engine with all kits and modules

This means you get:
- ✅ No manual Python package installation
- ✅ No PATH configuration
- ✅ Works immediately after extension install
- ✅ Isolated environments (no system pollution)

## Troubleshooting First-Time Setup

### "Python not found"
```bash
# Install Python 3.10 or higher
sudo apt install python3.10

# Verify
python3 --version  # Should show Python 3.10.0 or higher
```

### "Python venv support missing"
```bash
# Ubuntu/Debian - install for your Python version
sudo apt install python3.10-venv
# or
sudo apt install python3.13-venv

# Verify
python3 -m venv --help
```

### "RapidKit npm download failed"
- Check internet connection
- Try again (npx will retry download)
- If persistent, manually install: `npm install -g rapidkit`

### "Workspace validation failed"
This usually means Python venv creation failed:
1. Run `RapidKit: Doctor` command to diagnose
2. Fix Python/venv issues
3. Delete the failed workspace folder
4. Try creating workspace again

## Performance Notes

### First-Time Setup: ~30-60 seconds
- npm package download: 5-10s
- Virtual environment creation: 10-15s
- rapidkit-core installation: 15-30s

### Subsequent Operations: ~5-10 seconds
- npm package is cached by npx
- venv is reused
- Much faster!

## Pro Tips 💡

### 1. Pre-install npm package globally
```bash
npm install -g rapidkit
```
This makes first-time setup faster (~20s instead of ~45s)

### 2. Use `doctor` command
Before creating workspace:
```
Ctrl+Shift+P → RapidKit: Doctor
```
This verifies your system is ready!

### 3. Enable Poetry in-project venvs
```bash
poetry config virtualenvs.in-project true
```
Makes extension detect venvs better.

### 4. Don't interrupt first-time setup
Let the first workspace creation complete fully. Interrupting can leave partial setup.

## What Gets Installed Where?

### Extension Files
```
~/.vscode/extensions/rapidkit.rapidkit-vscode-*/
```

### npm Package Cache
```
~/.npm/_npx/
```

### RapidKit Workspaces (default)
```
~/RapidKit/rapidkits/<workspace-name>/
  .venv/                    ← Python virtual environment
    bin/python             ← Python with rapidkit-core
    bin/rapidkit          ← RapidKit CLI
  .rapidkit-workspace      ← Workspace marker
```

### Projects Inside Workspace
```
~/RapidKit/rapidkits/<workspace-name>/<project-name>/
  .venv/                   ← Project virtual environment
  src/                     ← Your code
  tests/                   ← Tests
  pyproject.toml          ← Dependencies
```

## Understanding the Workspace Model

### Why Workspaces?

```
Workspace (dev environment)
  ├── Project 1 (FastAPI)
  ├── Project 2 (NestJS)
  └── Project 3 (FastAPI)
```

Benefits:
- Share RapidKit Core installation
- Organize related projects
- Consistent Python environment
- Easy to manage

### Alternative: Direct Project Creation

You can also create standalone projects without workspace:
```bash
RapidKit: Create Project (Direct)
```
This creates project in current folder with its own venv.

## Next Steps After Setup

1. ✅ Workspace created
2. ✅ First project created
3. 📖 Read [Project Documentation](https://getrapidkit.com/docs)
4. 🧩 Add modules: `RapidKit: Add Module`
5. 🚀 Start dev server: `rapidkit dev`
6. 🎨 Customize your project

## Support

- 📚 [Documentation](https://getrapidkit.com/docs)
- 💬 [GitHub Discussions](https://github.com/getrapidkit/rapidkit-vscode/discussions)
- 🐛 [Report Issues](https://github.com/getrapidkit/rapidkit-vscode/issues)
- 💡 [Feature Requests](https://github.com/getrapidkit/rapidkit-vscode/issues)

---

**Welcome to the RapidKit family! Happy coding! 🎉**
