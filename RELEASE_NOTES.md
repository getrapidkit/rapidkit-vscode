# Release Notes

## Latest Release: v0.22.0 (April 29, 2026)

### ✦ Incident Studio + Setup UX + Workspace Sharing + Graph-Aware Release Controls

**Summary:** This release packages the full 37-commit train currently ahead of `origin/main`, not just one feature slice. It introduces the Incident Studio foundation, a new setup experience, workspace share bundle flows, system-graph-backed architecture reasoning, editor A08 surfaces, wave-2 release gating and rollback evidence, doctor/telemetry improvements, and a production dependency security refresh.

#### Added

- **Incident Studio foundation**
  Shipped the core AI Incident Studio experience with:
  - lifecycle-aware host/webview contracts
  - graph-backed action handling
  - support panels for memory, resume, telemetry, and prompt policy
  - normalized partial-failure and verify-readiness behavior
  - end-to-end regression coverage

- **Setup experience replacement**
  Replaced the old setup panel with a full setup experience surface that better handles tool readiness, system requirements, and guided onboarding inside the extension.

- **Workspace share bundle flows**
  Added workspace share bundle parsing plus dashboard import/export actions so teams can move workspace context more intentionally through the VS Code UI.

- **System graph and A08 baseline**
  Added:
  - workspace system graph indexing
  - deterministic blast-radius scoring
  - Incident Studio Architecture Lens
  - editor Architecture CodeLens
  - inline architecture warnings near diagnostics or fallback anchors

- **Wave-2 release controls**
  Added release-stop automation, manifest/KPI wiring, hard-gate reporting, controlled override policy, and verify-fail auto-rollback evidence plumbing.

- **Doctor and telemetry reporting**
  Added doctor telemetry refresh views plus richer project logs/context reporting used by the release-gate and incident flows.

- **Expanded automated coverage**
  Added deep tests for Incident Studio contracts, system graph indexing, release-stop gating, workspace share bundles, config files, telemetry, and A08 editor surfaces.

#### Changed

- **AI context and prompting stack** — formalized the AI context contract/resolver, expanded project-context extraction, and aligned chat, debug, and incident flows around the same context-rich execution path.
- **UI and command surface alignment** — updated command handlers, wizards, schemas, tree views, config-file tooling, and extension activation wiring to support the new setup, sharing, incident, and graph-aware workflows.
- **Architecture evidence is now unified** — impact, predictive, release-gate, and graph signals are now presented as one coherent review path instead of scattered UI fragments.
- **Dependency lockfile security refresh** — `npm audit fix` was applied to the release line, clearing current production dependency audit findings.

#### Fixed

- **Prompt and mutation safety** — hardened prompt sanitization, adversarial guards, verify-first policy enforcement, and unknown-scope blocking behavior.
- **Workspace and panel stability** — fixed workspace detection gaps, project switching races, webview readiness issues, sync cache invalidation, module browser sluggishness, and partial-failure normalization around Incident Studio flows.
- **Architecture review discoverability** — users no longer need to infer blast radius from separate UI fragments or top-of-file-only affordances.
- **Production npm audit exposure** — current runtime dependency audit findings are cleared for this release line.

#### Validation Snapshot

- Type check: pass
- Lint: pass
- Build: pass
- Compile: pass
- VSIX package: pending final run on release state
- Full test suite: 182/182 pass
- Production audit (`npm audit --omit=dev`): 0 vulnerabilities
- Full audit: only dev-tooling vulnerabilities remain, blocked upstream by `@vscode/test-cli` -> `mocha` -> `serialize-javascript` and one nested `brace-expansion` path

---

## Latest Release: v0.21.0 (April 23, 2026)

### ✦ AI Action Expansion + Telemetry Insights + Runtime Hardening

**Summary:** This release expands the free AI action surface across command palette, sidebar inline actions, and quick-actions webview; introduces workspace telemetry summaries plus onboarding experiment stats; and hardens runtime reliability with safer doctor metadata fetches, bounded port scans, and startup path-race fixes.

#### Added

- **Expanded AI action commands** available from palette and menus:
  - `AI Quick Actions`
  - `AI Smart Route`
  - `AI Fix Preview (Lite)`
  - `AI Change Impact (Lite)`
  - `Analyze Terminal Output with AI`
  - `Guided Workspace Memory Setup`
  - `AI Recipe Packs`
