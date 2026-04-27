import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createDoctorTelemetryRefreshController,
  extractWorkspacePathFromDoctorReportPath,
} from '../ui/panels/doctorTelemetryRefresh';

describe('doctorTelemetryRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('extracts the workspace root from doctor report paths', () => {
    expect(
      extractWorkspacePathFromDoctorReportPath('/tmp/demo/.rapidkit/reports/doctor-last-run.json')
    ).toBe('/tmp/demo');

    expect(
      extractWorkspacePathFromDoctorReportPath('/tmp/demo/somewhere-else/report.json')
    ).toBeUndefined();
  });

  it('debounces doctor telemetry refresh and keeps the latest workspace path', async () => {
    const onRefresh = vi.fn();
    const controller = createDoctorTelemetryRefreshController({ onRefresh, delayMs: 250 });

    controller.schedule('/tmp/first/.rapidkit/reports/doctor-last-run.json');
    controller.schedule('/tmp/second/.rapidkit/reports/doctor-last-run.json');
    controller.schedule('/tmp/third/.rapidkit/reports/doctor-last-run.json');

    vi.advanceTimersByTime(249);
    expect(onRefresh).toHaveBeenCalledTimes(0);

    vi.advanceTimersByTime(1);
    await Promise.resolve();

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onRefresh).toHaveBeenCalledWith('/tmp/third');

    controller.dispose();
  });

  it('cancels a pending doctor telemetry refresh on dispose', async () => {
    const onRefresh = vi.fn();
    const controller = createDoctorTelemetryRefreshController({ onRefresh, delayMs: 250 });

    controller.schedule('/tmp/demo/.rapidkit/reports/doctor-last-run.json');
    controller.dispose();

    vi.advanceTimersByTime(300);
    await Promise.resolve();

    expect(onRefresh).not.toHaveBeenCalled();
  });
});
