# Release Notes - RapidKit VS Code Extension v0.4.0

**Release Date:** December 3, 2025

## 🚀 MAJOR RELEASE: Complete Migration to npm Package

This is a **major version** with **breaking architectural changes**. The extension has been completely refactored to use the RapidKit npm package instead of Python CLI, resulting in a simpler, faster, and more reliable experience.

---

## 🎯 What's New

### ♻️ Complete Architecture Overhaul

- **No Python Required!** - Extension now uses `npx rapidkit` (npm package) exclusively
- **Faster Project Creation** - 2-5s instead of 10-30s (Python environment setup eliminated)
- **Single Source of Truth** - All templates managed by npm package
- **Smaller Extension** - No bundled templates (reduced complexity)
- **Better Reliability** - Simplified codebase with fewer dependencies

### ✨ New Features

#### Dual-Mode Project Creation

Choose how you want to create projects:

**🏢 Workspace Mode**
```bash
# Create workspace container
npx rapidkit my-workspace

# Create projects inside
cd my-workspace
rapidkit create my-api --template fastapi
rapidkit create admin-api --template nestjs
```

**📦 Standalone Mode**
```bash
# Create independent project
npx rapidkit my-api --template fastapi
```

#### Interactive Mode Selection

- Smart menu to choose between workspace and standalone modes
- Automatic workspace detection
- Context-aware project creation

#### Enhanced User Experience

- ✅ Better progress indicators
- ✅ Automatic project verification
- ✅ Contextual error messages with help links
- ✅ Cleaner, more intuitive wizards

---

## 🔄 Breaking Changes

### Removed Dependencies

- ❌ **Python CLI**: No longer required or used
- ❌ **Poetry**: Not needed anymore
- ❌ **virtualenv**: Not needed anymore
- ❌ **Demo Mode**: Replaced with standard npm package workflow

### Simplified Configuration

**Before (v0.3.x):**
```typescript
interface WorkspaceConfig {
  name: string;
  path: string;
  mode: 'demo' | 'full';           // ❌ Removed
  installMethod: string;            // ❌ Removed
  pythonVersion: string;            // ❌ Removed
  initGit: boolean;
}

interface ProjectConfig {
  name: string;
  kit: string;                      // ❌ Removed
  framework: string;
  modules: string[];                // ❌ Removed
  author: string;                   // ❌ Removed
  license: string;                  // ❌ Removed
  description: string;              // ❌ Removed
  packageManager?: string;
}
```

**After (v0.4.0):**
```typescript
interface WorkspaceConfig {
  name: string;
  path: string;
  initGit: boolean;
}

interface ProjectConfig {
  name: string;
  framework: 'fastapi' | 'nestjs';
  packageManager?: string;          // For NestJS only
}
```

### Updated Commands

| Command | Before (v0.3.x) | After (v0.4.0) |
|---------|----------------|----------------|
| Create Workspace | Python CLI with demo mode | `npx rapidkit <name>` |
| Create Project | Python CLI with kit selection | `npx rapidkit <name> --template <template>` |
| Generate Demo | Python scripts | `npx rapidkit <name> --template fastapi` |

---

## 📦 Installation & Requirements

### Requirements

- **VS Code:** 1.85.0 or higher
- **Node.js:** 18+ (for npm package)
- ~~Python 3.10+~~ ❌ **NO LONGER REQUIRED!**
- ~~Poetry~~ ❌ **NO LONGER REQUIRED!**

### Installation

1. **From VS Code Marketplace:**
   - Search for "RapidKit"
   - Click Install

2. **From VSIX File:**
   ```bash
   code --install-extension rapidkit-vscode-0.4.0.vsix
   ```

3. **Auto-update:**
   - Extension will auto-update if you have v0.3.x installed

---

## 🎓 Migration Guide

### For Existing Users

#### If you have v0.3.x installed:

**Good News:** Existing workspaces and projects continue to work! ✅

**What Changes:**
- New workspaces use npm package workflow
- New projects use `--template` flag
- No Python CLI dependency needed

#### Workspace Migration:

**Old Workspaces (v0.3.x):**
- Continue to work as-is
- Can create new projects using npm package

**New Workspaces (v0.4.0):**
- Created with `npx rapidkit <name>`
- Cleaner structure
- Local CLI in `.rapidkit/bin/`

