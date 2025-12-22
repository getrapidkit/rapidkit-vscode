# RapidKit VS Code Extension v0.4.4

**Release Date:** December 22, 2025

## 🩺 Doctor Enhancement & Code Quality

This release focuses on improving system diagnostics and code quality.

---

## What's New

### 🩺 RapidKit npm Check in Doctor
The Doctor command now includes a check for `npx rapidkit --version`:
- **Shows installed version** - Displays the npm package version if cached
- **"Not cached" status** - Indicates when npm package needs to be fetched
- **Helps diagnose issues** - Easier troubleshooting of npm package availability

### 🔄 Dynamic Version Markers
Marker files now use extension version dynamically instead of hardcoded values:
- New `getExtensionVersion()` utility function in `utils/constants.ts`
- Centralized constants for extension metadata, markers, and URLs
- No more manual version bumps in marker file code

### 🐛 TypeScript Fixes
- **Added `'preview'` to `RapidKitModule.status` type**
- Fixed 30+ TypeScript compilation errors in `moduleExplorer.ts`
- All module statuses now properly typed: `'stable' | 'beta' | 'experimental' | 'preview'`

### 📝 Documentation Updates
- Fixed CHANGELOG links to include all releases (0.4.0-0.4.3)
- Updated Unreleased compare link

---

## Files Changed

| File | Change |
|------|--------|
| `src/utils/constants.ts` | ✨ NEW - Centralized extension constants |
| `src/types/index.ts` | Added `'preview'` to status type |
| `src/commands/doctor.ts` | Added RapidKit npm version check |
| `src/commands/createProject.ts` | Use dynamic version markers |
| `src/commands/createWorkspace.ts` | Use dynamic version markers |
| `CHANGELOG.md` | Added v0.4.4 entry + fixed links |

---

## Technical Details

### New Constants Module (`src/utils/constants.ts`)
```typescript
// Dynamic version getter
export function getExtensionVersion(): string {
  const extension = vscode.extensions.getExtension('rapidkit.rapidkit-vscode');
  return extension?.packageJSON?.version ?? '0.0.0';
}

// Centralized constants
export const EXTENSION = { ID, PUBLISHER, NAME };
export const MARKERS = { WORKSPACE_SIGNATURE, WORKSPACE_SIGNATURE_LEGACY, ... };
export const URLS = { DOCS, GITHUB, MARKETPLACE, ... };
```

### Doctor Check Flow (5 checks now)
1. ✅ Node.js version
2. ✅ npm version
3. ✅ npm registry connectivity
4. ✅ **RapidKit npm package version** (NEW)
5. ✅ VS Code version

---

## Installation

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "RapidKit"
4. Click Update (or Install)

### From VSIX
```bash
code --install-extension rapidkit-vscode-0.4.4.vsix
```

---

## Compatibility

- **VS Code**: 1.100.0+
- **Node.js**: 18.x+ recommended
- **npm**: 9.x+ recommended
- **RapidKit npm**: 0.13.0+ (auto-fetched via npx)

---

## Full Changelog

See [CHANGELOG.md](../CHANGELOG.md) for complete version history.

---

🚀 **Happy Coding with RapidKit!**