- **Telemetry commands**:
  - `Show Telemetry Summary`
  - `Reset Telemetry Data`
  - `Show AI Feature Tour`
  - `Show Onboarding Experiment Stats`
- **AI onboarding tour** with follow-up variant tracking and conversion metrics hooks.

#### Changed

- **Action surface consistency** — WORKSPACES / PROJECTS inline action groups and the Actions webview now align with the same AI-first flows.
- **AI telemetry depth** — `@workspai` chat and AI modal now emit structured outcome telemetry (`success`, `prepare-error`, `cancelled`, `error`) with context-safe metadata.
- **Telemetry UX in logs/context panel** — added JSON summary views, quick summary copy, and one-click reset/open marker paths.

#### Fixed

- **Doctor metadata fetch safety** — added timeout, bounded redirects, and same-host redirect enforcement.
- **Project dev startup resilience** — replaced unbounded recursive port probing with bounded scan + fallback.
- **Workspace init stability** — made workspace registry directory creation synchronous during startup to avoid race conditions.

---

## Latest Release: v0.20.0 (April 20, 2026)

### ✦ @workspai Chat Participant + AI Create Presets + Workspace Hardening

**Summary:** This release ships the `@workspai` participant directly in the VS Code Chat panel (with `/ask` and `/debug` slash commands), adds smart categorised prompt presets to the AI Create modal, hardens workspace memory with full sanitisation, makes workspace creation idempotent, and enriches AI context with live module data from the CLI.

#### Added

- **`@workspai` Chat Participant** — use `@workspai /ask` for full-context Q&A scoped to your active project, or `@workspai /debug` for a structured root-cause + fix + prevention debug flow. Both commands run through the same AI pipeline as the Workspai modal.
- **AI Create presets** — categorised quick-fill options (SaaS & commerce, core backend, microservices, data & ML, internal tools) surface in the AI Create modal. Smart scoring shows the most relevant presets as you type.
- **"Which backend next?" poll** — vote for Django, Express, or Spring directly from the sidebar; result acknowledged inline.
- **New workspace commands** — bootstrap, setup, init, policy (show/set), cache (status/clear/prune/repair), mirror (status/sync/verify/rotate), and `checkForUpdates` all registered and palette-accessible.
- **WorkspaceMemoryService tests** — new unit tests covering read/write round-trips, sanitisation, timestamp validation, and concurrent-access paths.

#### Changed

- **Workspace memory hardening** — all memory fields are now validated and sanitised on every read; corrupt entries are auto-corrected and written back
- **Live module catalogue in AI context** — AI responses now reference the actual current module list fetched from the CLI (60-second TTL cache) instead of a static snapshot
- **Idempotent workspace creation** — partial directories trigger a "Replace or Cancel" prompt; fully complete workspaces skip the CLI call silently
- **Brand icons updated** — `workspai.png` / `workspai.svg` refreshed; stale `rapidkits.svg` removed

#### Fixed

- **AI module slug validation** — slugs from AI are cross-checked against the live module list and a `vendor/category/slug` regex before reaching the CLI
- **Richer AI project context** — payloads now include Python version, CLI/core versions, installed modules list, workspace health stats, runtime, and engine

---

## Latest Release: v0.19.1 (April 19, 2026)

### ✦ Toolchain Reliability + Go Context + Workspai Positioning

**Summary:** This release hardens cross-platform tool verification, improves how Go workspaces are detected and explained inside the AI experience, and aligns public-facing Workspai positioning across the extension. The result is more reliable doctor/setup flows, more accurate Go guidance, and cleaner product messaging in the editor and Marketplace surfaces.

#### Changed

- **Workspai product positioning sync** — extension README, Marketplace description, and webview header now consistently present Workspai as "The AI workspace for backend teams"
- **Go AI guidance** — AI module/context messaging now clearly explains that Go kits use `gofiber.standard` and `gogin.standard`, and that Go projects should be extended with native Go packages and internal adapters rather than RapidKit marketplace modules
- **Go kit metadata cleanup** — removed misleading `modular` tag from Go/Fiber and Go/Gin kit descriptors

#### Fixed

