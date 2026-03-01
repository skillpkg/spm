// ── Security Pipeline Orchestrator ──

import { scanContent } from '../security/layer1.js';
import { getSuggestion } from '../security/suggestions.js';
import type { ScanResult, ScanFinding } from '../security/layer1.js';

export interface ScanLayer {
  name: string;
  scan: (files: Array<{ name: string; content: string }>) => Promise<ScanResult>;
}

export interface PipelineFinding extends ScanFinding {
  suggestion: { why: string; fix: string };
}

export interface PipelineResult {
  passed: boolean;
  blocked: number;
  warnings: number;
  findings: PipelineFinding[];
  layers: Array<{
    name: string;
    passed: boolean;
    blocked: number;
    warnings: number;
  }>;
}

/**
 * Layer 1 adapter — wraps the synchronous scanContent into the async ScanLayer interface.
 */
const layer1: ScanLayer = {
  name: 'pattern_match',
  scan: async (files) => scanContent(files),
};

// Layers 2 (ML classification) and 3 (commercial API) are stubs for post-launch.
// They will be added here when implemented.
const layers: ScanLayer[] = [layer1];

/**
 * Run the full security pipeline across all registered layers.
 * Returns aggregated results with per-finding suggestions.
 */
export const runSecurityPipeline = async (
  files: Array<{ name: string; content: string }>,
): Promise<PipelineResult> => {
  const allFindings: PipelineFinding[] = [];
  const layerResults: PipelineResult['layers'] = [];

  for (const layer of layers) {
    const result = await layer.scan(files);

    layerResults.push({
      name: layer.name,
      passed: result.passed,
      blocked: result.blocked,
      warnings: result.warnings,
    });

    for (const finding of result.findings) {
      allFindings.push({
        ...finding,
        suggestion: getSuggestion(finding.category),
      });
    }
  }

  const blocked = allFindings.filter((f) => f.severity === 'block').length;
  const warnings = allFindings.filter((f) => f.severity === 'warn').length;

  return {
    passed: blocked === 0,
    blocked,
    warnings,
    findings: allFindings,
    layers: layerResults,
  };
};
