# Release Notes - v0.12.0

**Release Date:** February 15, 2026  
**Type:** Minor Release  
**Semver:** 0.12.0

---

## 🪟 Module Details Modal + Workspace-First CLI Resolution

This release improves module management UX and command reliability by introducing a rich in-app module details modal, strengthening workspace-first `rapidkit` binary resolution, and keeping workspace/module state synchronized after installs.

---

## ✨ What's New

### 🪟 In-App Module Details Modal

Module details now open directly inside the Welcome webview as a React modal with a tabbed layout:

- **Overview**
- **Dependencies**
- **Configuration**
- **Profiles**
- **Features**
- **Documentation**

The modal provides a richer and more consistent experience than the previous separate HTML panel.

### 🧩 Expanded Module Metadata Support

`ModuleData` typing has been extended to support richer CLI metadata rendering, including:

- runtime dependencies
- config sources/defaults/variables
- profiles and inherited profiles
- documentation links
- compatibility details
- support channels
- module changelog entries

### 🔄 Post-Install Workspace Refresh

After successful module installation, Welcome panel state now refreshes automatically:

- installed modules list updates immediately
- module catalog refreshes without requiring manual reload

---

## 🔄 Changed

### 🧭 Workspace-First CLI Resolution

`rapidkit` command execution now searches for `.venv/bin/rapidkit` by walking up parent directories from the current project path (nested workspace-safe), then falls back to global binary, then `npx`.

### 📡 JSON-Based Module Info Retrieval

Module details are fetched using:

`rapidkit modules info <module> --json`

The CLI response is merged with catalog data to provide more accurate version/details in UI.

### 🎨 UI/Style Improvements

Supporting style and component updates were applied for modal-driven details flow and webview consistency.

---

## 🧪 Validation

- Extension build: successful
- Extension package step: successful
- Release docs/version updated for `v0.12.0`

---

## 📁 Key Files Updated

- `src/core/rapidkitCLI.ts`
- `src/commands/addModule.ts`
- `src/ui/panels/welcomePanel.ts`
- `webview-ui/src/App.tsx`
- `webview-ui/src/components/ModuleDetailsModal.tsx`
- `webview-ui/src/types.ts`
- `webview-ui/src/styles.css`
- `webview-ui/src/styles-tailwind.css`

---

## ⬆️ Upgrade Notes

No migration steps required. Existing workspaces/projects continue to function as before.
