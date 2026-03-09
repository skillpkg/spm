#!/usr/bin/env npx tsx
/**
 * Import skills from GitHub repos into the SPM registry.
 *
 * Usage:
 *   npx tsx scripts/import-skills.ts --api-url http://localhost:8787 --token <admin-jwt>
 *   npx tsx scripts/import-skills.ts --api-url https://registry.skillpkg.dev --token <admin-jwt> --dry-run
 *
 * Sources:
 *   - anthropics/skills (17 skills)
 *   - vercel-labs/agent-skills (5 skills)
 *   - huggingface/skills (10 skills)
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir, homedir } from 'node:os';

// ── Types ──

interface SkillSource {
  owner: string;
  repo: string;
  org: string; // display name for the placeholder user
  trustTier: 'verified' | 'scanned';
  skillsDir: string; // path within repo where skills live
}

interface ParsedSkill {
  name: string;
  description: string;
  license: string;
  version: string;
  category: string;
  skillMd: string;
  source: SkillSource;
  sourceUrl: string;
}

// ── Config ──

const SOURCES: SkillSource[] = [
  {
    owner: 'anthropics',
    repo: 'skills',
    org: 'Anthropic',
    trustTier: 'verified',
    skillsDir: 'skills',
  },
  {
    owner: 'vercel-labs',
    repo: 'agent-skills',
    org: 'Vercel',
    trustTier: 'verified',
    skillsDir: 'skills',
  },
  {
    owner: 'huggingface',
    repo: 'skills',
    org: 'Hugging Face',
    trustTier: 'verified',
    skillsDir: 'skills',
  },
];

// Map skill names to SPM categories based on keywords
const CATEGORY_MAP: Record<string, string> = {
  // Anthropic skills
  'algorithmic-art': 'frontend',
  'brand-guidelines': 'frontend',
  'canvas-design': 'frontend',
  'claude-api': 'backend',
  'doc-coauthoring': 'documents',
  docx: 'documents',
  'frontend-design': 'frontend',
  'internal-comms': 'productivity',
  'mcp-builder': 'backend',
  pdf: 'documents',
  pptx: 'documents',
  'skill-creator': 'productivity',
  'slack-gif-creator': 'productivity',
  'theme-factory': 'frontend',
  'web-artifacts-builder': 'frontend',
  'webapp-testing': 'testing',
  xlsx: 'documents',
  // Vercel skills
  'composition-patterns': 'frontend',
  'deploy-to-vercel': 'infra',
  'react-best-practices': 'frontend',
  'react-native-skills': 'frontend',
  'web-design-guidelines': 'frontend',
  // HuggingFace skills
  'hugging-face-datasets': 'data-analysis',
  'hugging-face-dataset-viewer': 'data-analysis',
  'hugging-face-model-trainer': 'ai-ml',
  'hugging-face-evaluation': 'ai-ml',
  'hugging-face-jobs': 'infra',
  'hugging-face-trackio': 'ai-ml',
  'huggingface-gradio': 'frontend',
  'hf-cli': 'productivity',
  'hugging-face-paper-publisher': 'documents',
  'hugging-face-tool-builder': 'ai-ml',
};

// ── GitHub helpers ──

const gh = (args: string[]): string => {
  try {
    return execFileSync('gh', ['api', ...args], {
      encoding: 'utf-8',
      timeout: 30_000,
    }).trim();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`gh api ${args.join(' ')} failed: ${msg}`);
  }
};

const ghJson = <T>(args: string[]): T => JSON.parse(gh(args)) as T;

interface GhContent {
  name: string;
  type: string;
  download_url: string | null;
}

const listSkillDirs = (source: SkillSource): string[] => {
  const items = ghJson<GhContent[]>([
    `repos/${source.owner}/${source.repo}/contents/${source.skillsDir}`,
  ]);
  return items.filter((i) => i.type === 'dir').map((i) => i.name);
};

const fetchRawFile = (source: SkillSource, skillDir: string, fileName: string): string | null => {
  try {
    return gh([
      `repos/${source.owner}/${source.repo}/contents/${source.skillsDir}/${skillDir}/${fileName}`,
      '-H',
      'Accept: application/vnd.github.raw',
    ]);
  } catch {
    return null;
  }
};

// ── SKILL.md parser ──

interface SkillFrontmatter {
  name: string;
  description: string;
  license: string;
  metadata?: {
    author?: string;
    version?: string;
  };
}

const parseFrontmatter = (content: string): { frontmatter: SkillFrontmatter; body: string } => {
  // Normalize CRLF → LF before parsing
  const normalized = content.replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    throw new Error('No YAML frontmatter found');
  }

  const yamlBlock = match[1];
  const body = match[2];

  // Simple YAML parser that handles multi-line string values and nested objects
  const fm: Record<string, unknown> = {};
  let currentKey = '';
  let multiLineValue = '';
  let inMultiLine = false;

  const flushMultiLine = () => {
    if (inMultiLine && currentKey) {
      fm[currentKey] = multiLineValue.trim();
      inMultiLine = false;
      multiLineValue = '';
    }
  };

  for (const line of yamlBlock.split('\n')) {
    // Top-level key: value
    const kvMatch = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (kvMatch) {
      flushMultiLine();
      currentKey = kvMatch[1];
      const value = kvMatch[2].trim();
      if (value) {
        fm[currentKey] = value;
      } else {
        // Could be multi-line string or nested object — we'll figure out from next lines
        fm[currentKey] = {};
        inMultiLine = true;
        multiLineValue = '';
      }
    } else if (line.startsWith('  ') && currentKey) {
      const trimmed = line.trim();
      // Check if it's a nested key: value (object property)
      const nestedMatch = trimmed.match(/^(\w[\w-]*):\s*"?([^"]*)"?\s*$/);
      if (nestedMatch && !inMultiLine) {
        if (typeof fm[currentKey] !== 'object') fm[currentKey] = {};
        (fm[currentKey] as Record<string, string>)[nestedMatch[1]] = nestedMatch[2];
      } else if (nestedMatch && inMultiLine && multiLineValue === '') {
        // First indented line after empty value — could be nested object or multi-line text
        // If it looks like "key: value", treat as nested object
        inMultiLine = false;
        if (typeof fm[currentKey] !== 'object') fm[currentKey] = {};
        (fm[currentKey] as Record<string, string>)[nestedMatch[1]] = nestedMatch[2];
      } else {
        // Multi-line continuation text
        inMultiLine = true;
        multiLineValue += (multiLineValue ? ' ' : '') + trimmed;
      }
    }
  }
  flushMultiLine();

  return {
    frontmatter: {
      name: (fm.name as string) ?? '',
      description: typeof fm.description === 'string' ? fm.description : '',
      license: (fm.license as string) ?? 'MIT',
      metadata:
        typeof fm.metadata === 'object' ? (fm.metadata as SkillFrontmatter['metadata']) : undefined,
    },
    body,
  };
};

// ── Skill fetcher ──

const fetchSkill = (source: SkillSource, skillDir: string): ParsedSkill | null => {
  const skillMd = fetchRawFile(source, skillDir, 'SKILL.md');
  if (!skillMd) {
    console.warn(`  ⚠ No SKILL.md found in ${skillDir}, skipping`);
    return null;
  }

  let frontmatter: SkillFrontmatter;
  try {
    ({ frontmatter } = parseFrontmatter(skillMd));
  } catch (err) {
    console.warn(`  ⚠ Failed to parse frontmatter for ${skillDir}: ${err}`);
    return null;
  }

  const name = frontmatter.name || skillDir;
  const description = frontmatter.description || `${name} skill from ${source.org}`;

  // Ensure description meets minimum length (30 chars)
  const paddedDescription =
    description.length < 30 ? description + ' — ' + `imported from ${source.org}` : description;

  return {
    name,
    description: paddedDescription.slice(0, 1024),
    license: frontmatter.license?.includes('LICENSE') ? 'MIT' : frontmatter.license || 'MIT',
    version: (frontmatter.metadata?.version || '1.0.0').replace(/['"]/g, ''),
    category: CATEGORY_MAP[skillDir] || 'other',
    skillMd,
    source,
    sourceUrl: `https://github.com/${source.owner}/${source.repo}/tree/main/${source.skillsDir}/${skillDir}`,
  };
};

// ── .skl packer ──

const packSkill = (skill: ParsedSkill): { sklPath: string; manifest: Record<string, unknown> } => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'spm-import-'));
  const skillDir = join(tmpDir, 'skill');
  mkdirSync(skillDir, { recursive: true });

  // Write SKILL.md
  writeFileSync(join(skillDir, 'SKILL.md'), skill.skillMd);

  // Generate manifest
  const manifest = {
    name: skill.name,
    version: skill.version,
    description: skill.description,
    categories: [skill.category],
    license: skill.license,
    authors: [{ name: skill.source.org }],
    keywords: [skill.source.owner, 'imported'],
    urls: {
      repository: `https://github.com/${skill.source.owner}/${skill.source.repo}`,
    },
    agents: {
      claude: { install_path: '.' },
    },
    dependencies: {},
  };

  writeFileSync(join(skillDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // Pack into .skl (tar.gz)
  const sklName = `${skill.name}-${skill.version}.skl`;
  const sklPath = join(tmpDir, sklName);

  execFileSync('tar', ['-czf', sklPath, '-C', skillDir, '.'], { timeout: 10_000 });

  return { sklPath, manifest };
};

// ── API helpers ──

/** Create or get a placeholder user for the given org. Returns user ID. */
const ensurePlaceholderUser = async (
  apiUrl: string,
  token: string,
  source: SkillSource,
): Promise<string> => {
  const res = await fetch(`${apiUrl}/admin/users/placeholder`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: source.owner,
      trust_tier: source.trustTier,
    }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    throw new Error(`Failed to create placeholder user: ${res.status} ${body.message ?? ''}`);
  }

  const data = (await res.json()) as { id: string; created: boolean };
  if (data.created) {
    console.log(`  Created placeholder user: @${source.owner} (${source.trustTier})`);
  } else {
    console.log(`  Using existing user: @${source.owner}`);
  }
  return data.id;
};

