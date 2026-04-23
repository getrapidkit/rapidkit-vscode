# Release Notes — v0.21.0 (April 23, 2026)

## ✦ AI Action Expansion + Telemetry Insights + Runtime Hardening

### Summary

This release expands the free AI action surface across command palette, sidebar inline actions, and the quick-actions webview; introduces workspace telemetry summaries and onboarding experiment analytics; and hardens runtime reliability with safer doctor metadata fetches, bounded port scanning, and startup path-race fixes.

---

### Added

- **Expanded AI action command suite**
  New palette and menu-level AI flows are now registered and discoverable:
  - `workspai.aiQuickActions`
  - `workspai.aiOrchestrate`
  - `workspai.aiFixPreviewLite`
  - `workspai.aiChangeImpactLite`
  - `workspai.aiTerminalBridge`
  - `workspai.aiWorkspaceMemoryWizard`
  - `workspai.aiRecipePacks`

- **Telemetry + onboarding analytics commands**
  New workspace-scoped observability commands:
  - `workspai.showTelemetrySummary`
  - `workspai.resetTelemetry`
  - `workspai.showAIFeatureOnboarding`
  - `workspai.showOnboardingExperimentStats`

- **AI onboarding tour hooks**
  Added in-product onboarding versioning/variant handling and follow-up interaction tracking for AI feature discovery.

---

### Changed

- **Action surface consistency across UI layers**
  WORKSPACES / PROJECTS inline action ordering and Actions webview quick tools are now aligned around the same AI-first flows and telemetry shortcuts.

- **Telemetry instrumentation depth increased**
  `@workspai` chat participant and AI modal now emit structured telemetry outcomes (`success`, `empty`, `prepare-error`, `cancelled`, `error`) with bounded metadata.

- **Project context panel gains telemetry insight flows**
  Added JSON telemetry summary views, onboarding experiment stats views, and copy/open/reset helper actions.

---

### Fixed

- **Doctor metadata fetch hardening**
  Added HTTP timeout, redirect limit, and same-host redirect enforcement to reduce hangs and unsafe redirect behavior.

- **Project dev server startup resilience**
  Replaced unbounded recursive port probing with bounded scan attempts and a safe fallback warning path.

- **Workspace registry initialization race**
  Startup path creation now uses synchronous directory ensure to avoid first-run timing issues.

---

### Validation Snapshot

- Type check: pass
- Lint: pass
- Format check: pass
- Tests: 66/66 pass
- VSIX package: pass
