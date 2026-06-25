import { readFileSync } from 'fs';
import { join } from 'path';

// Server-only helper. Reads the two Markdown docs at request time and
// caches in module-level memory. Small files (<10K each), safe to keep
// in memory across requests.

let cachedSystemPrompt: string | null = null;
let cachedEscalationRules: string | null = null;

function readDoc(relativePath: string): string {
  // process.cwd() is the project root in Next.js server contexts.
  // turbopackIgnore tells the bundler not to try to statically analyse
  // this dynamic-ish path — the file is added to the deploy bundle via
  // outputFileTracingIncludes in next.config.ts.
  const fullPath = join(/* turbopackIgnore: true */ process.cwd(), relativePath);
  return readFileSync(fullPath, 'utf-8');
}

export function getSystemPrompt(): string {
  if (cachedSystemPrompt == null) {
    cachedSystemPrompt = readDoc('docs/p3-system-prompt.md');
  }
  return cachedSystemPrompt;
}

export function getEscalationRulesDoc(): string {
  if (cachedEscalationRules == null) {
    cachedEscalationRules = readDoc('docs/p3-escalation-rules.md');
  }
  return cachedEscalationRules;
}

// For tests / hot-reload during dev.
export function clearDocCache(): void {
  cachedSystemPrompt = null;
  cachedEscalationRules = null;
}
