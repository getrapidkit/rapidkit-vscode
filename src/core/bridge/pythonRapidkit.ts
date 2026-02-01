/**
 * Bridge to RapidKit Python core (python -m rapidkit).
 * API aligned with rapidkit-npm core-bridge for consistency.
 */
import { run } from '../../utils/exec';

export type PythonCommand = 'python3' | 'python';

/** Result shape aligned with rapidkit-npm core-bridge/pythonRapidkit */
export interface RapidkitJsonResult<T> {
  ok: boolean;
  command?: PythonCommand;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  data?: T;
}

export interface RapidkitCoreVersionPayload {
  schema_version: 1;
  version: string;
}

export interface RapidkitProjectDetectPayload {
  schema_version: 1;
  input: string;
  confidence: 'strong' | 'weak' | 'none';
  isRapidkitProject: boolean;
  projectRoot: string | null;
  engine: 'python' | 'node' | string;
  markers: Record<string, unknown>;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function runRapidkitJson<T>(
  rapidkitArgs: string[],
  opts?: { cwd?: string; timeoutMs?: number }
): Promise<RapidkitJsonResult<T>> {
  const candidates: PythonCommand[] = ['python3', 'python'];
  const args = ['-m', 'rapidkit', ...rapidkitArgs];

  for (const cmd of candidates) {
    const res = await run(cmd, args, { cwd: opts?.cwd, timeout: opts?.timeoutMs ?? 8000 });
    if (res.exitCode !== 0) {
      continue;
    }

    const raw = (res.stdout ?? '').trim();
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!isObject(parsed)) {
        return {
          ok: false,
          command: cmd,
          exitCode: res.exitCode,
          stdout: res.stdout,
          stderr: res.stderr,
        };
      }
      return {
        ok: true,
        command: cmd,
        exitCode: res.exitCode,
        stdout: res.stdout,
        stderr: res.stderr,
        data: parsed as T,
      };
    } catch {
      return {
        ok: false,
        command: cmd,
        exitCode: res.exitCode,
        stdout: res.stdout,
        stderr: res.stderr,
      };
    }
  }

  return { ok: false };
}

export async function getRapidkitCoreVersion(opts?: {
  cwd?: string;
  timeoutMs?: number;
}): Promise<RapidkitJsonResult<RapidkitCoreVersionPayload>> {
  const res = await runRapidkitJson<RapidkitCoreVersionPayload>(['--version', '--json'], opts);
  if (!res.ok || !res.data) {
    return { ...res, ok: false, data: undefined };
  }
  if (res.data.schema_version !== 1 || typeof res.data.version !== 'string') {
    return { ...res, ok: false, data: undefined };
  }
  return res;
}

export async function detectRapidkitProject(
  pathToInspect: string,
  opts?: { cwd?: string; timeoutMs?: number }
): Promise<RapidkitJsonResult<RapidkitProjectDetectPayload>> {
  const res = await runRapidkitJson<RapidkitProjectDetectPayload>(
    ['project', 'detect', '--path', pathToInspect, '--json'],
    opts
  );
  if (!res.ok || !res.data) {
    return { ...res, ok: false, data: undefined };
  }
  if (res.data.schema_version !== 1) {
    return { ...res, ok: false, data: undefined };
  }
  return res;
}
