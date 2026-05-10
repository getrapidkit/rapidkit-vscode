# Workspai v0.27.1 Release Notes

Release date: May 10, 2026
Version: 0.27.0 -> 0.27.1
Release posture: stabilization-only

## Executive Summary

v0.27.1 is a precision patch focused on workspace operations maturity, project-scoped doctor workflows, and incident telemetry reliability.

This release adds stage-based workspace run commands, introduces an AI Workspace Command Center, wires project doctor actions end-to-end in Incident Studio, and hardens path-safety in report surfaces.

## What Is New

### 1) Workspace Run command suite

New command surface for explicit stage execution:
- `workspai.workspaceRunStage`
- `workspai.workspaceRunInit`
- `workspai.workspaceRunTest`
- `workspai.workspaceRunBuild`
- `workspai.workspaceRunStart`

These commands support guided flag selection and route to canonical CLI stage invocations (`npx rapidkit workspace run <stage>`).

### 2) AI Workspace Command Center

New command:
- `workspai.aiWorkspaceCommandCenter`

Provides categorized workspace operations from one AI-guided control hub:
- Workspace Navigation
- Workspace Health
- Workspace Governance

### 3) Project Health Check (Doctor)

New command:
- `workspai.projectDoctor`

Supports check/fix selection and project-scoped execution:
- `npx rapidkit doctor project`
- `npx rapidkit doctor project --fix`

Incident Studio doctor actions now route by selected scope:
- Project selected: project doctor check/fix
- Workspace scope: workspace doctor check/fix

### 4) Doctor treatment telemetry and UI hardening

Incident telemetry now carries `doctorTreatmentStatus` including:
- trend
- score and issue deltas
- scope provenance
- traceability coverage
- probe failure/warning counters

Incident Studio renders these as treatment timeline and scope-aware health cues.

## Changed

- `workspai.workspaceInit` now maps to `workspace run init` semantics for consistency with fleet-stage execution.
- Workspace target resolution is normalized across command payloads and sidebar selection contexts.
- Incident Studio surfaces project doctor report access and scope-aware labels for usage and KPI sections.

## Fixed

- Sanitized report and compliance path output to avoid leaking full absolute paths.
- Corrected stale command references from `npx workspai.doctor ...` to canonical `npx rapidkit doctor ...` forms.
- Updated drift and telemetry tests to match current command and doctor-treatment contracts.
