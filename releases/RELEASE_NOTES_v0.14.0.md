# Release Notes — v0.14.0

**Release Date:** February 25, 2026

## 🎯 Workspace/Project Accuracy + Persistent Welcome UX

### Summary

This release focuses on correctness and durability across the Welcome experience: profile-aware guidance, strict workspace-vs-project state handling, robust external example actions, and persistent setup-card visibility.

---

## ✨ Added

### 🧭 Profile-aware Command Reference
- Welcome `CommandReference` now adapts command lists to the active workspace profile
- No-active-workspace guidance is tied to sidebar `WORKSPACES` selection semantics

### 👁️ Persistent Setup Status Visibility
- Added hide/show controls for Setup Status card
- Visibility preference persists across Welcome panel reopen and VS Code restart
- Persistence is stored in extension-side state and synced to webview

### 🏷️ Workspace Profile Tags in UI
- Profile tags are visible in Welcome `Recent Workspaces`
- Sidebar `WORKSPACES` entries include profile markers for quick context

---

## 🔧 Fixed

### 🌐 Example Workspaces External Opening
- Replaced direct webview `window.open` behavior with extension-host mediated URL open action
- Prevented broken/blocked external navigation from webview cards

### 📦 Example Clone URL Regression
- Separated browse URL and clone URL responsibilities
- `repoUrl` used for browsing; `cloneUrl` used for `git clone`
- Fixed clone failures caused by `/tree/main/...` style URLs

### 🧠 Module Install Gating by Project Selection
- Module cards/actions now require selected **project** state
- Selecting a workspace alone no longer enables install/update actions
- Clarified workspace-vs-project selection behavior in Welcome UI

### 🎨 Theme Correctness in Quick Actions
- Removed hardcoded color behavior in key quick-action surfaces
- Aligned styling with VS Code theme tokens for dark/light readability

---

## 🧪 Reliability & Guardrails

- Strengthened drift-guard checks around command/profile contracts
- Added repository text guard to prevent unintended Persian/Arabic text drift
- Kept sidebar and Welcome state sources aligned to avoid context mismatch

---

## 📦 Package

- **Version:** 0.14.0
- **Marketplace:** [RapidKit on VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=rapidkit.rapidkit-vscode)
