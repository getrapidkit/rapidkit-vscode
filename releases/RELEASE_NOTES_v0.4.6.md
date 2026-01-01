# Release Notes - v0.4.6

**Release Date:** January 1, 2026

## 🎯 Major Improvements

### 🐍 Smart Poetry Virtualenv Detection

The extension now **intelligently detects Poetry virtualenvs** regardless of their location!

**What's New:**
- ✅ Detects `.venv` in project directory (standard)
- ✅ Detects Poetry cache virtualenvs (`~/.cache/pypoetry/virtualenvs/`)
- ✅ Uses `poetry env info --path` for accurate detection
- ✅ No more false "not initialized" warnings!

**Before v0.4.6:**
```
❌ Project "my-api" is not initialized (.venv not found)
```

**After v0.4.6:**
```
✅ Detected Poetry virtualenv in cache
✅ Ready to start dev server
```

**Why This Matters:**
- Poetry's default behavior is to create virtualenvs in cache, not project directory
- Users no longer need `poetry config virtualenvs.in-project true`
- Aligns with rapidkit-npm v0.14.1 behavior

---

### 🔔 Automatic Update Notifications

Never miss a rapidkit npm package update!

**Features:**
- 🔄 Auto-checks NPM registry every 24 hours
- 📢 Smart notifications with action buttons:
  - **Update Now** - Opens terminal with update command
  - **Release Notes** - Opens GitHub release page
  - **Skip This Version** - Dismisses notification for this version
- 🎯 Manual check: `Ctrl+Shift+P` → "RapidKit: Check for Updates"
- 🧠 Respects user preferences (won't spam if dismissed)

**Example Notification:**
```
🚀 RapidKit npm package v0.14.2 is available! (current: v0.14.1)
[📦 Update Now] [📋 Release Notes] [⏭️ Skip This Version]
```

---

## 📦 Technical Improvements

### 🧹 Cleaner Configuration
- Removed 26 deprecated `activationEvents` entries
- VS Code auto-generates these from `contributes`
- Smaller, cleaner `package.json`

### 📊 Enhanced Doctor Command
- Shows exact Poetry version (e.g., "Poetry version 1.7.1")
- Better error messages and recommendations
- Integrated with new Poetry detection system

---

## 🐛 Bug Fixes

### Poetry Cache Support
**Issue:** Extension only checked for `.venv` folder, causing false warnings for Poetry users.

**Fixed:** Now checks multiple locations in priority order:
1. `.venv` in project directory
2. Poetry cache via `poetry env info --path`
3. Fallback to standard detection

**Impact:** FastAPI projects with Poetry work seamlessly without manual configuration.

### Missing Workspace Directory Handling
**Issue:** Extension crashed with `ENOENT` error when selected workspace directory was deleted.

**Fixed:** Smart workspace validation and recovery:
1. Validates workspace directory exists before use
2. Shows helpful recovery dialog if workspace is missing
3. Options: Recreate Workspace | Choose New Location | Cancel
4. Automatically recreates workspace with proper configuration

**Impact:** No need to restart VS Code when workspace is accidentally deleted.

**Example Scenario:**
```
Before: User deletes ~/RapidKit/rapidkits/ directory
        → Tries to create project
        → Error: ENOENT: no such file or directory
        → Must restart VS Code to fix

After:  User deletes ~/RapidKit/rapidkits/ directory
        → Tries to create project
        → Dialog: "⚠️ Selected workspace no longer exists: rapidkits"
        → Click "Recreate Workspace"
        → Workspace recreated automatically
        → Project creation continues ✅
```

---

## 📚 New Files

### Poetry Helper Utilities
- `src/utils/poetryHelper.ts` - Comprehensive Poetry detection
  - `detectPythonVirtualenv()` - Smart virtualenv detection
  - `detectPoetryVirtualenv()` - Poetry cache lookup
  - `hasPoetryConfig()` - Check if project uses Poetry
  - `isPoetryInstalled()` - System check
  - `getPoetryVersion()` - Version info

### Update Checker
- `src/utils/updateChecker.ts` - Update notification system
  - `checkForUpdates()` - Check NPM registry
  - `getCurrentVersion()` - Get installed version
  - `getLatestVersion()` - Get NPM latest version
  - `checkAndNotifyUpdates()` - Background checker
  - `forceCheckForUpdates()` - Manual check command

---

## 🔄 Compatibility

### Synced with rapidkit-npm v0.14.1
This release aligns the VS Code extension with the latest npm package features:
- Poetry virtualenv detection (v0.14.1)
- Update notification mechanism
- Consistent behavior across CLI and extension

### Requirements
- **VS Code:** 1.100+ (unchanged)
- **Node.js:** 18+ (unchanged)
- **Python:** 3.11+ (unchanged)
- **Poetry:** Latest (optional, recommended)
- **rapidkit npm:** 0.14.0+ (recommended: 0.14.1+)

---

## 🚀 Upgrade Guide

### For Existing Users

**No action required!** Extension auto-updates via VS Code.

**Recommended:**
1. Update rapidkit npm: `npm install -g rapidkit@latest`
2. Reload VS Code window: `Ctrl+Shift+P` → "Reload Window"
3. Check system: `Ctrl+Shift+P` → "RapidKit: Run System Check"

### For Poetry Users

**Great news:** Your Poetry cache virtualenvs now work automatically!

**Before (workaround):**
```bash
poetry config virtualenvs.in-project true
```

**After (no workaround needed):**
```bash
# Just use Poetry normally - extension detects cache virtualenvs
poetry install
npx rapidkit dev  # Works! ✅
```

---

## 📝 Commands Reference

### New Commands

| Command | Description | Shortcut |
|---------|-------------|----------|
| `RapidKit: Check for Updates` | Manually check for npm package updates | - |

### Enhanced Commands

| Command | Enhancement |
|---------|-------------|
| `RapidKit: Run System Check` | Now shows exact Poetry version |
| `RapidKit: Start Dev Server` | Detects Poetry cache virtualenvs |
| `RapidKit: Install Dependencies` | Works with Poetry cache |

---

## 🎯 What's Next?

### Planned for v0.4.7+
- 🧪 Module installation UI
- 📊 Project dashboard enhancements
- 🔍 Better error diagnostics
- 🎨 More UI improvements

---

## 💬 Feedback

We'd love to hear your thoughts!

- 🐛 **Bug Reports:** [GitHub Issues](https://github.com/getrapidkit/rapidkit-vscode/issues)
- 💡 **Feature Requests:** [Discussions](https://github.com/getrapidkit/rapidkit-vscode/discussions)
- 📧 **Email:** support@getrapidkit.com

---

## 🙏 Thank You!

Thanks for using RapidKit! This release brings us closer to seamless FastAPI and NestJS development in VS Code.

**Happy Coding! 🚀**

---

[View Full Changelog](../../CHANGELOG.md) | [View All Releases](../)
