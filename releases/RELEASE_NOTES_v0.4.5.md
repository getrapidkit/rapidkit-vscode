# RapidKit VS Code Extension v0.4.5

**Release Date:** December 23, 2025

## 🎨 Actions Panel Redesign + ⚡ Project Quick Actions

Professional WebviewView sidebar + One-click project commands!

---

## What's New

### 🎨 ACTIONS WebviewView - Complete Redesign
Replaced simple TreeView with a rich WebviewView:

- **Minimal Design** - GitLens/GitHub Copilot style
- **Inline SVG Icons** - Perfect rendering (codicons don't work in webviews)
- **Framework Badges** - `PY` for Python/FastAPI, `TS` for TypeScript/NestJS
- **Brand Colors** - Hover effects with #00CFC1 (cyan), #E0234E (NestJS red)
- **Organized Sections**:
  - **Create**: New Workspace, FastAPI Project, NestJS Project
  - **Tools**: System Check, View Logs
  - **Resources**: Documentation, Welcome

### 🎨 Welcome Panel SVG Logo
- Upgraded from PNG to SVG for crisp rendering at any size
- Official brand colors: #00CFC1 (cyan) + #1C1C1C (shadow)

### 🖼️ rapidkit.svg - Official Brand Icon
- 3-layer design: shadow, main R, crown
- 24x24 viewBox, scalable to any size
- Ready for VS Code Marketplace distribution

### ⚡ 5 Project Quick Actions
Inline action buttons on each project in the PROJECTS panel:

| Icon | Action | Command |
|------|--------|---------|
| `$(terminal)` | **Open Terminal** | Opens terminal in project directory |
| `$(package)` | **Install Dependencies** | `npx rapidkit init` |
| `$(play)` | **Start Dev Server** | `npx rapidkit dev` |
| `$(beaker)` | **Run Tests** | `npx rapidkit test` ✨ NEW |
| `$(globe)` | **Open Browser** | Opens Swagger docs ✨ NEW |

**Before:** Switch to terminal → navigate to project → type command  
**Now:** Click one button! 🎉

### 📂 Project File Tree
Expand any project to see key files:
```
📂 my-api  🐍 FastAPI    [💻] [📦] [▶️] [🧪] [🌐]
  ├── $(code) FASTAPI
  ├── $(package) standard
  ├── $(info) No modules
  ├── ─────────────
  ├── $(folder) src/
  ├── $(folder) tests/
  ├── $(file) pyproject.toml
  └── $(markdown) README.md
```
Click any file to open it in the editor!

### 🌐 Open Browser with Options
When you click the browser icon:
1. Opens `http://localhost:8000/docs` (Swagger)
2. Shows notification with options:
   - **Open /docs** - Swagger UI
   - **Open /redoc** - ReDoc UI

### 🎨 Framework-Specific Icons
Visual distinction for your projects:
- **FastAPI** → 🐍 Green Python icon
- **NestJS** → 🔴 Red TypeScript icon

### 📝 Better Marketplace Description
Updated to match website messaging:
```
"Scaffold production-ready FastAPI & NestJS APIs with clean architecture"
```

---

## Bug Fixes

### 🐛 No More Annoying Workspace Switch
**Before:** Clicking a project name would trigger "Switch to this workspace?" and reload your entire VS Code — losing your tabs, terminal state, everything!

**After:** Clicking just expands/collapses the project. Use the action icons for commands.

### 🐛 rapidkitTemplates Error Fixed
Removed orphan TreeView registration that caused:
```
No view is registered with id: rapidkitTemplates
```

---

## Files Changed

| File | Change |
|------|--------|
| `package.json` | Version bump, 3 new commands, VS Code 1.100+ |
| `src/extension.ts` | New command handlers for quick actions |
| `src/ui/treeviews/projectExplorer.ts` | Removed workspace switch, added icons |
| `README.md` | Sync with npm package, clean architecture |

---

## New Commands

```json
{
  "command": "rapidkit.projectTerminal",
  "title": "Open Terminal",
  "icon": "$(terminal)"
},
{
  "command": "rapidkit.projectInit",
  "title": "Install Dependencies", 
  "icon": "$(package)"
},
{
  "command": "rapidkit.projectDev",
  "title": "Start Dev Server",
  "icon": "$(play)"
}
```

---

## Requirements

- **VS Code**: 1.100.0+ (updated from 1.85)
- **Node.js**: 18+ 
- **Python**: 3.11+ (for FastAPI)

---

## Installation

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "RapidKit"
4. Click Update

### From VSIX
```bash
code --install-extension rapidkit-vscode-0.4.5.vsix
```

---

## Full Changelog

See [CHANGELOG.md](../CHANGELOG.md) for complete version history.

---

🚀 **Happy Coding with RapidKit!**
