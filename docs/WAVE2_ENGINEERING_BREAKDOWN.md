# Wave 2 Engineering Breakdown

Purpose: turn the first Wave 2 moat slice into delivery work that fits the current Incident Studio architecture.

## Target Slice

Slice: Architecture-Aware Predictive Incident Slice

North-star behavior:
- Incident Studio shows architecture impact before risky action.
- The user sees one predictive warning with confidence, affected scope, and a verify checklist.
- No risky mutation is recommended when scope or verify evidence is missing.

## Milestone 1: F15 System Graph Baseline

Goal:
- Build the smallest graph layer that can support impact reasoning on one supported backend topology.

Engineering tasks:
- Define graph node model for route, controller, service, model, datastore, and test target.
- Build extraction pipeline from workspace context and supported-kit fixtures.
- Add incremental graph refresh when relevant files change.
- Add query helpers for impacted nodes and candidate test surfaces.

Definition of done:
- One supported workspace family produces stable graph snapshots.
- Graph extraction is fixture-backed and deterministic.
- Incremental updates do not duplicate or orphan nodes.

## Milestone 2: A08/C11 Architecture Lens And Blast Radius

Goal:
- Make architecture impact visible in the existing Incident Studio loop.

Engineering tasks:
- Define host-to-webview payload for architecture impact assessment.
- Score blast radius using graph edges plus doctor/runtime evidence.
- Render a compact architecture lens card inside Incident Studio.
- Show affected modules, likely failure mode, confidence, and candidate tests.

Definition of done:
- Impact card appears before risky action recommendations.
- Unknown or low-confidence scope downgrades the recommendation instead of overstating certainty.
- Flow tests prove Diagnose -> Impact -> Plan remains stable.

## Milestone 3: B08 Predictive Guidance Layer

Goal:
- Move from reactive diagnosis to pre-failure guidance.

Engineering tasks:
- Define predictive warning payload derived from impact assessment and telemetry signals.
- Add confidence bands and early verify checklist generation.
- Emit telemetry for shown, accepted, ignored, verified, and falsified predictions.
- Route low-confidence predictions to clarification instead of forceful advice.

Definition of done:
- Prediction cards are visible in Incident Studio for supported scenarios.
- The product shows one safe next step and one verify path.
- KPI events exist for prevented incident rate, precision, and false alarms.

## Integration Constraints

- Land all slice UI inside Incident Studio; do not create a disconnected panel.
- Reuse payload normalization patterns already used in incidentStudioPayload.
- Reuse verify-first policy and hard-gate semantics already present in tracker/gate infrastructure.
- Prefer fixture-backed deterministic tests over ad hoc runtime-only validation.

## Recommended Delivery Order

1. F15 graph model and fixtures
2. graph query API for impacted scope and candidate tests
3. C11 blast-radius scoring rules
4. A08 impact card UI in Incident Studio
5. B08 predictive warning payload and presentation
6. telemetry + release-gate wiring