/** Publish a skill via the API, on behalf of a placeholder user. */
const publishToApi = async (
  apiUrl: string,
  token: string,
  sklPath: string,
  manifest: Record<string, unknown>,
  importedFrom: string,
  publishAsUserId: string,
): Promise<{ success: boolean; error?: string }> => {
  const sklBuffer = await import('node:fs/promises').then((fs) => fs.readFile(sklPath));

  const formData = new FormData();
  formData.append('package', new Blob([sklBuffer]), `${manifest.name}-${manifest.version}.skl`);
  formData.append('manifest', JSON.stringify(manifest));

  const res = await fetch(`${apiUrl}/skills`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Imported-From': importedFrom,
      'X-Publish-As': publishAsUserId,
    },
    body: formData,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const msg = (body.message as string) ?? res.statusText;
    // Show security findings if present
    const details = body.details as Record<string, unknown> | undefined;
    let extra = '';
    if (details?.findings) {
      const findings = details.findings as Array<Record<string, unknown>>;
      extra =
        '\n' +
        findings
          .map((f) => `      [${f.severity}] ${f.file}:${f.line} — ${f.category}: ${f.match}`)
          .join('\n');
    }
    return { success: false, error: `${res.status}: ${msg}${extra}` };
  }

  return { success: true };
};

