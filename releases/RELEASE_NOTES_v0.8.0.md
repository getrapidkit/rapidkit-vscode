# Release Notes — v0.8.0

**Release Date:** February 9, 2026

## 🎨 Workspace Cards Redesign + Dynamic Version

This release introduces a complete redesign of workspace cards with detailed project statistics and automatic version synchronization.

### Added

#### 🔄 Dynamic Version Display
- Version is now fetched from `package.json` automatically via extension context
- Eliminated manual hardcoded version string in React app
- Extension sends version to webview on initialization
- Ensures version consistency across extension metadata and UI display

#### 📊 Enhanced Project Statistics
- Replaced simple `projectTypes` array with detailed `projectStats` object
- Individual counters for FastAPI and NestJS projects
- Shows total project count with breakdown by framework
- Empty workspace indicator for workspaces with 0 projects

### Improved

#### 🎨 Redesigned Workspace Cards
Complete UI/UX overhaul with:
- **Compact horizontal layout** — More information in less vertical space
- **Color-coded project badges** — ⚡ FastAPI (teal), 🐱 NestJS (pink)
- **Individual project counts** — Shows exact number of each project type
- **Better visual hierarchy** — Name, version, projects, time, status all in one row
- **Inline metadata** — Last modified time displayed alongside badges
- **Hover-only close button** — Cleaner appearance, button appears on hover
- **Improved path display** — Better truncation with RTL direction for long paths
- **Enhanced status icons** — Wrapped in tooltips for better accessibility

#### 🔍 Enhanced Project Detection
- Projects now detected **directly in workspace root** (not `projects/` subfolder)
- Checks for RapidKit project markers (`.rapidkit/project.json`, `.rapidkit/context.json`)
- Fallback detection for FastAPI projects (`pyproject.toml`)
- Fallback detection for NestJS projects (`package.json` with `@nestjs/core`)
- Separate counters maintained for accurate statistics

### Changed

#### 📐 Data Structure Update
**Before:**
```typescript
interface Workspace {
  projectTypes?: ('fastapi' | 'nestjs')[];
}
```

**After:**
```typescript
interface Workspace {
  projectStats?: {
    fastapi?: number;
    nestjs?: number;
  };
}
```

Benefits:
- More granular information
- Future-proof for additional project types
- Better performance (no duplicate type detection)

### Technical Details

**Files Modified:**
- `src/ui/panels/welcomePanel.ts` — Added version sending, improved project detection
- `webview-ui/src/App.tsx` — Dynamic version state management
- `webview-ui/src/components/RecentWorkspaces.tsx` — Complete card redesign
- `webview-ui/src/types.ts` — Updated Workspace interface
- `webview-ui/src/styles.css` — New workspace card styles (`.ws-*` classes)
- `webview-ui/src/styles-tailwind.css` — Tailwind utilities for cards
- `src/ui/webviews/actionsWebviewProvider.ts` — Code formatting

**CSS Architecture:**
- New class naming convention: `ws-*` prefix for workspace cards
- `ws-card` — Main card container
- `ws-row-top` — Top row (name, badges, time, status, close)
- `ws-row-bottom` — Path display
- `ws-tag--*` — Modifiers for different badge types
- Theme-aware color utilities (`text-green-500`, etc.)

**Bundle Size Impact:**
- Minimal increase (~1-2KB) due to new styles
- No new dependencies added

### Migration Notes

For users with custom workspace tracking:
- `projectTypes` field is deprecated (still readable but not written)
- New field `projectStats` provides more detailed information
- Old data structure is automatically upgraded on first read

---

**Full Changelog:** [CHANGELOG.md](../CHANGELOG.md)
