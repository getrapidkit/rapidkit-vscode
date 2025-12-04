# Release Notes - v0.1.3

## 🐛 Bug Fix Release

**Release Date:** November 7, 2025

This release fixes project detection issues and simplifies kit selection for a better user experience.

---

## 🐛 Bug Fixes

### NestJS Projects Not Showing in Explorer
**Fixed a critical issue where NestJS projects were invisible:**
- ✅ Fixed NestJS projects not appearing in the Projects view
- ✅ Project explorer now correctly detects both FastAPI and NestJS projects
- ✅ FastAPI projects detected via `pyproject.toml`
- ✅ NestJS projects detected via `package.json` with `@nestjs/core` dependency

**Root Cause:**
The project explorer was only looking for `pyproject.toml` files, which meant NestJS projects were completely ignored and not displayed in the sidebar.

**Solution:**
Enhanced project detection logic to check both Python and Node.js project markers:
- FastAPI: `pyproject.toml` file
- NestJS: `package.json` with `@nestjs/core` dependency

---

## 🔧 Improvements

### Simplified Kit Selection
- **Removed incomplete kits** from project creation wizard
- Only `standard` kit is now available for both FastAPI and NestJS
- Prevents users from selecting incomplete/experimental kits (advanced, ddd)
- Cleaner, more focused project creation experience

**Why?**
The `advanced` and `ddd` kits are not yet complete in the core RapidKit framework. Hiding them prevents confusion and ensures users only create projects with fully-supported configurations.

---

## 📦 What's Included

### Working Features
- ✅ **Workspace Management**
  - Create new RapidKit workspaces
  - Add existing workspaces
  - Auto-discover workspaces
  - Refresh workspace list

- ✅ **Project Creation**
  - FastAPI projects with `standard` kit
  - NestJS projects with `standard` kit
  - Package manager selection (npm/yarn/pnpm) for NestJS
  - Module selection during creation

- ✅ **Project Explorer**
  - **NEW:** Shows both FastAPI and NestJS projects
  - Project framework detection
  - Kit information display
  - Quick actions (open, copy path, delete)

- ✅ **Module & Template Management**
  - Browse available modules
  - Module categories
  - Template preview

---

## 🔍 Technical Details

### Project Detection Logic
```typescript
// FastAPI: Check for pyproject.toml
if (await fs.pathExists(path.join(projectPath, 'pyproject.toml'))) {
  // FastAPI project detected
}

// NestJS: Check for package.json with @nestjs/core
if (await fs.pathExists(path.join(projectPath, 'package.json'))) {
  const pkg = await fs.readJSON(packageJsonPath);
  if (pkg.dependencies?.['@nestjs/core']) {
    // NestJS project detected
  }
}
```

### Available Kits
| Framework | Kit | Status |
|-----------|-----|--------|
| FastAPI   | `standard` | ✅ Available |
| FastAPI   | `ddd` | 🚧 Hidden (incomplete) |
| FastAPI   | `advanced` | 🚧 Hidden (incomplete) |
| NestJS    | `standard` | ✅ Available |
| NestJS    | `advanced` | 🚧 Hidden (incomplete) |

---

## 📥 Installation

### Update Existing Installation
If you already have the extension installed from VSIX, uninstall it first:
```bash
code --uninstall-extension rapidkit.rapidkit-vscode
```

Then install the new version:
```bash
code --install-extension rapidkit-vscode-0.1.3.vsix
```

### Fresh Installation
```bash
code --install-extension rapidkit-vscode-0.1.3.vsix
```

---

## 🧪 Testing Checklist

After installation, verify:

- [ ] Create a new workspace
- [ ] Create a FastAPI project with `standard` kit
- [ ] Create a NestJS project with `standard` kit
- [ ] Both projects appear in the Projects view
- [ ] Click on each project to see details (framework, kit, modules)
- [ ] Project context menu actions work (open folder, copy path)

---

## 🚀 What's Next

### v0.1.4 (Planned)
- Bundle extension with esbuild to reduce package size
- Add more module categories
- Improve error messages and logging
- Add project settings/configuration UI

### Future Features
- Enable `ddd` kit when ready in core framework
- Add module installation progress tracking
- Project dashboard with quick stats
- Template customization

---

## 🙏 Thank You

Thank you for testing and providing feedback! 

If you encounter any issues, please report them on our [GitHub Issues](https://github.com/getrapidkit/rapidkit-vscode/issues) page.

---

**Full Changelog:** [v0.1.2...v0.1.3](https://github.com/getrapidkit/rapidkit-vscode/compare/v0.1.2...v0.1.3)