- **Workspace memory inline action icon** — the sidebar action for editing workspace memory now uses a valid codicon, so the button glyph is visible again next to each workspace instead of showing only an empty clickable slot
- **Cross-platform `rapidkit` command execution** — all generated wrapper commands now use explicit npm package resolution via `npx --yes --package rapidkit rapidkit ...`, preventing cwd launcher shadowing on Windows and other shell environments
- **Go workspace detection** — `go.mod` analysis now detects Go/Fiber and Go/Gin projects from real framework dependencies instead of relying on RapidKit-specific strings
- **Toolchain verification stability** — setup checks now verify `rapidkit-core` using `pip show` / `pipx list` paths that are more reliable across Windows and Linux environments
- **Poetry verification discovery** — setup flow now checks real Poetry executable candidates only when present, reducing false negatives and noisy verification attempts

---

## Latest Release: v0.19.0 (April 18, 2026)

### ✦ AI Streaming UX + Model Selector

**Summary:** This release fixes the core AI streaming experience — responses now appear token-by-token in real time instead of all at once after a delay. Users can also choose which AI model answers their queries from a compact inline dropdown in the modal header.

#### Added

- **AI model selector** in the modal header — choose Claude, GPT, Gemini, or any other Copilot-registered model per query; premium users see their full roster, free users see their available models; defaults to "Auto" (workspace preference)
- **Thinking indicator** — animated bouncing dots shown during the context-scan phase before the first token arrives, replacing the blank-cursor wait state
- **MarkdownRenderer** — a new zero-dependency markdown renderer for AI responses: headings, bold/italic, inline code, fenced code blocks, lists, HR

#### Fixed

- **Real-time streaming** — resolved the "response appears all at once" problem; the extension host now time-slices postMessage calls via a 50 ms flush interval, breaking VS Code IPC batching that held all tokens until stream end
- **Streaming render overhead** — `MarkdownRenderer` no longer re-parses the full response on every animation frame during streaming; raw text is shown live, then formatted in a single pass on completion
- **Menu item warning** — removed invalid `collapseAll` menu reference; uses native `showCollapseAll: true` on the Projects tree view instead

---

## v0.18.0 (April 17, 2026)

### ✦ AI Stability + Context Intelligence Upgrade

**Summary:** This release hardens the AI engine for production usage by improving model resolution and fallback logic, making workspace memory and context assembly more resilient, and strengthening prompt/request safety. The result is more reliable AI generation and debugging behavior across large or mixed-framework repositories.

#### Added

- **Deeper AI context extraction** across FastAPI, NestJS, and Go projects to improve answer quality and generation relevance
- **New AI-focused tests** to guard model alias handling and debugger command behavior

#### Changed

- **Model mapping and fallback strategy** updated for modern Copilot/GitHub model IDs and aliases
- **Workspace memory service flow** converted to async path for non-blocking operations
- **Legacy AI commands unified** through the shared Workspai AI modal path for consistent UX

#### Fixed

- **Prompt budget controls** to avoid oversized requests in large workspaces
- **Module slug typo normalization** for safer module operations
- **AI request lifecycle handling** (request correlation/cancel flows) for more predictable streaming behavior

---

## v0.17.1 (April 17, 2026)

### ⚡ Deep Performance Audit — All Sidebars + UI Polish

**Summary:** Every sidebar panel now renders instantly. Six performance bottlenecks were identified and fixed across `workspaceExplorer`, `projectExplorer`, `moduleExplorer`, `extension.ts`, `coreVersionService`, and `examplesService`. Two-phase rendering is now consistent across all three tree views. Additionally, the Available Modules empty state was upgraded to a rich VS Code `viewsWelcome` panel, the HeroAction badge alignment was corrected, and a missing `devDependency` was added.

#### Performance

- **WORKSPACES — two-phase rendering** — items render instantly from cache; version badge, profile tag, and module count load in background via `_scheduleBackgroundMetadataLoad`
- **PROJECTS — two-phase rendering** — tree appears immediately from `this.projects`; `_scheduleProjectLoad()` runs in background; `loadProjects()` uses `Promise.all` for parallel `pathExists` checks per project
- **AVAILABLE MODULES — two-phase rendering** — `loading~spin` spinner shown immediately; catalog fetched in background via `_scheduleBackgroundCatalogLoad()`; never blocks `getChildren()`
- **Extension activation** — `workspaceDetector.detectRapidKitProjects()` deferred to background (was blocking entire activation with `await`)
- **`coreVersionService` TTL** — 5 min → 30 min — subprocess version check runs far less often
- **`examplesService` timeout** — 10 s → 5 s

#### Fixed

