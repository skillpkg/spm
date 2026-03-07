// ── Layer 2: DeBERTa ML Classification via HuggingFace Inference API ──

import type { ScanResult, ScanFinding } from './layer1.js';

const HF_MODEL_URL =
  'https://api-inference.huggingface.co/models/ProtectAI/deberta-v3-base-prompt-injection-v2';

const BLOCK_THRESHOLD = 0.95;
const WARN_THRESHOLD = 0.7;

interface HFPrediction {
  label: string;
  score: number;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const classifyText = async (
  text: string,
  apiToken: string,
  retryOnSleep = true,
): Promise<HFPrediction[]> => {
  const res = await fetch(HF_MODEL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs: text }),
  });

  if (res.status === 503 && retryOnSleep) {
    await sleep(5000);
    return classifyText(text, apiToken, false);
  }

  if (!res.ok) {
    throw new Error(`HuggingFace API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as HFPrediction[] | HFPrediction[][];
  // HF returns [[{label, score}, ...]] for single input
  const predictions = Array.isArray(data[0])
    ? (data[0] as HFPrediction[])
    : (data as HFPrediction[]);
  return predictions;
};

export const scanWithDeBERTa = async (
  files: Array<{ name: string; content: string }>,
  apiToken: string,
): Promise<ScanResult> => {
  const findings: ScanFinding[] = [];
  let maxConfidence: number | null = null;

  for (const file of files) {
    // Truncate very long files to avoid API limits
    const content = file.content.slice(0, 5000);
    if (!content.trim()) continue;

    const predictions = await classifyText(content, apiToken);

    const injection = predictions.find((p) => p.label === 'INJECTION');
    if (!injection) continue;

    if (injection.score > maxConfidence!) maxConfidence = injection.score;

    if (injection.score >= BLOCK_THRESHOLD) {
      findings.push({
        category: 'ml_injection',
        severity: 'block',
        patternName: 'deberta_injection',
        match: `DeBERTa confidence: ${injection.score.toFixed(4)}`,
        file: file.name,
        line: 0,
        context: content.slice(0, 200),
      });
    } else if (injection.score >= WARN_THRESHOLD) {
      findings.push({
        category: 'ml_injection',
        severity: 'warn',
        patternName: 'deberta_injection',
        match: `DeBERTa confidence: ${injection.score.toFixed(4)}`,
        file: file.name,
        line: 0,
        context: content.slice(0, 200),
      });
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

export { BLOCK_THRESHOLD, WARN_THRESHOLD };
