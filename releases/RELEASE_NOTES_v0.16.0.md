# Release Notes — v0.16.0 (March 22, 2026)

## 🩺 Workspace Health Sidebar + Module Install Modal

### What's New

#### Workspace Health Panel (Doctor Evidence Viewer)

A new **WORKSPACE HEALTH** panel now lives in the RapidKit sidebar. It reads the existing `.rapidkit/reports/doctor-last-run.json` evidence file and renders a live inline dashboard — no extra CLI call needed.

**Tree structure:**
```
70%  ███████░░░   ✅ 7  ⚠️ 3  ❌ 0
Last checked: 4m ago  (cached scan)
▾ System Tools               all ok
    ✅  Python   Python 3.10.19
    ✅  Poetry   Poetry 2.3.2
    ⚠️  pipx    pipx not installed
    ✅  Go       Go 1.22.0
    ✅  RapidKit Core   v0.25.3
▾ Projects (5)               2 with issues
    ⚠️  my-fast-std    fastapi
      › deps not installed
    ✅  my-nest-prj    nestjs
    ...
```

**Toolbar buttons** (top-right of the panel):
- `$(run)` **Re-run Doctor** — runs `npx rapidkit doctor workspace` in a terminal
- `$(wrench)` **Auto-fix Issues** — runs `npx rapidkit doctor workspace --fix`
- `$(refresh)` **Refresh** — re-reads the evidence file from disk

**Auto-refresh:** The panel auto-refreshes via a file watcher whenever the CLI writes new evidence, and also syncs immediately when you switch workspaces.

---

#### Module Install Modal from Sidebar

Clicking any module in **AVAILABLE MODULES** now opens the same install confirmation modal as the welcome page:

```
Install Module
Confirm installation details

Ai Assistant
Provider-agnostic AI integration
v0.1.11  ·  ai

Installation Target
my-minimal-wsp
/home/rapidx/RapidKit/rapidkits/my-minimal-wsp

Command:
npx rapidkit add module free/ai/ai_assistant

[Cancel]   [Install Module]
```

No more silent CLI invocation — users see exactly what will be installed, where, and what command will run.

---

### Technical Changes

- New `DoctorEvidenceProvider` (`src/ui/treeviews/doctorEvidenceProvider.ts`)
- New command `rapidkit.showModuleInstallModal` registered in `coreCommands.ts`
- New webview message `openModuleInstallModal` in `App.tsx`
- `WelcomePanel.setExtensionContext()` + `WelcomePanel.showModuleInstallModal()` static methods
- `workspaceExplorer.onDidChangeTreeData` subscription for live health panel sync
- Live getter pattern: health panel reads workspace path on each render, no stale cache
