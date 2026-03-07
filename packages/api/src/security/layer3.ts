// ── Layer 3: Lakera Guard API ──

import type { ScanResult, ScanFinding } from './layer1.js';

const LAKERA_GUARD_URL = 'https://api.lakera.ai/v2/guard';

interface LakeraResponse {
  flagged: boolean;
  categories?: Record<string, boolean>;
  payload_type?: string;
}

export const scanWithLakera = async (
  files: Array<{ name: string; content: string }>,
  apiKey: string,
): Promise<ScanResult> => {
  const findings: ScanFinding[] = [];

  // Filter out empty files, then concatenate
  const nonEmpty = files.filter((f) => f.content.trim().length > 0);
  if (nonEmpty.length === 0) {
    return { passed: true, findings: [], blocked: 0, warnings: 0 };
  }

  const concatenated = nonEmpty.map((f) => `--- ${f.name} ---\n${f.content}`).join('\n\n');
  const input = concatenated.slice(0, 10000);

  const res = await fetch(LAKERA_GUARD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input }),
  });

  if (!res.ok) {
    throw new Error(`Lakera Guard API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as LakeraResponse;

  if (data.flagged) {
    const flaggedCategories = data.categories
      ? Object.entries(data.categories)
          .filter(([, v]) => v)
          .map(([k]) => k)
      : [];

    findings.push({
      category: 'lakera_guard',
      severity: 'warn',
      patternName: 'lakera_flagged',
      match: `Lakera flagged: ${flaggedCategories.join(', ') || 'prompt_injection'}`,
      file: 'all_content',
      line: 0,
      context: data.payload_type ?? 'unknown',
    });
  }

  const blocked = 0; // Lakera never auto-blocks, only flags for review
  const warnings = findings.length;

  return {
    passed: true, // Lakera findings are always warnings, never blocks
    findings,
    blocked,
    warnings,
  };
};
