// ── Security Pipeline Orchestrator ──

import { scanContent } from '../security/layer1.js';
import { scanWithDeBERTa } from '../security/layer2.js';
import { scanWithLakera } from '../security/layer3.js';
import { getSuggestion } from '../security/suggestions.js';
import type { ScanResult, ScanFinding } from '../security/layer1.js';

export interface ScanLayer {
  name: string;
  scan: (files: Array<{ name: string; content: string }>) => Promise<ScanResult>;
}

export interface PipelineFinding extends ScanFinding {
  suggestion: { why: string; fix: string };
}

export interface LayerResult {
  layer: number;
  name: string;
  status: 'passed' | 'flagged' | 'blocked' | 'skipped' | 'error';
  confidence: number | null;
  blocked: number;
  warnings: number;
  passed: boolean;
}

export interface PipelineResult {
  passed: boolean;
  blocked: number;
  warnings: number;
  findings: PipelineFinding[];
  layers: LayerResult[];
  securityLevel: 'full' | 'partial' | 'flagged' | 'blocked';
}

export interface PipelineOptions {
  skipAdvanced?: boolean;
  hfApiToken?: string;
  lakeraApiKey?: string;
}

/**
 * Layer 1 adapter -- wraps the synchronous scanContent into the async ScanLayer interface.
 */
const layer1: ScanLayer = {
  name: 'pattern_match',
  scan: async (files) => scanContent(files),
};

/**
 * Run the full security pipeline across all registered layers.
 * Returns aggregated results with per-finding suggestions.
 */
export const runSecurityPipeline = async (
  files: Array<{ name: string; content: string }>,
  options: PipelineOptions = {},
): Promise<PipelineResult> => {
  const { skipAdvanced = false, hfApiToken, lakeraApiKey } = options;
  const allFindings: PipelineFinding[] = [];
  const layerResults: LayerResult[] = [];

  // Layer 1 always runs
  const l1Result = await layer1.scan(files);
  const l1Blocked = l1Result.findings.filter((f) => f.severity === 'block').length;
  const l1Warnings = l1Result.findings.filter((f) => f.severity === 'warn').length;

  layerResults.push({
    layer: 1,
    name: 'Static Analysis',
    status: l1Blocked > 0 ? 'blocked' : l1Warnings > 0 ? 'flagged' : 'passed',
    confidence: null,
    blocked: l1Blocked,
    warnings: l1Warnings,
    passed: l1Result.passed,
  });

  for (const finding of l1Result.findings) {
    allFindings.push({
      ...finding,
      suggestion: getSuggestion(finding.category),
    });
  }

  // If L1 blocked, reject immediately (don't run L2/L3)
  if (!l1Result.passed) {
    return {
      passed: false,
      blocked: l1Blocked,
      warnings: l1Warnings,
      findings: allFindings,
      layers: layerResults,
      securityLevel: 'blocked',
    };
  }

  // L2 and L3: skip if requested or if tokens are not available
  if (skipAdvanced) {
    layerResults.push({
      layer: 2,
      name: 'ML Classification',
      status: 'skipped',
      confidence: null,
      blocked: 0,
      warnings: 0,
      passed: true,
    });
    layerResults.push({
      layer: 3,
      name: 'Lakera Guard',
      status: 'skipped',
      confidence: null,
      blocked: 0,
      warnings: 0,
      passed: true,
    });

    return {
      passed: true,
      blocked: 0,
      warnings: l1Warnings,
      findings: allFindings,
      layers: layerResults,
      securityLevel: 'partial',
    };
  }

  // Run L2 and L3 in parallel, with graceful degradation
  const l2Promise = hfApiToken
    ? scanWithDeBERTa(files, hfApiToken).catch((err: unknown) => {
        console.warn('Layer 2 (DeBERTa) failed, degrading gracefully:', err);
        return null;
      })
    : Promise.resolve(null);

  const l3Promise = lakeraApiKey
    ? scanWithLakera(files, lakeraApiKey).catch((err: unknown) => {
        console.warn('Layer 3 (Lakera) failed, degrading gracefully:', err);
        return null;
      })
    : Promise.resolve(null);

  const [l2Result, l3Result] = await Promise.all([l2Promise, l3Promise]);

  // Process Layer 2 results
  if (l2Result) {
    const l2Blocked = l2Result.findings.filter((f) => f.severity === 'block').length;
    const l2Warnings = l2Result.findings.filter((f) => f.severity === 'warn').length;
    // Extract max confidence from findings
    let maxConfidence: number | null = null;
    for (const f of l2Result.findings) {
      const scoreMatch = f.match.match(/confidence: ([\d.]+)/);
      if (scoreMatch) {
        const score = parseFloat(scoreMatch[1]);
        if (maxConfidence === null || score > maxConfidence) maxConfidence = score;
      }
    }

    layerResults.push({
      layer: 2,
      name: 'ML Classification',
      status: l2Blocked > 0 ? 'blocked' : l2Warnings > 0 ? 'flagged' : 'passed',
      confidence: maxConfidence,
      blocked: l2Blocked,
      warnings: l2Warnings,
      passed: l2Result.passed,
    });

    for (const finding of l2Result.findings) {
      allFindings.push({
        ...finding,
        suggestion: getSuggestion(finding.category),
      });
    }
  } else {
    const skippedOrError = hfApiToken ? 'error' : 'skipped';
    layerResults.push({
      layer: 2,
      name: 'ML Classification',
      status: skippedOrError,
      confidence: null,
      blocked: 0,
      warnings: 0,
      passed: true,
    });
  }

  // Process Layer 3 results
  if (l3Result) {
    const l3Warnings = l3Result.findings.length;

    layerResults.push({
      layer: 3,
      name: 'Lakera Guard',
      status: l3Warnings > 0 ? 'flagged' : 'passed',
      confidence: null,
      blocked: 0,
      warnings: l3Warnings,
      passed: true, // Lakera never blocks
    });

    for (const finding of l3Result.findings) {
      allFindings.push({
        ...finding,
        suggestion: getSuggestion(finding.category),
      });
    }
  } else {
    const skippedOrError = lakeraApiKey ? 'error' : 'skipped';
    layerResults.push({
      layer: 3,
      name: 'Lakera Guard',
      status: skippedOrError,
      confidence: null,
      blocked: 0,
      warnings: 0,
      passed: true,
    });
  }

  // Compute overall result
  const totalBlocked = allFindings.filter((f) => f.severity === 'block').length;
  const totalWarnings = allFindings.filter((f) => f.severity === 'warn').length;
  const passed = totalBlocked === 0;

  // Compute security level
  let securityLevel: PipelineResult['securityLevel'];
  if (totalBlocked > 0) {
    securityLevel = 'blocked';
  } else if (totalWarnings > 0) {
    securityLevel = 'flagged';
  } else {
    // Check if any layers were skipped/errored
    const allRan = layerResults.every((l) => l.status !== 'skipped' && l.status !== 'error');
    securityLevel = allRan ? 'full' : 'partial';
  }

  return {
    passed,
    blocked: totalBlocked,
    warnings: totalWarnings,
    findings: allFindings,
    layers: layerResults,
    securityLevel,
  };
};
