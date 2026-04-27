#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

function parseArgs(argv) {
  const options = {
    skipKpi: false,
    marker: process.env.WORKSPAI_GATE_MARKER || process.env.WORKSPAI_GATE_MARKER_PATH || '',
    verifyPhaseReachMin: 80,
    bridgeRouteCompletionMin: 95,
    allowOverride: false,
    overrideOwner: process.env.WORKSPAI_GATE_OVERRIDE_OWNER || '',
    overrideReason: process.env.WORKSPAI_GATE_OVERRIDE_REASON || '',
    overrideTicket: process.env.WORKSPAI_GATE_OVERRIDE_TICKET || '',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--skip-kpi') {
      options.skipKpi = true;
      continue;
    }

    if (arg === '--marker') {
      options.marker = argv[i + 1] || '';
      i += 1;
      continue;
    }

    if (arg === '--verify-min') {
      const value = Number(argv[i + 1]);
      if (Number.isFinite(value)) {
        options.verifyPhaseReachMin = value;
      }
      i += 1;
      continue;
    }

    if (arg === '--bridge-min') {
      const value = Number(argv[i + 1]);
      if (Number.isFinite(value)) {
        options.bridgeRouteCompletionMin = value;
      }
      i += 1;
      continue;
    }

    if (arg === '--allow-override') {
      options.allowOverride = true;
      continue;
    }

    if (arg === '--override-owner') {
      options.overrideOwner = argv[i + 1] || '';
      i += 1;
      continue;
    }

    if (arg === '--override-reason') {
      options.overrideReason = argv[i + 1] || '';
      i += 1;
      continue;
    }

    if (arg === '--override-ticket') {
      options.overrideTicket = argv[i + 1] || '';
      i += 1;
      continue;
    }
  }

  return options;
}

function runContractAndParityChecks() {
  const command = [
    'npx vitest run',
    'src/test/driftGuard.test.ts',
    'src/test/incidentStudioPayload.test.ts',
    'src/test/incidentStudioPromptPolicy.test.ts',
    'src/test/workspaceUsageTracker.test.ts',
  ].join(' ');

  execSync(command, { stdio: 'inherit' });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function toIsoNow() {
  return new Date().toISOString();
}

function appendOverrideLog(record) {
  const targetPath = path.resolve(
    process.env.WORKSPAI_GATE_OVERRIDE_LOG ||
      path.join(process.cwd(), '.rapidkit', 'reports', 'release-gate-overrides.jsonl')
  );

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.appendFileSync(targetPath, `${JSON.stringify(record)}\n`, 'utf-8');

  return targetPath;
}

function validateOverrideInput(options) {
  if (!options.allowOverride) {
    return null;
  }

  const owner = String(options.overrideOwner || '').trim();
  const reason = String(options.overrideReason || '').trim();
  const ticket = String(options.overrideTicket || '').trim();

  if (!owner || !reason || !ticket) {
    return {
      ok: false,
      message:
        'Override requires --override-owner, --override-reason, and --override-ticket when --allow-override is used.',
    };
  }

  if (reason.length < 10) {
    return {
      ok: false,
      message: 'Override reason must be at least 10 characters.',
    };
  }

  return {
    ok: true,
    owner,
    reason,
    ticket,
  };
}

function buildKpiGateStatus(markerPath, thresholds) {
  const marker = readJson(markerPath);
  const telemetry = marker?.metadata?.custom?.workspaiTelemetry;
  const recentEvents = Array.isArray(telemetry?.recentEvents) ? telemetry.recentEvents : [];

  let loopStarted = 0;
  let nextActionClicked = 0;
  let actionExecuted = 0;
  let verifyPassed = 0;
  let verifyFailed = 0;

  for (const entry of recentEvents) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }

    const command = typeof entry.command === 'string' ? entry.command : '';
    if (command === 'workspai.studio.loop_started') {
      loopStarted += 1;
    } else if (command === 'workspai.studio.next_action_clicked') {
      nextActionClicked += 1;
    } else if (command === 'workspai.studio.action_executed') {
      actionExecuted += 1;
    } else if (command === 'workspai.studio.verify_passed') {
      verifyPassed += 1;
    } else if (command === 'workspai.studio.verify_failed') {
      verifyFailed += 1;
    }
  }

  const verifyOutcomes = verifyPassed + verifyFailed;
  const verifyPhaseReach =
    actionExecuted > 0 ? Number(((verifyOutcomes / actionExecuted) * 100).toFixed(2)) : null;
  const bridgeRouteCompletionRate =
    loopStarted > 0 ? Number(((actionExecuted / loopStarted) * 100).toFixed(2)) : null;

  const gates = {
    verifyPhaseReachPass:
      verifyPhaseReach !== null && verifyPhaseReach >= thresholds.verifyPhaseReachMin,
    bridgeRouteCompletionPass:
      bridgeRouteCompletionRate !== null &&
      bridgeRouteCompletionRate >= thresholds.bridgeRouteCompletionMin,
    telemetryEvidencePass: loopStarted > 0,
  };

  return {
    markerPath,
    evaluatedAt: toIsoNow(),
    thresholds,
    metrics: {
      loopStarted,
      nextActionClicked,
      actionExecuted,
      verifyOutcomes,
      verifyPassed,
      verifyFailed,
      verifyPhaseReach,
      bridgeRouteCompletionRate,
    },
    gates: {
      ...gates,
      overallPass: gates.verifyPhaseReachPass && gates.bridgeRouteCompletionPass && gates.telemetryEvidencePass,
    },
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  console.log('[release-stop-gate] Running contract/parity checks...');
  runContractAndParityChecks();

  if (options.skipKpi) {
    console.log('[release-stop-gate] KPI check skipped by --skip-kpi.');
    return;
  }

  if (!options.marker) {
    console.error(
      '[release-stop-gate] KPI gate requires --marker <path> or WORKSPAI_GATE_MARKER_PATH env var.'
    );
    process.exit(1);
  }

  const markerPath = path.resolve(options.marker);
  if (!fs.existsSync(markerPath)) {
    console.error(`[release-stop-gate] Marker not found: ${markerPath}`);
    process.exit(1);
  }

  const gateStatus = buildKpiGateStatus(markerPath, {
    verifyPhaseReachMin: options.verifyPhaseReachMin,
    bridgeRouteCompletionMin: options.bridgeRouteCompletionMin,
  });

  console.log('[release-stop-gate] KPI gate result:');
  console.log(JSON.stringify(gateStatus, null, 2));

  if (!gateStatus.gates.overallPass) {
    const override = validateOverrideInput(options);
    if (override?.ok) {
      const logPath = appendOverrideLog({
        kind: 'release_gate_override',
        at: toIsoNow(),
        owner: override.owner,
        ticket: override.ticket,
        reason: override.reason,
        gateStatus,
      });

      console.warn(
        `[release-stop-gate] KPI hard-gate override accepted for ticket ${override.ticket} by ${override.owner}.`
      );
      console.warn(`[release-stop-gate] Override logged at: ${logPath}`);
      return;
    }

    if (override && !override.ok) {
      console.error(`[release-stop-gate] ${override.message}`);
    }
    console.error('[release-stop-gate] Release blocked: KPI hard-gate failed.');
    process.exit(1);
  }

  console.log('[release-stop-gate] All release stop conditions passed.');
}

main();