- **AVAILABLE MODULES empty state** — returns `[]` when no project selected; VS Code `viewsWelcome` shows rich empty state with `$(package)` icon, heading, description, and "Open Projects" button
- **Doctor refresh `setTimeout` removed** — fragile `setTimeout(5000/8000)` after doctor re-run and autofix deleted; file watcher on `doctor-last-run.json` handles refresh automatically
- **`HeroAction.tsx` badge alignment** — Sparkles icon now sits inline with badge text via `inline-flex items-center gap-1`
- **Dead code** — `_ensureCatalogLoaded()` removed from `moduleExplorer` (unused after two-phase refactor)
- **`concurrently` added to `devDependencies`** — was used in `dev` script but missing from declared deps

---

## v0.17.0 (April 16, 2026)

### ✦ AI Assistant, Doctor Fix with AI, Code Actions & Minimizable Modal

**Summary:** Introduces deep AI integration across the extension — editor Code Actions for inline debug/explain, AI-powered fix suggestions directly from the Workspace Health panel, AI module recommendations in the Create Project flow, and a minimizable floating pill for the AI Create modal. Consolidates the Quick Actions sidebar to a single **AI Assistant** button.

#### Added

- ✦ **AI Debug Actions (Code Actions)** — `✦ Debug with Workspai AI` and `✦ Explain error with AI` quick-fix lightbulb actions appear in the editor for Python, TypeScript, JavaScript, and Go files with diagnostics or a text selection; opens the AI modal with the error/selection pre-filled in Debug mode
- ✦ **Doctor Fix with AI** — each issue in the **Workspace Health** sidebar now has a ✨ inline button; clicking it opens the AI modal with the full issue context pre-filled
- ✦ **AI Module Suggestions** — the Create Project modal has a new "Suggest modules with AI" button that recommends the top modules for your chosen framework and project description
- **Minimizable AI Create modal** — a `−` button appears during `thinking` and `creating` steps; collapses to a floating pill in the bottom-left corner so the dashboard stays usable; auto-restores when creation completes

#### Changed

- **Quick Actions sidebar** — consolidated to a single `✦ AI Assistant` button that opens the AI modal; redundant "Workspace Brain" button removed
- **`rapidkit.debugWithAI` command** — now opens the main Workspai panel AI modal with context pre-filled, instead of a separate HTML tab
- **`rapidkit.workspaceBrain` command** — now focuses the main Workspai panel instead of opening a separate HTML tab
- **Doctor Fix with AI** — issue text passed directly as `prefillQuestion` to the AI modal (no scratch-doc workaround)

#### Fixed

- `AIModal.tsx` — added `context` to `useEffect` dependency array so `prefillQuestion` is correctly applied when modal is already mounted

---

## v0.16.0 (March 22, 2026)

### 🩺 Workspace Health Sidebar + Module Install Modal

**Summary:** Introduces the **Doctor Evidence Viewer** — a persistent sidebar panel that reads `.rapidkit/reports/doctor-last-run.json` and renders an inline health dashboard (score bar, system tool status, per-project issues) without any extra CLI call. Also wires the **Available Modules** sidebar item click directly into the same install confirmation modal used on the welcome page, so users see exactly what will be installed and where before confirming.

#### Added

- 🩺 **`WORKSPACE HEALTH` sidebar panel** (`DoctorEvidenceProvider`)
  - Reads `.rapidkit/reports/doctor-last-run.json` from the active workspace — zero CLI overhead
  - **Summary row:** health score bar (e.g. `70%  ███████░░░`) with `✅ passed  ⚠️ warnings  ❌ errors` counts
  - **Timestamp row:** `Last checked: Xm ago` with `(cached scan)` badge when CLI reused cache
  - **System Tools** (collapsible): per-tool status row — `✅ Python`, `⚠️ pipx`, `❌ ...` with message detail
  - **Projects** (collapsible): each project with health icon; unhealthy projects expand to show individual issues
  - **No-data state:** single click-to-run item (`No health data — run doctor to scan`)
  - **No-workspace state:** placeholder until workspace is selected
  - Three `view/title` toolbar icon buttons:
    - `$(run)` **Re-run Doctor** — opens terminal at workspace CWD, runs `npx rapidkit doctor workspace`
    - `$(wrench)` **Auto-fix Issues** — opens terminal, runs `npx rapidkit doctor workspace --fix`
    - `$(refresh)` **Refresh** — re-reads evidence file from disk immediately
  - **File watcher:** auto-refreshes the panel the moment the CLI writes new evidence (no manual refresh needed)
  - **Live workspace sync:** uses a live getter `() => workspaceExplorer.getSelectedWorkspace()` so the correct workspace is always used, regardless of initialization timing
  - **`onDidChangeTreeData` subscription:** workspace switch immediately triggers a panel reload

