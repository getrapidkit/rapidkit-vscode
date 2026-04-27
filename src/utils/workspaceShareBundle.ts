export interface WorkspaceShareBundleProject {
  name?: string;
  runtime?: string;
  doctor_report?: {
    health?: {
      passed?: number;
      warnings?: number;
      errors?: number;
    };
  };
}

export interface WorkspaceShareBundle {
  schema_version: string;
  generated_at?: string;
  workspace?: {
    name?: string;
    profile?: string;
  };
  summary?: {
    project_count?: number;
    doctor_evidence_included?: boolean;
  };
  projects?: WorkspaceShareBundleProject[];
}

export interface WorkspaceShareBundleDashboardSummary {
  sourceFile: string;
  workspaceName: string;
  workspaceProfile?: string;
  generatedAt?: string;
  schemaVersion: string;
  projectCount: number;
  runtimes: string[];
  doctorEvidenceIncluded: boolean;
  healthTotals: {
    passed: number;
    warnings: number;
    errors: number;
  };
}

export function parseWorkspaceShareBundle(raw: string): WorkspaceShareBundle {
  const parsed = JSON.parse(raw) as WorkspaceShareBundle;

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid share bundle: root payload must be an object.');
  }

  if (typeof parsed.schema_version !== 'string' || !parsed.schema_version.trim()) {
    throw new Error('Invalid share bundle: schema_version is required.');
  }

  if (parsed.projects && !Array.isArray(parsed.projects)) {
    throw new Error('Invalid share bundle: projects must be an array.');
  }

  return parsed;
}

export function buildWorkspaceShareBundleDashboardSummary(
  bundle: WorkspaceShareBundle,
  sourceFile: string
): WorkspaceShareBundleDashboardSummary {
  const projects = Array.isArray(bundle.projects) ? bundle.projects : [];

  const runtimes = [
    ...new Set(
      projects
        .map((project) =>
          typeof project.runtime === 'string' ? project.runtime.trim().toLowerCase() : ''
        )
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b));

  const healthTotals = projects.reduce(
    (acc, project) => {
      const health = project.doctor_report?.health;
      acc.passed += typeof health?.passed === 'number' ? health.passed : 0;
      acc.warnings += typeof health?.warnings === 'number' ? health.warnings : 0;
      acc.errors += typeof health?.errors === 'number' ? health.errors : 0;
      return acc;
    },
    { passed: 0, warnings: 0, errors: 0 }
  );

  const projectCountFromSummary =
    typeof bundle.summary?.project_count === 'number' ? bundle.summary.project_count : null;

  const projectCount = projectCountFromSummary ?? projects.length;

  return {
    sourceFile,
    workspaceName:
      typeof bundle.workspace?.name === 'string' && bundle.workspace.name.trim()
        ? bundle.workspace.name.trim()
        : 'Imported Workspace',
    workspaceProfile:
      typeof bundle.workspace?.profile === 'string' && bundle.workspace.profile.trim()
        ? bundle.workspace.profile.trim()
        : undefined,
    generatedAt:
      typeof bundle.generated_at === 'string' && bundle.generated_at.trim()
        ? bundle.generated_at.trim()
        : undefined,
    schemaVersion: bundle.schema_version,
    projectCount,
    runtimes,
    doctorEvidenceIncluded: bundle.summary?.doctor_evidence_included !== false,
    healthTotals,
  };
}
