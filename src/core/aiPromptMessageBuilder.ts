import type { AIModalContext, AIConversationMode, ScannedProjectContext } from './aiService';

/**
 * Build the user-facing message for an AI modal query.
 */
export function buildAIModalUserMessage(
  mode: AIConversationMode,
  question: string,
  ctx: AIModalContext,
  scanned?: ScannedProjectContext
): string {
  const kitLabel = scanned?.kit ?? ctx.framework ?? ctx.type;
  const installedList = scanned?.installedModules.map((m) => m.slug).join(', ');
  const contextPacket = scanned
    ? {
        project_type: scanned.kit,
        python_version: scanned.pythonVersion,
        rapidkit_cli_version: scanned.rapidkitCliVersion,
        rapidkit_core_version: scanned.rapidkitCoreVersion,
        installed_modules: scanned.installedModules.map((m) => m.slug),
        workspace_health: scanned.workspaceHealth,
        runtime: scanned.runtime,
        engine: scanned.engine,
      }
    : null;

  const ctxHeader = [
    `[${ctx.type.toUpperCase()}] ${ctx.name}`,
    kitLabel && `Kit: ${kitLabel}`,
    ctx.path && `Path: ${ctx.path}`,
    scanned?.pythonVersion && `python_version: ${scanned.pythonVersion}`,
    scanned?.rapidkitCliVersion && `rapidkit_cli_version: ${scanned.rapidkitCliVersion}`,
    scanned?.rapidkitCoreVersion && `rapidkit_core_version: ${scanned.rapidkitCoreVersion}`,
    scanned?.workspaceHealth &&
      `workspace_health: ${JSON.stringify({
        total: scanned.workspaceHealth.total,
        passed: scanned.workspaceHealth.passed,
        warnings: scanned.workspaceHealth.warnings,
        errors: scanned.workspaceHealth.errors,
        generated_at: scanned.workspaceHealth.generatedAt,
      })}`,
    contextPacket && `context_packet: ${JSON.stringify(contextPacket)}`,
    installedList && `Installed modules: ${installedList}`,
  ]
    .filter(Boolean)
    .join('\n');

  if (mode === 'debug') {
    return `${ctxHeader}

Error / Issue to debug:
${question}

Structure your response as:
## Root Cause
(Precise diagnosis, referencing actual Workspai file paths)

## Fix
\`\`\`  ← include exact code matching this project's kit and installed modules
…
\`\`\`
Step-by-step instructions.

## Prevention
(Workspai patterns or module configurations to prevent recurrence)`;
  }

  return `${ctxHeader}

Question: ${question}

Answer precisely using the project's actual kit (${kitLabel}), installed modules, and Workspai coding standards. Include working code examples.`;
}
