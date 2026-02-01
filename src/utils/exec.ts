export type ExecaResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

export type RunOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeout?: number;
  stdio?: unknown;
  reject?: boolean;
} & Record<string, unknown>;

export async function run(
  cmd: string,
  args: string[],
  options?: RunOptions
): Promise<ExecaResult & Record<string, unknown>> {
  const { execa } = (await import('execa')) as any;
  return (await (execa as any)(cmd, args, {
    reject: false,
    stdio: 'pipe',
    ...options,
  })) as any;
}
