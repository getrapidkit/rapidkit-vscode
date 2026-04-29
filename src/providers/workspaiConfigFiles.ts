export function isWorkspaiConfigurationFile(fileName: string): boolean {
  return fileName.endsWith('.rapidkitrc.json') || fileName.endsWith('rapidkit.json');
}

export function buildMissingFrameworkDocumentText(text: string): string {
  const trimmed = text.trim();

  if (!trimmed || trimmed === '{}') {
    return '{\n  "framework": ""\n}\n';
  }

  const firstBraceIndex = text.indexOf('{');
  if (firstBraceIndex === -1) {
    return text;
  }

  const afterBraceIndex = firstBraceIndex + 1;
  const rest = text.slice(afterBraceIndex);
  const trimmedRest = rest.trim();
  const needsComma = trimmedRest.length > 0 && !trimmedRest.startsWith('}');
  const leadingNewline = '\n';

  return `${text.slice(0, afterBraceIndex)}${leadingNewline}  "framework": ""${needsComma ? ',' : ''}${rest}`;
}
