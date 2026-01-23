# Release Notes - v0.4.7

**Release Date:** January 23, 2026

## 🎯 Overview

Maintenance release focusing on **bug fix** and **dependency updates** with enhanced compatibility.

---

## 🐛 Bug Fixes

### Missing Workspace Directory Handling

**Problem:**
Extension crashed with `ENOENT: no such file or directory` when trying to create projects in a workspace that was deleted or moved.

**Solution:**

- ✅ Detects when workspace directory no longer exists
- ✅ Shows helpful recovery dialog with 3 options:
  - **Recreate Workspace** - Creates the directory at original location
  - **Choose New Location** - Browse and select a new workspace folder
  - **Cancel** - Aborts the operation
- ✅ Automatically recreates workspace if user chooses to
- ✅ No need to restart VS Code after recovery

**Before v0.4.7:**

```
❌ Error: ENOENT: no such file or directory, mkdir '/path/to/deleted/workspace/my-project'
```

**After v0.4.7:**

```
⚠️  Workspace directory no longer exists
[🔄 Recreate Workspace] [📁 Choose New Location] [❌ Cancel]
✅ Workspace recreated successfully!
```

---

## 📦 Dependency Updates

Updated **11 packages** to latest stable versions:

| Package                          | Previous | New      | Type      |
| -------------------------------- | -------- | -------- | --------- |
| @types/node                      | 20.19.24 | 20.19.30 | Types     |
| @types/vscode                    | 1.106.1  | 1.108.1  | Types     |
| @typescript-eslint/eslint-plugin | 8.48.1   | 8.53.1   | DevDep    |
| @typescript-eslint/parser        | 8.48.1   | 8.53.1   | DevDep    |
| vitest                           | 4.0.15   | 4.0.18   | Testing   |
| @vitest/coverage-v8              | 4.0.15   | 4.0.18   | Testing   |
| prettier                         | 3.7.4    | 3.8.1    | Formatter |
| fs-extra                         | 11.3.2   | 11.3.3   | Utility   |
| @vscode/test-cli                 | 0.0.4    | 0.0.12   | Testing   |

**Security:**

- ✅ Fixed **3 vulnerabilities** (1 low, 2 moderate)

---

## 🔄 Compatibility

### Synced with rapidkit-npm v0.14.2

- Compatible with latest npm package features
- Aligned documentation and messaging
- Consistent behavior across CLI and extension

---

## ⬆️ Upgrade

### Automatic Update

VS Code will automatically notify you when v0.4.7 is available in the marketplace.

### Manual Update

1. Open VS Code Extensions (`Ctrl+Shift+X`)
2. Search for "RapidKit"
3. Click "Update"

### npm Package Sync

Make sure you're using the latest npm package:

```bash
npm install -g rapidkit@0.14.2
```

---

## ✅ Quality Assurance

- ✅ TypeScript compilation successful
- ✅ ESLint passed with no warnings
- ✅ All 11 dependencies updated to latest stable
- ✅ No breaking changes

---

## 📊 Project Statistics

- **Lines of TypeScript:** 34 source files
- **Dependencies:** 8 production, 19 development
- **Build Size:** Optimized with esbuild
- **Security:** 0 vulnerabilities

---

## 🔮 What's Next?

This maintenance release keeps the extension stable and up-to-date. Future releases will focus on:

- Enhanced project management features
- Better integration with RapidKit Python Core
- Performance optimizations
- Community-requested features

---

## 📝 Full Changelog

See [CHANGELOG.md](../CHANGELOG.md) for complete version history.

## 🐛 Report Issues

Found a bug? [Open an issue](https://github.com/getrapidkit/rapidkit-vscode/issues) on GitHub.
