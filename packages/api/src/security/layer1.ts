// ── Layer 1: Regex Pattern Scanner ──

import { ALL_PATTERNS } from './patterns.js';

export interface ScanFinding {
  category: string;
  severity: 'block' | 'warn';
  patternName: string;
  match: string;
  file: string;
  line: number;
  context: string;
}

export interface ScanResult {
  passed: boolean;
  findings: ScanFinding[];
  blocked: number;
  warnings: number;
}

/**
 * Scan an array of files against all Layer 1 regex patterns.
 * Returns findings with line numbers, match context, and severity.
 */
export const scanContent = (files: Array<{ name: string; content: string }>): ScanResult => {
  const findings: ScanFinding[] = [];

  for (const file of files) {
    const lines = file.content.split('\n');

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];

      for (const pattern of ALL_PATTERNS) {
        const match = pattern.regex.exec(line);
        if (match) {
          findings.push({
            category: pattern.category,
            severity: pattern.severity,
            patternName: pattern.name,
            match: match[0],
            file: file.name,
            line: lineIndex + 1,
            context: line.trim().slice(0, 200),
          });
        }
      }
    }
  }

  const blocked = findings.filter((f) => f.severity === 'block').length;
  const warnings = findings.filter((f) => f.severity === 'warn').length;

  return {
    passed: blocked === 0,
    findings,
    blocked,
    warnings,
  };
};