// ── Main ──

/** Read token from ~/.spm/config.toml */
const readTokenFromConfig = (): string | null => {
  const configPath = join(homedir(), '.spm', 'config.toml');
  if (!existsSync(configPath)) return null;
  const raw = readFileSync(configPath, 'utf-8');
  const match = raw.match(/token\s*=\s*"([^"]+)"/);
  return match ? match[1] : null;
};

const main = async () => {
  const args = process.argv.slice(2);
  let apiUrl = args.includes('--api-url')
    ? args[args.indexOf('--api-url') + 1]
    : 'http://localhost:8787';

  // Ensure API URL includes the /api/v1 base path
  if (!apiUrl.includes('/api/v1')) {
    apiUrl = apiUrl.replace(/\/+$/, '') + '/api/v1';
  }
  const dryRun = args.includes('--dry-run');
  const sourceFilter = args.includes('--source') ? args[args.indexOf('--source') + 1] : null;

  // Token: explicit flag > config file
  let token = args.includes('--token') ? args[args.indexOf('--token') + 1] : null;
  if (!token && !dryRun) {
    token = readTokenFromConfig();
    if (token) {
      console.log('  Using token from ~/.spm/config.toml');
    }
  }

  if (!token && !dryRun) {
    console.error(
      'Error: --token <admin-jwt> required, or run `spm login` first, or use --dry-run',
    );
    process.exit(1);
  }

  console.log('╔══════════════════════════════════════╗');
  console.log('║   SPM Skill Importer — Phase 1       ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`  API:     ${apiUrl}`);
  console.log(`  Dry run: ${dryRun}`);
  console.log('');

  const results: Array<{ name: string; source: string; status: string; error?: string }> = [];

  for (const source of SOURCES) {
    if (sourceFilter && source.owner !== sourceFilter) continue;

    console.log(`\n── ${source.org} (${source.owner}/${source.repo}) ──\n`);

    // Create or get placeholder user for this org
    let placeholderUserId: string | null = null;
    if (!dryRun) {
      try {
        placeholderUserId = await ensurePlaceholderUser(apiUrl, token!, source);
      } catch (err) {
        console.error(`  ✗ Failed to create placeholder user: ${err}`);
        continue;
      }
      console.log('');
    }

    let skillDirs: string[];
    try {
      skillDirs = listSkillDirs(source);
    } catch (err) {
      console.error(`  ✗ Failed to list skills: ${err}`);
      continue;
    }

    console.log(`  Found ${skillDirs.length} skills: ${skillDirs.join(', ')}\n`);

    for (const dir of skillDirs) {
      process.stdout.write(`  ${dir}... `);

      const skill = fetchSkill(source, dir);
      if (!skill) {
        results.push({ name: dir, source: source.owner, status: 'skipped', error: 'No SKILL.md' });
        continue;
      }

      // Pack
      let sklPath: string;
      let manifest: Record<string, unknown>;
      try {
        ({ sklPath, manifest } = packSkill(skill));
      } catch (err) {
        console.log('✗ pack failed');
        results.push({
          name: skill.name,
          source: source.owner,
          status: 'error',
          error: `Pack: ${err}`,
        });
        continue;
      }

      if (dryRun) {
        console.log(`✓ ${skill.name}@${skill.version} [${skill.category}] (dry run)`);
        results.push({ name: skill.name, source: source.owner, status: 'dry_run' });
        // Clean up
        rmSync(join(sklPath, '..'), { recursive: true, force: true });
        continue;
      }

      // Publish under the placeholder user
      try {
        const result = await publishToApi(
          apiUrl,
          token!,
          sklPath,
          manifest,
          skill.sourceUrl,
          placeholderUserId!,
        );
        if (result.success) {
          console.log(`✓ ${skill.name}@${skill.version} [${skill.category}]`);
          results.push({ name: skill.name, source: source.owner, status: 'published' });
        } else {
          console.log(`✗ ${result.error}`);
          results.push({
            name: skill.name,
            source: source.owner,
            status: 'error',
            error: result.error,
          });
        }
      } catch (err) {
        console.log(`✗ ${err}`);
        results.push({
          name: skill.name,
          source: source.owner,
          status: 'error',
          error: String(err),
        });
      }

      // Clean up
      rmSync(join(sklPath, '..'), { recursive: true, force: true });
    }
  }

  // Summary
  console.log('\n── Summary ──\n');
  const published = results.filter((r) => r.status === 'published').length;
  const dryRunCount = results.filter((r) => r.status === 'dry_run').length;
  const errors = results.filter((r) => r.status === 'error').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;

  console.log(`  Published: ${published}`);
  if (dryRunCount > 0) console.log(`  Dry run:   ${dryRunCount}`);
  if (errors > 0) console.log(`  Errors:    ${errors}`);
  if (skipped > 0) console.log(`  Skipped:   ${skipped}`);

  if (errors > 0) {
    console.log('\n  Errors:');
    for (const r of results.filter((r) => r.status === 'error')) {
      console.log(`    ${r.source}/${r.name}: ${r.error}`);
    }
  }

  console.log('');
};

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
