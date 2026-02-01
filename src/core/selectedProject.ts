/**
 * Last selected project path in the RapidKit Projects panel.
 * Set when user selects a project in the tree; used by Add Module when clicking a module in the sidebar.
 */
let selectedProjectPath: string | undefined;

export function getSelectedProjectPath(): string | undefined {
  return selectedProjectPath;
}

export function setSelectedProjectPath(path: string | undefined): void {
  selectedProjectPath = path;
}
