export class ProjectSelectionSequence {
  private currentVersion = 0;

  begin(): number {
    this.currentVersion += 1;
    return this.currentVersion;
  }

  isCurrent(version: number): boolean {
    return version === this.currentVersion;
  }
}
