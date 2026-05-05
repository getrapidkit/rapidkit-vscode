# Release Notes — v0.23.0 (May 5, 2026)

## ✦ Enterprise Import + Incident Studio Release Readiness Maturity

### Summary

This release consolidates the local train ahead of `origin/main` plus the current working-tree stabilization set. It ships enterprise import flow hardening, universal architecture/incident foundations, release-readiness governance maturity, and KPI availability upgrades.

---

### Added

- **Enterprise import and BYOP readiness surfaces**
  Added stronger import flow integration across command handlers, extension activation, and workspace/project orchestration.

- **Release outcome validation loop (W07/W08)**
  Added artifact-linked GO/NO-GO validation telemetry, command entry for recording validated outcomes, and KPI availability plumbing.

- **Nightly Incident Studio soak workflow**
  Added a dedicated soak workflow to continuously exercise Incident Studio stability paths outside the standard release gate.

- **Contract runtime and stress coverage expansion**
  Added contract runtime implementation and tests plus broader wave3 stress/release-stop regression suites.

---

### Changed

- **Wave 3 release-stop gate evidence depth**
  Expanded gate output with release-readiness validation metrics and clearer rollout/evidence reporting.

- **Incident Studio host/webview parity**
  Synced payload contracts, prompt policy behavior, telemetry typing, and release-readiness action handling across extension and webview layers.

- **Core command/import/workspace flow consistency**
  Refined command routing and workspace operations to reduce cross-project drift and improve deterministic enterprise behavior.

---

### Fixed

- **Claim-safe shipped-scope wording parity**
  Aligned release and product-facing wording with shipped behavior and verify-first constraints.

- **Telemetry typing and KPI regression mismatches**
  Resolved time-window/type mismatches and stabilized targeted KPI/release-gate regressions.

---

### Validation Snapshot

- `npm run test -- src/test/workspaceUsageTracker.test.ts src/test/releaseStopGateManifest.test.ts` → pass
- `npm run release:stop-gate:wave3` → pass