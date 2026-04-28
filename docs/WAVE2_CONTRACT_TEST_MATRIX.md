# Wave 2 Contract And Test Matrix

Purpose: define the first planned payload contracts and the minimum test coverage required before the Wave 2 slice can be called stable.

## Planned Contract Set

### 1. systemGraphSnapshot

Purpose:
- Carry the minimal live graph needed for impact reasoning in Incident Studio.

Minimum fields:
- requestId
- workspacePath
- projectPath
- graphVersion
- nodes[] with id, type, label, filePath, confidence
- edges[] with sourceId, targetId, relation
- summary with nodeCount, edgeCount, supportedTopology

Primary producer:
- F15 graph indexer

Primary consumer:
- Incident Studio host state and architecture lens surface

### 2. impactAssessment

Purpose:
- Explain likely blast radius before risky action.

Minimum fields:
- requestId
- source: graph, doctor, runtime, selection
- confidence
- riskLevel
- affectedFiles[]
- affectedModules[]
- affectedTests[]
- likelyFailureMode
- rationale[]
- verifyChecklist[]
- blockMutationWhenScopeUnknown

Primary producer:
- C11 blast-radius scorer

Primary consumer:
- A08 architecture lens card and action gating logic

### 3. predictiveWarning

Purpose:
- Present one pre-failure warning in Incident Studio.

Minimum fields:
- requestId
- warningId
- confidenceBand
- predictedFailure
- affectedScopeSummary
- nextSafeAction
- verifyChecklist[]
- telemetrySeed with predictionKey and evidenceSources

Primary producer:
- B08 predictive guidance layer

Primary consumer:
- Incident Studio focus surface and telemetry tracker

### 4. releaseGateEvidence

Purpose:
- Summarize why a risky recommendation is allowed, downgraded, or blocked.

Minimum fields:
- requestId
- scopeKnown
- verifyPathPresent
- rollbackPathPresent
- confidenceSufficient
- blockedReasons[]

Primary producer:
- policy/gate bridge at recommendation time

Primary consumer:
- UI badges, analytics, and release-stop evidence

## Test Matrix

| Contract | Unit Coverage | Contract Coverage | Flow/E2E Coverage | Gate Requirement |
| --- | --- | --- | --- | --- |
| systemGraphSnapshot | graph extraction rules, node dedupe, incremental refresh | normalize and sanitize payload shape | supported fixture workspace opens with stable graph | missing or malformed graph blocks Wave 2 gate |
| impactAssessment | blast-radius scoring, confidence downgrade, affected test selection | payload shape and unknown-scope fallback | Diagnose -> impact card -> safe next action | unknown scope must block risky mutation |
| predictiveWarning | confidence band selection, evidence ranking, early verify generation | payload shape and redaction behavior | impact card -> predictive warning -> verify checklist | no predictive claim without telemetry wiring |
| releaseGateEvidence | policy flags, blocked reason generation | payload shape and default false-safe behavior | risky action downgraded or blocked in studio flow | no stable claim without scope/verify/rollback evidence |

## Initial Test File Plan

Extend existing tests first:
- src/test/incidentStudioPayload.test.ts
- src/test/incidentStudioFlowE2E.test.ts
- src/test/incidentStudioTelemetry.test.ts

Add focused files as the slice grows:
- src/test/incidentStudioArchitectureImpact.test.ts
- src/test/incidentStudioPredictiveWarning.test.ts
- src/test/incidentStudioSystemGraph.test.ts

## Release Gate Expectations

- New payload contracts must be normalized in one shared payload module.
- Unknown scope must resolve to downgrade-or-block, never silent optimistic mutation.
- Every predictive recommendation must carry verifyChecklist or be downgraded.
- Telemetry must distinguish shown, accepted, ignored, verified, and falsified predictions.
- Wave 2 gate stays red until docs, tests, and workflow automation all exist together.