- 📦 **Module install modal from `AVAILABLE MODULES` sidebar**
  - New command `rapidkit.showModuleInstallModal`
  - Clicking any installable module in the sidebar now opens the **`InstallModuleModal`** — the same confirmation modal used by welcome page module cards
  - Modal shows: module name, version, description, category tags, installation target (workspace name + path), and exact CLI command (`npx rapidkit add module <slug>`)
  - User must explicitly click **Install Module** to proceed — no silent execution
  - Module data is normalized with `display_name` field to match the webview `ModuleData` interface

#### Changed

- 🔄 **Workspace-switch health refresh** now hooks directly into `workspaceExplorer.onDidChangeTreeData` — fires immediately after `selectedWorkspace` is updated, before any command event chain
- 🧩 **`WelcomePanel`** gains two new static methods:
  - `setExtensionContext(context)` — stores context so sidebar-triggered flows can open the panel without passing context through the call chain
  - `showModuleInstallModal(moduleData)` — opens the panel (if needed) and posts `openModuleInstallModal` to the React webview
- 🪟 **`App.tsx`** handles new `openModuleInstallModal` message — sets `selectedModule` and opens `showInstallModal`, identical to the welcome page card click flow

#### Fixed

- ⏱️ **Workspace Health not showing on reload** — fixed initial workspace path not being passed to the provider because `workspaceSelected` event only fires when workspace *changes*, not on first load. Now explicitly seeded after `workspaceExplorer.refresh()` completes.
- 🗂️ **Stale health data after workspace switch** — fixed by always re-reading evidence from disk in `getChildren` instead of relying on in-memory cache

### 🧪 Contract Regression Log (v0.16.0)

| Area | Expected Contract | Status | Notes |
|------|-------------------|--------|-------|
| doctor workspace | `npx rapidkit doctor workspace` | ✅ | Rerun button uses terminal at workspace CWD |
| doctor fix | `npx rapidkit doctor workspace --fix` | ✅ | Auto-fix button aligned |
| add module | `npx rapidkit add module <slug>` | ✅ | Shown in modal before execution |
| evidence file path | `<workspace>/.rapidkit/reports/doctor-last-run.json` | ✅ | Provider reads this exact path |


## 📋 Version History

