# Release Notes — v0.20.0 (April 20, 2026)

## ✦ @workspai Chat Participant + AI Create Presets + Workspace Hardening

### Summary

This release brings the `@workspai` participant directly into the VS Code Chat panel so users can interrogate their workspace and debug with AI without ever leaving the chat sidebar. It also ships smart categorised prompt presets in the AI Create modal, hardens workspace memory with full input sanitisation, makes workspace creation fully idempotent, enriches AI context with live module data fetched from the CLI, and registers a new set of workspace and cache/mirror commands.

---

### Added

- **`@workspai` Chat Participant**
  The extension now registers `workspai.assistant` as a VS Code chat participant.
  - `/ask` — freeform Q&A with full project context: architecture, installed modules, conventions, workspace memory, framework details
  - `/debug` — structured debug flow: root cause analysis, specific fix, prevention advice
  Both commands reuse the same `prepareAIConversation → streamAIResponse` pipeline as the Workspai AI modal, so the response quality is identical.

- **AI Create presets**
  The AI Create modal now includes a categorised quick-fill preset system:
  - Categories: SaaS & commerce, Core backend, Microservices, Data & ML, Internal tools
  - Smart scoring surfaces the most relevant presets based on partial input already typed
  - Selecting a preset fills the prompt field instantly

- **"Which backend next?" poll**
  A compact inline poll in the QuickLinks panel lets users vote for the next supported framework (Django / Express / Spring). The result is acknowledged inline with a friendly confirmation message.

- **Workspace commands suite**
  New commands registered and palette-accessible:
  - `workspai.workspaceBootstrap` / `workspai.workspaceSetup` / `workspai.workspaceInit`
  - `workspai.workspacePolicyShow` / `workspai.workspacePolicySet`
  - `workspai.cacheStatus` / `workspai.cacheClear` / `workspai.cachePrune` / `workspai.cacheRepair`
  - `workspai.mirrorStatus` / `workspai.mirrorSync` / `workspai.mirrorVerify` / `workspai.mirrorRotate`
  - `workspai.checkForUpdates`

- **WorkspaceMemoryService unit tests**
  New `src/test/workspaceMemoryService.test.ts` covering:
  - Read/write round-trips
  - Sanitisation of malformed `conventions` and `decisions` arrays
  - ISO timestamp validation and fallback behaviour
  - Concurrent-access and missing-file paths

---

### Changed

- **Workspace memory hardening**
  `WorkspaceMemoryService` now validates and sanitises all four memory fields (`context`, `conventions`, `decisions`, `lastUpdated`) on every read:
  - `conventions` and `decisions` are filtered to non-empty strings only
  - `lastUpdated` is validated as a real ISO timestamp and cleared if malformed
  - Corrupt entries are auto-corrected and written back in place

- **Live module catalogue in AI context**
  `aiService` now fetches the available module catalogue directly from the CLI (`rapidkit modules list --json-schema 1`) with a 60-second in-process TTL cache. AI responses reference the real current module list rather than a static snapshot. Go workspaces bypass module catalogue lookups entirely (Go kits don't use the module marketplace).

- **Idempotent workspace creation**
  `createWorkspace` now handles two edge cases gracefully:
  - A directory exists but has no `.rapidkit-workspace` marker (partial/failed previous run) → user is prompted to "Replace (delete & recreate)" or cancel
  - A `.rapidkit-workspace` marker already exists → CLI call is skipped entirely as a silent idempotent success

- **Brand icons updated**
  `media/icons/workspai.png` and `media/icons/workspai.svg` updated to the current Workspai identity. Stale `media/icons/rapidkits.svg` removed.

---

### Fixed

- **AI module slug validation**
  Module slugs returned by the AI are now cross-checked against both the live module list and a `vendor/category/slug` regex (`^(?:[a-z0-9-]+)\/[a-z0-9_-]+\/[a-z0-9_-]+$`) before being applied to the CLI, preventing hallucinated module names from causing CLI errors.

- **Richer AI project context payload**
  The context object passed to the AI now includes: `python_version`, `rapidkit_cli_version`, `rapidkit_core_version`, `installed_modules` (array of slugs), `workspace_health` (total/passed/warnings/errors/generatedAt), `runtime`, and `engine` — giving the model complete environment awareness for more accurate responses.