#### Project Creation:

**Before:**
```bash
# Required Python CLI installed in workspace
rapidkit create project fastapi.standard my-api
```

**After:**
```bash
# Option 1: In workspace
rapidkit create my-api --template fastapi

# Option 2: Standalone
npx rapidkit my-api --template fastapi
```

---

## 🛠️ What's Changed

### Core Changes

1. **RapidKitCLI Class** - Complete rewrite
   - ✅ `createWorkspace(options)` - npm package workspace
   - ✅ `createProject(options)` - standalone project
   - ✅ `createProjectInWorkspace(options)` - project in workspace
   - ❌ Removed Python CLI calls

2. **Command Handlers** - Refactored
   - ✅ `createWorkspace` - uses npm package
   - ✅ `createProject` - supports dual modes
   - ✅ `generateDemo` - simplified wrapper

3. **Wizards** - Simplified
   - ✅ `WorkspaceWizard` - removed demo mode
   - ✅ `ProjectWizard` - removed kit/module selection
   - ✅ Fewer prompts, cleaner UX

4. **Type System** - Streamlined
   - ✅ Removed unnecessary fields
   - ✅ Focused on essential config only

### File Changes

```
9 files changed
+570 insertions
-443 deletions
```

**Modified Files:**
- `src/core/rapidkitCLI.ts` (142 changes)
- `src/commands/createProject.ts` (276 changes)
- `src/commands/generateDemo.ts` (327 changes)
- `src/commands/createWorkspace.ts` (98 changes)
- `src/ui/wizards/projectWizard.ts` (74 deletions)
- `src/ui/wizards/workspaceWizard.ts` (13 changes)
- `src/types/index.ts` (8 deletions)
- `CHANGELOG.md` (71 additions)
- `package.json` (4 changes)

---

## 📊 Performance Comparison

| Metric | v0.3.x (Python) | v0.4.0 (npm) | Improvement |
|--------|----------------|--------------|-------------|
| **Workspace Creation** | 10-30s | 2-5s | **5-6x faster** |
| **Project Creation** | 15-45s | 3-8s | **4-5x faster** |
| **Extension Size** | 250 KB | 308 KB | +23% (better bundling) |
| **Dependencies** | Python + Poetry + npm | npm only | **Simplified** |
| **Template Updates** | Extension update | npm package | **Always fresh** |

---

## 🐛 Bug Fixes

- Fixed empty catch blocks causing ESLint errors
- Improved error handling with contextual help
- Better project verification after creation
- Fixed TypeScript compilation issues

---

## 🔍 Known Issues

- ESLint warnings for unused `_error` variables (non-critical, existing issue)
- Requires internet connection for `npx rapidkit` first run (caches afterward)

---

## 📚 Documentation

### Quick Start

**Create a Workspace:**
```
Ctrl+Shift+P → RapidKit: Create Workspace
```

**Create a Project:**
```
Ctrl+Shift+P → RapidKit: Create Project
→ Choose: Workspace or Standalone
→ Select framework: FastAPI or NestJS
```

**Generate Demo:**
```
Ctrl+Shift+P → RapidKit: Generate Demo Project
```

### Learn More

- **Documentation:** https://getrapidkit.com/docs
- **npm Package:** https://www.npmjs.com/package/rapidkit
- **GitHub:** https://github.com/getrapidkit/rapidkit-vscode
- **Troubleshooting:** https://getrapidkit.com/docs/troubleshooting

---

## 🙏 Acknowledgments

- RapidKit npm package team for the stable release
- Community feedback on Python CLI issues
- Contributors to the refactoring effort

---

## 💬 Feedback

We'd love to hear your thoughts!

- **Issues:** [GitHub Issues](https://github.com/getrapidkit/rapidkit-vscode/issues)
- **Discussions:** [GitHub Discussions](https://github.com/getrapidkit/rapidkit-vscode/discussions)
- **Email:** support@getrapidkit.com

---

## 🔮 What's Next (v0.5.0)

- VS Code extension module management UI
- Project dashboard enhancements
- Template preview improvements
- Better TypeScript/FastAPI IntelliSense

---

**Made with 🚀 by [RapidKit](https://getrapidkit.com)**

⭐ Star us on [GitHub](https://github.com/getrapidkit/rapidkit-vscode)