| Version | Release Date | Highlights |
|---------|--------------|-----------|
| [v0.19.1](releases/RELEASE_NOTES_v0.19.1.md) | Apr 19, 2026 | ✦ toolchain reliability, 🐹 Go context clarity, 🧭 Workspai positioning sync |
| [v0.18.0](releases/RELEASE_NOTES_v0.18.0.md) | Apr 17, 2026 | ✦ AI stability hardening, richer context extraction, stronger prompt safety |
| [v0.17.1](releases/RELEASE_NOTES_v0.17.1.md) | Apr 17, 2026 | ⚡ Instant sidebar render — two-phase async loading for WORKSPACES panel |
| [v0.17.0](releases/RELEASE_NOTES_v0.17.0.md) | Apr 16, 2026 | ✦ AI Assistant, Doctor Fix with AI, Code Actions, minimizable modal |
| [v0.15.0](releases/RELEASE_NOTES_v0.15.0.md) | Feb 27, 2026 | 🚀 platform-safe command layer, 🪟 tool-aware workspace modal, ⚡ workspace list performance, 🩺 doctor path clarity |
| [v0.14.0](releases/RELEASE_NOTES_v0.14.0.md) | Feb 25, 2026 | 🎯 Workspace-vs-project correctness, 👁️ persisted setup toggle, 🌐 example link/clone fixes, 🏷️ profile tags |
| [v0.13.0](releases/RELEASE_NOTES_v0.13.0.md) | Feb 21, 2026 | 🐹 Go framework support, 🪟 Workspace modal routing, 🔧 @latest fix, 🚫 Modules disabled for Go |
| [v0.12.0](releases/RELEASE_NOTES_v0.12.0.md) | Feb 15, 2026 | 🪟 Module details modal, 🧭 workspace-first CLI resolution, 🔄 post-install refresh |
| [v0.11.0](releases/RELEASE_NOTES_v0.11.0.md) | Feb 14, 2026 | 🌐 Dynamic Examples, 🎨 Kit Selection, 📦 Workspace Export/Import |
| [v0.10.0](releases/RELEASE_NOTES_v0.10.0.md) | Feb 12, 2026 | 🚀 Project Actions, 🎯 Smart Browser, 📡 Port Detection |
| [v0.9.0](releases/RELEASE_NOTES_v0.9.0.md) | Feb 10, 2026 | 🎭 Modal system, ⚡ Smart caching, 📱 Responsive design |
| [v0.8.0](releases/RELEASE_NOTES_v0.8.0.md) | Feb 9, 2026 | 🎨 Workspace cards redesign, Dynamic version display, Project statistics |
| [v0.7.0](releases/RELEASE_NOTES_v0.7.0.md) | Feb 6, 2026 | 🩺 Workspace health check, Setup status panel, Diagnostics integration |
| [v0.6.1](releases/RELEASE_NOTES_v0.6.1.md) | Feb 3, 2026 | 🛠️ Fixes & polish: setup stability, module copy commands, detection improvements |
| [v0.6.0](releases/RELEASE_NOTES_v0.6.0.md) | Feb 3, 2026 | 🎯 Module Browser, Setup Wizard, Package Manager Selection |
| [v0.5.2](releases/RELEASE_NOTES_v0.5.2.md) | Feb 2, 2026 | 🔧 NPM caching fix, Standalone mode, Recent workspaces |
| [v0.5.1](releases/RELEASE_NOTES_v0.5.1.md) | Feb 2, 2026 | 📝 Documentation translation, Consistency improvements |
| [v0.5.0](releases/RELEASE_NOTES_v0.5.0.md) | Feb 1, 2026 | 🐍 Python Core bridge, Workspace registry integration |
| [v0.4.7](releases/RELEASE_NOTES_v0.4.7.md) | Jan 23, 2026 | 🐛 Bug fixes, Dependency updates, Security patches |
| [v0.4.6](releases/RELEASE_NOTES_v0.4.6.md) | Jan 1, 2026 | 🎯 Poetry smart detection, Update notifications |
| [v0.4.5](releases/RELEASE_NOTES_v0.4.5.md) | Dec 23, 2025 | ⚡ Project quick actions, No workspace switching |
| [v0.4.4](releases/RELEASE_NOTES_v0.4.4.md) | Dec 22, 2025 | 🩺 Doctor npm check, Dynamic versions |
| [v0.4.3](releases/RELEASE_NOTES_v0.4.3.md) | Dec 12, 2025 | 📚 Module explorer, UI enhancements |
| [v0.4.2](releases/RELEASE_NOTES_v0.4.2.md) | Dec 5, 2025 | 📝 Logging commands, Marketplace improvements |
| [v0.4.1](releases/RELEASE_NOTES_v0.4.1.md) | Dec 4, 2025 | 📖 Documentation update, README rewrite |
| [v0.4.0](releases/RELEASE_NOTES_v0.4.0.md) | Dec 3, 2025 | 🎯 Smart location detection, npm migration |
| [v0.3.1](releases/RELEASE_NOTES_v0.3.1.md) | Dec 3, 2025 | 🐛 Bug fixes |
| [v0.3.0](releases/RELEASE_NOTES_v0.3.0.md) | Dec 2, 2025 | ✨ New features |
| [v0.1.3](releases/RELEASE_NOTES_v0.1.3.md) | Nov 2025 | 🔧 Improvements |
| [v0.1.2](releases/RELEASE_NOTES_v0.1.2.md) | Nov 2025 | 🐛 Bug fixes |
| [v0.1.1](releases/RELEASE_NOTES_v0.1.1.md) | Nov 2025 | ✏️ Minor updates |
| [v0.1.0](releases/RELEASE_NOTES_v0.1.0.md) | Nov 2025 | 🎉 Initial release |

---

## Links

- 📦 [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=rapidkit.rapidkit-vscode)
- 🐙 [GitHub Repository](https://github.com/getrapidkit/rapidkit-vscode)
- 📚 [Documentation](https://www.workspai.com/)
- 🚀 [npm Package](https://www.npmjs.com/package/rapidkit)
