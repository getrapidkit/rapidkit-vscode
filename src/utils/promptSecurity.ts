const SECRET_ASSIGNMENT_PATTERN =
  /\b(api[_-]?key|access[_-]?token|refresh[_-]?token|token|password|passwd|secret|client[_-]?secret|authorization)\b\s*[:=]\s*(['"]?)([^\s'",;`]+)\2/gi;
const AUTHORIZATION_ASSIGNMENT_PATTERN = /\bauthorization\b\s*[:=]\s*[^\n\r]+/gi;
const BEARER_PATTERN = /(?:^|\s)Bearer\s+[A-Za-z0-9._~+/-]+=*/gi;
const BASIC_AUTH_PATTERN = /\bBasic\s+[A-Za-z0-9+/=]+/gi;
const TOKEN_LITERAL_PATTERN =
  /\b(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{16,}|xox[baprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z\-_]{20,})\b/g;

export function redactSensitiveLiterals(input: string): string {
  return input
    .replace(AUTHORIZATION_ASSIGNMENT_PATTERN, 'authorization: [REDACTED]')
    .replace(SECRET_ASSIGNMENT_PATTERN, (full, key: string, quote: string) => {
      const delimiter = full.includes(':') ? ':' : '=';
      const wrapped = quote ? `${quote}[REDACTED]${quote}` : '[REDACTED]';
      return `${key}${delimiter}${wrapped}`;
    })
    .replace(BEARER_PATTERN, 'Bearer [REDACTED]')
    .replace(BASIC_AUTH_PATTERN, 'Basic [REDACTED]')
    .replace(TOKEN_LITERAL_PATTERN, '[REDACTED]');
}

export function sanitizePromptText(value: unknown, maxLength = 8000): string {
  const raw = typeof value === 'string' ? value : String(value ?? '');
  const normalized = raw.replaceAll('\0', '').trim();
  const redacted = redactSensitiveLiterals(normalized);

  if (redacted.length <= maxLength) {
    return redacted;
  }

  return `${redacted.slice(0, maxLength)}\n...[TRUNCATED]`;
}
