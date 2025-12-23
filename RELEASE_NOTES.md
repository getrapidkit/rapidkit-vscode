# Release Notes

## Latest Release: v0.4.5 (December 23, 2025)

### Actions Panel Redesign + Project Quick Actions ⚡

**Professional WebviewView sidebar + One-click project commands!**

### What's New

- **🎨 ACTIONS WebviewView** - Completely redesigned sidebar
  - Professional button design (GitLens-style minimal UI)
  - Inline SVG icons for perfect rendering
  - Framework badges: `PY` / `TS`
  - Sections: Create, Tools, Resources
- **🎨 Welcome Panel SVG Logo** - Upgraded from PNG to SVG
  - Crisp rendering at any display size
  - Official brand colors: #00CFC1 + #1C1C1C
- **🖼️ rapidkit.svg** - Official brand icon with shadow effect
- **⚡ Project Quick Actions** - 5 inline buttons on each project in PROJECTS panel
  - `💻` **Open Terminal** - Opens terminal in project directory
  - `📦` **Install Dependencies** - Runs `npx rapidkit init`
  - `▶️` **Start Dev Server** - Runs `npx rapidkit dev`
  - `🧪` **Run Tests** - Runs `npx rapidkit test` ✨ NEW
  - `🌐` **Open Browser** - Opens Swagger docs with options ✨ NEW
- **📂 Project File Tree** - Expand project to see key files
  - Shows `src/`, `tests/`, config, README
  - Click any file to open it directly
- **🎨 Framework Icons** - Visual distinction for projects
  - 🐍 Green icon for FastAPI (Python)
  - 🔴 Red icon for NestJS (TypeScript)
- **📝 Better Marketplace Description** - Clean architecture focus
- **🐛 No More Workspace Switch** - Clicking project doesn't reload VS Code

---

## Previous Releases

### v0.4.4 (December 22, 2025)

**Doctor Enhancement & Code Quality**

- **🩺 RapidKit npm Check in Doctor** - System check now verifies `npx rapidkit --version`
- **🔄 Dynamic Version Markers** - Marker files now use extension version from package.json
- **🐛 TypeScript Fix** - Added `'preview'` to `RapidKitModule.status` type
- **📝 Documentation** - Updated CHANGELOG links (0.4.0-0.4.3)

---

### v0.4.3 (December 12, 2025)

**UI/UX Enhancements & Complete Module Catalog**

- **🧩 Complete Module Explorer** - 27 modules across 12 categories (AI, Auth, Billing, Business, Cache, Communication, Database, Essentials, Observability, Security, Tasks, Users)
  - All marked as "🔜 Coming Soon" preview
  - Full integration planned for Q1 2026
- **📢 Enhanced Notifications** - Action buttons for better workflow
  - Project creation: `📂 Open in Editor`, `⚡ Open Terminal`, `🧩 Add Modules`, `📖 View Docs`
  - Module addition: `📖 View Module Docs`, `➕ Add Another Module`
  - System check: `📊 View Full Report` or `🔧 View Issues`
- **🎨 Cleaner UI**
  - Removed TEMPLATES tab (redundant)
  - Enhanced ACTIONS panel with categories (Quick Start, Resources, Feedback)
  - Safer context menus - dangerous operations at bottom
- **📊 Better Status Bar** - Shows project count: `🚀 RapidKit | X Projects | Ready`

---

| Version | Date | Highlights |
|---------|------|------------|
| [v0.4.5](releases/RELEASE_NOTES_v0.4.5.md) | Dec 23, 2025 | Project quick actions, no workspace switch |
| [v0.4.4](releases/RELEASE_NOTES_v0.4.4.md) | Dec 22, 2025 | Doctor npm check, dynamic versions |
| [v0.4.3](releases/RELEASE_NOTES_v0.4.3.md) | Dec 12, 2025 | Module explorer, UI enhancements |
| [v0.4.2](releases/RELEASE_NOTES_v0.4.2.md) | Dec 5, 2025 | Logging commands, marketplace improvements |
| [v0.4.1](releases/RELEASE_NOTES_v0.4.1.md) | Dec 4, 2025 | Documentation update, README rewrite |
| [v0.4.0](releases/RELEASE_NOTES_v0.4.0.md) | Dec 3, 2025 | Smart location detection, npm migration |
| [v0.3.1](releases/RELEASE_NOTES_v0.3.1.md) | Dec 3, 2025 | Bug fixes |
| [v0.3.0](releases/RELEASE_NOTES_v0.3.0.md) | Dec 2, 2025 | New features |
| [v0.1.3](releases/RELEASE_NOTES_v0.1.3.md) | Nov 2025 | Improvements |
| [v0.1.2](releases/RELEASE_NOTES_v0.1.2.md) | Nov 2025 | Bug fixes |
| [v0.1.1](releases/RELEASE_NOTES_v0.1.1.md) | Nov 2025 | Minor updates |
| [v0.1.0](releases/RELEASE_NOTES_v0.1.0.md) | Nov 2025 | Initial release |

For complete changelog, see [CHANGELOG.md](CHANGELOG.md).

---

## Links

- 📦 [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=rapidkit.rapidkit-vscode)
- 🐙 [GitHub Repository](https://github.com/getrapidkit/rapidkit-vscode)
- 📚 [Documentation](https://getrapidkit.com/docs)
- 🚀 [npm Package](https://www.npmjs.com/package/rapidkit)
