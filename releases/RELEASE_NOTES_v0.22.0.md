# Release Notes — v0.22.0 (April 29, 2026)

## ✦ Incident Studio + Setup UX + Workspace Sharing + Graph-Aware Release Controls

### Summary

This release packages the full 37-commit train currently ahead of `origin/main`, not just one feature slice. It introduces the Incident Studio foundation, a new setup experience, workspace share bundle flows, system-graph-backed architecture reasoning, editor A08 surfaces, wave-2 release gating and rollback evidence, doctor/telemetry improvements, and a production dependency security refresh.

---

### Added

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

---

### Changed

- **AI context and prompting stack** — formalized the AI context contract/resolver, expanded project-context extraction, and aligned chat, debug, and incident flows around the same context-rich execution path.

- **UI and command surface alignment** — updated command handlers, wizards, schemas, tree views, config-file tooling, and extension activation wiring to support the new setup, sharing, incident, and graph-aware workflows.

- **Architecture evidence is now unified** — impact, predictive, release-gate, and graph signals are now presented as one coherent review path instead of scattered UI fragments.

- **Dependency lockfile security refresh** — `npm audit fix` was applied to the release line, clearing current production dependency audit findings.

---

### Fixed

- **Prompt and mutation safety**
  Hardened prompt sanitization, adversarial guards, verify-first policy enforcement, and unknown-scope blocking behavior.

- **Workspace and panel stability**
  Fixed workspace detection gaps, project switching races, webview readiness issues, sync cache invalidation, module browser sluggishness, and partial-failure normalization around Incident Studio flows.

- **Architecture review discoverability**
  Users no longer need to infer blast radius from separate UI fragments or top-of-file-only affordances.

- **Production npm audit exposure**
  Current runtime dependency audit findings are cleared for this release line.

---

### Validation Snapshot

- Type check: pass
- Lint: pass
- Build: pass
- Compile: pass
- VSIX package: pending final run on release state
- Full test suite: 182/182 pass
- Production audit (`npm audit --omit=dev`): 0 vulnerabilities
- Full audit: only dev-tooling vulnerabilities remain, blocked upstream by `@vscode/test-cli` -> `mocha` -> `serialize-javascript` and one nested `brace-expansion` path