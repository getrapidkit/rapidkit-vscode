# RapidKit v0.3.0 Release Notes

**Release Date:** November 10, 2025

## 🐛 Bug Fixes

### Fixed Generate Demo Project Button

This release fixes a critical bug where the **"Generate Demo Project"** button in the PROJECTS view wasn't working correctly with demo workspaces.

**What was broken:**
- After creating a demo workspace, clicking the "Generate Demo Project" button would fail
- The command was trying to use `npx rapidkit --demo-only` instead of the workspace's `generate-demo.js` script
- Users had to manually select folders even when a workspace was already selected

**What's fixed:**
- ✅ Generate Demo Project button now automatically detects demo workspaces
- ✅ Uses the correct `generate-demo.js` script for demo workspaces
- ✅ Automatically uses the selected workspace path - no folder selection needed
- ✅ Falls back to `npx rapidkit --demo-only` for non-demo workspaces

## 🔧 Technical Improvements

### Enhanced Workspace Detection
- Added `rapidkit.getSelectedWorkspace` command to retrieve current workspace context
- Improved `generateDemoCommand` to automatically fetch selected workspace when called from UI buttons
- Enhanced demo workspace detection to check for `generate-demo.js` file existence

### Better User Experience
- Commands now work seamlessly with both demo and regular workspaces
- No need to repeatedly select folders - the extension remembers your workspace selection
- Clearer logging for debugging workspace-related issues

## 📦 Installation

Install from VS Code Marketplace:
```
ext install getrapidkit.rapidkit
```

Or download the VSIX package and install manually:
```bash
code --install-extension rapidkit-0.3.0.vsix
```

## 🚀 Getting Started with Demo Workspaces

1. Click the RapidKit icon in the Activity Bar
2. Create a new workspace in demo mode
3. Select the workspace in the Workspaces view
4. Click **"Generate Demo Project"** in the PROJECTS view
5. Enter a project name - that's it! ✨

## 🙏 Thank You

Thank you to everyone who reported this issue and helped us improve RapidKit!

If you encounter any issues or have suggestions, please [open an issue on GitHub](https://github.com/getrapidkit/rapidkit-vscode/issues).

---

**Full Changelog:** https://github.com/getrapidkit/rapidkit-vscode/blob/main/CHANGELOG.md
