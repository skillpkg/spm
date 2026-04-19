import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Text } from '@spm/ui';
import { useAuth } from '../context/AuthContext';
import { CATEGORY_SLUGS } from '../data/constants';
import { skillPath } from '../lib/urls';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

const CATEGORY_OPTIONS = Object.entries(CATEGORY_SLUGS).map(([label, value]) => ({
  label,
  value,
}));

type PublishState = 'idle' | 'publishing' | 'success' | 'error';
type PublishMode = 'write' | 'upload-skill' | 'upload-both';

interface PublishResult {
  name: string;
  version: string;
  status: string;
  security_level?: string;
  warnings?: Array<{ category: string; pattern: string; file: string; suggestion?: string }>;
}

// ── Tar.gz builder (browser-native) ──

const createTarEntry = (filename: string, content: Uint8Array): Uint8Array => {
  const header = new Uint8Array(512);
  const encoder = new TextEncoder();

  // name (0-99)
  header.set(encoder.encode(filename).slice(0, 100), 0);
  // mode (100-107)
  header.set(encoder.encode('0000644\0'), 100);
  // uid (108-115)
  header.set(encoder.encode('0000000\0'), 108);
  // gid (116-123)
  header.set(encoder.encode('0000000\0'), 116);
  // size (124-135) - octal, 11 chars + null
  const sizeOctal = content.byteLength.toString(8).padStart(11, '0');
  header.set(encoder.encode(sizeOctal + '\0'), 124);
  // mtime (136-147)
  const mtime = Math.floor(Date.now() / 1000).toString(8).padStart(11, '0');
  header.set(encoder.encode(mtime + '\0'), 136);
  // checksum placeholder (148-155) - spaces
  header.set(encoder.encode('        '), 148);
  // type flag (156) - '0' = regular file
  header[156] = 48; // '0'
  // ustar magic (257-262)
  header.set(encoder.encode('ustar\0'), 257);
  // ustar version (263-264)
  header.set(encoder.encode('00'), 263);

  // Calculate checksum
  let checksum = 0;
  for (let i = 0; i < 512; i++) {
    checksum += header[i];
  }
  const checksumOctal = checksum.toString(8).padStart(6, '0');
  header.set(encoder.encode(checksumOctal + '\0 '), 148);

  // Data padded to 512-byte boundary
  const paddedSize = Math.ceil(content.byteLength / 512) * 512;
  const data = new Uint8Array(paddedSize);
  data.set(content, 0);

  // Combine header + data
  const entry = new Uint8Array(512 + paddedSize);
  entry.set(header, 0);
  entry.set(data, 512);
  return entry;
};

const buildTarGz = async (
  files: Array<{ name: string; content: string }>,
): Promise<Blob> => {
  const encoder = new TextEncoder();

  // Build tar
  const entries: Uint8Array[] = [];
  for (const file of files) {
    entries.push(createTarEntry(file.name, encoder.encode(file.content)));
  }
  // End-of-archive marker (two 512-byte zero blocks)
  entries.push(new Uint8Array(1024));

  const tarData = new Uint8Array(entries.reduce((sum, e) => sum + e.byteLength, 0));
  let offset = 0;
  for (const entry of entries) {
    tarData.set(entry, offset);
    offset += entry.byteLength;
  }

  // Gzip using CompressionStream
  const stream = new Blob([tarData]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Response(stream).blob();
};

// ── Styles ──

const cardStyle: React.CSSProperties = {
  padding: '24px 28px',
  background: 'var(--color-bg-card)',
  border: '1px solid var(--color-border-default)',
  borderRadius: 10,
  marginBottom: 20,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontFamily: 'var(--font-mono)',
  fontSize: 13,
  background: 'var(--color-bg)',
  border: '1px solid var(--color-border-default)',
  borderRadius: 6,
  color: 'var(--color-text-primary)',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  marginBottom: 6,
  display: 'block',
};

const hintStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 11,
  color: 'var(--color-text-muted)',
  marginTop: 4,
};

// ── Mode selector ──

const MODE_OPTIONS: Array<{ id: PublishMode; label: string; desc: string }> = [
  {
    id: 'write',
    label: 'Write skill',
    desc: 'Write your skill instructions directly',
  },
  {
    id: 'upload-skill',
    label: 'Upload skill file',
    desc: 'Upload a SKILL.md or prompt file',
  },
  {
    id: 'upload-both',
    label: 'Upload skill + manifest',
    desc: 'Upload both files if you have them ready',
  },
];

// ── Publish Form ──

const PublishForm = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const skillFileRef = useRef<HTMLInputElement>(null);
  const manifestFileRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<PublishMode>('write');
  const [name, setName] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [keywords, setKeywords] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [readme, setReadme] = useState('');

  // Mode: write
  const [skillContent, setSkillContent] = useState('');

  // Mode: upload-skill
  const [skillFile, setSkillFile] = useState<File | null>(null);
  const [skillFileContent, setSkillFileContent] = useState('');

  // Mode: upload-both
  const [manifestFile, setManifestFile] = useState<File | null>(null);
  const [manifestFileContent, setManifestFileContent] = useState('');

  const [state, setState] = useState<PublishState>('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState<PublishResult | null>(null);

  const toggleCategory = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const handleSkillFileChange = async (file: File | null) => {
    setSkillFile(file);
    if (file) {
      const text = await file.text();
      setSkillFileContent(text);
    } else {
      setSkillFileContent('');
    }
  };

  const handleManifestFileChange = async (file: File | null) => {
    setManifestFile(file);
    if (file) {
      const text = await file.text();
      setManifestFileContent(text);
      // Try to parse and pre-fill form fields
      try {
        const parsed = JSON.parse(text) as Record<string, unknown>;
        if (parsed.name && typeof parsed.name === 'string') setName(parsed.name);
        if (parsed.version && typeof parsed.version === 'string') setVersion(parsed.version);
        if (parsed.description && typeof parsed.description === 'string')
          setDescription(parsed.description);
        if (Array.isArray(parsed.categories)) setCategories(parsed.categories as string[]);
        if (Array.isArray(parsed.keywords))
          setKeywords((parsed.keywords as string[]).join(', '));
        if (parsed.private === true) setIsPrivate(true);
      } catch {
        // Not valid JSON, ignore
      }
    } else {
      setManifestFileContent('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Determine skill content based on mode
    let content = '';
    if (mode === 'write') {
      content = skillContent;
    } else if (mode === 'upload-skill') {
      content = skillFileContent;
    } else if (mode === 'upload-both') {
      content = skillFileContent;
    }

    if (!content.trim()) {
      setError(
        mode === 'write'
          ? 'Write your skill instructions'
          : 'Please upload a skill file',
      );
      return;
    }

    // Build manifest from form (or from uploaded manifest in upload-both mode)
    let manifestJson: Record<string, unknown>;
    if (mode === 'upload-both' && manifestFileContent.trim()) {
      try {
        manifestJson = JSON.parse(manifestFileContent) as Record<string, unknown>;
        // Override with form fields if they were edited
        if (name.trim()) manifestJson.name = name.trim();
        if (version.trim()) manifestJson.version = version.trim();
        if (description.trim()) manifestJson.description = description.trim();
        if (categories.length > 0) manifestJson.categories = categories;
        if (isPrivate) manifestJson.private = true;
      } catch {
        setError('The manifest file is not valid JSON');
        return;
      }
    } else {
      if (!name.trim()) {
        setError('Skill name is required');
        return;
      }
      if (!version.trim()) {
        setError('Version is required');
        return;
      }
      if (description.length < 30) {
        setError('Description must be at least 30 characters');
        return;
      }
      if (categories.length === 0) {
        setError('Select at least one category');
        return;
      }

      manifestJson = {
        name: name.trim(),
        version: version.trim(),
        description: description.trim(),
        categories,
        ...(keywords.trim()
          ? { keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean) }
          : {}),
        ...(isPrivate ? { private: true } : {}),
      };
    }

    setState('publishing');

    try {
      // Build the .skl tar.gz from the skill content
      const skillFileName = skillFile?.name ?? 'SKILL.md';
      const files: Array<{ name: string; content: string }> = [
        { name: 'manifest.json', content: JSON.stringify(manifestJson, null, 2) },
        { name: skillFileName, content },
      ];

      const sklBlob = await buildTarGz(files);
      const sklFile_ = new File([sklBlob], `${(manifestJson.name as string) ?? 'skill'}.skl`, {
        type: 'application/gzip',
      });

      const formData = new FormData();
      formData.append('package', sklFile_);
      formData.append('manifest', JSON.stringify(manifestJson));
      if (readme.trim()) {
        formData.append('readme', readme.trim());
      }

      const res = await fetch(`${API_URL}/skills`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        let message = res.statusText;
        try {
          const body = (await res.json()) as {
            message?: string;
            details?: { issues?: Array<{ path: string; message: string }> };
          };
          if (body.details?.issues) {
            message = body.details.issues.map((i) => `${i.path}: ${i.message}`).join('; ');
          } else if (body.message) {
            message = body.message;
          }
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      const data = (await res.json()) as PublishResult;
      setResult(data);
      setState('success');
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Failed to publish');
    }
  };

  // ── Success state ──

  if (state === 'success' && result) {
    return (
      <div style={cardStyle}>
        <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 16 }}>&#x2705;</div>
        <Text
          variant="h3"
          font="sans"
          color="primary"
          as="h2"
          style={{ textAlign: 'center', margin: '0 0 8px' }}
        >
          Published successfully!
        </Text>
        <Text
          variant="body"
          font="mono"
          color="accent"
          as="div"
          style={{ textAlign: 'center', marginBottom: 8 }}
        >
          {result.name}@{result.version}
        </Text>
        {result.security_level === 'flagged' && (
          <Text
            variant="body-sm"
            font="sans"
            as="div"
            style={{
              textAlign: 'center',
              marginBottom: 12,
              padding: '8px 12px',
              background: 'rgba(234,179,8,0.1)',
              borderRadius: 6,
              border: '1px solid rgba(234,179,8,0.2)',
              color: 'var(--color-yellow)',
            }}
          >
            Security scan flagged some warnings. Your skill is published but may be reviewed.
          </Text>
        )}
        {result.warnings && result.warnings.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Text variant="caption" font="sans" color="muted" as="div" style={{ marginBottom: 6 }}>
              Warnings:
            </Text>
            {result.warnings.map((w, i) => (
              <Text
                key={i}
                variant="label"
                font="mono"
                color="dim"
                as="div"
                style={{ marginBottom: 2 }}
              >
                {w.pattern} in {w.file}
                {w.suggestion ? ` — ${w.suggestion}` : ''}
              </Text>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
          <button
            onClick={() => navigate(skillPath(result.name))}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--color-accent)',
              color: 'var(--color-bg)',
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            View skill
          </button>
          <button
            onClick={() => {
              setState('idle');
              setResult(null);
              setSkillContent('');
              setSkillFile(null);
              setSkillFileContent('');
              setManifestFile(null);
              setManifestFileContent('');
            }}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              border: '1px solid var(--color-border-default)',
              background: 'transparent',
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Publish another
          </button>
        </div>
      </div>
    );
  }

  // ── Form ──

  return (
    <form onSubmit={handleSubmit}>
      <div style={cardStyle}>
        {/* Mode selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {MODE_OPTIONS.map((opt) => {
            const active = mode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setMode(opt.id)}
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: active
                    ? '1px solid var(--color-accent)'
                    : '1px solid var(--color-border-default)',
                  background: active ? 'rgba(16,185,129,0.08)' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 13,
                    fontWeight: 600,
                    color: active ? 'var(--color-accent)' : 'var(--color-text-primary)',
                    marginBottom: 2,
                  }}
                >
                  {opt.label}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 11,
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {opt.desc}
                </div>
              </button>
            );
          })}
        </div>

        {/* Skill content — mode-specific */}
        {mode === 'write' && (
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Skill instructions</label>
            <textarea
              style={{
                ...inputStyle,
                minHeight: 200,
                resize: 'vertical',
                lineHeight: 1.7,
                fontFamily: 'var(--font-mono)',
              }}
              value={skillContent}
              onChange={(e) => setSkillContent(e.target.value)}
              placeholder={`# My Skill\n\nYou are an expert at...\n\n## Instructions\n\n1. First, analyze the request\n2. Then, generate the output\n\n## Examples\n\nInput: ...\nOutput: ...`}
            />
            <div style={hintStyle}>
              Write the instructions your skill gives to the AI agent. This becomes the SKILL.md
              file.
            </div>
          </div>
        )}

        {mode === 'upload-skill' && (
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Skill file</label>
            <div
              onClick={() => skillFileRef.current?.click()}
              style={{
                ...inputStyle,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                color: skillFile ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                marginBottom: 8,
              }}
            >
              <span>{skillFile ? skillFile.name : 'Choose a file (SKILL.md, prompt.txt, ...)'}</span>
              <span style={{ fontSize: 11, color: 'var(--color-accent)' }}>Browse</span>
            </div>
            <input
              ref={skillFileRef}
              type="file"
              accept=".md,.txt,.yaml,.yml,.json"
              style={{ display: 'none' }}
              onChange={(e) => handleSkillFileChange(e.target.files?.[0] ?? null)}
            />
            {skillFileContent && (
              <div
                style={{
                  ...inputStyle,
                  maxHeight: 200,
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: 'var(--color-text-secondary)',
                  marginTop: 8,
                }}
              >
                {skillFileContent.slice(0, 2000)}
                {skillFileContent.length > 2000 && '...'}
              </div>
            )}
          </div>
        )}

        {mode === 'upload-both' && (
          <>
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Skill file</label>
              <div
                onClick={() => skillFileRef.current?.click()}
                style={{
                  ...inputStyle,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  color: skillFile ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                }}
              >
                <span>
                  {skillFile ? skillFile.name : 'Choose skill file (SKILL.md, prompt.txt, ...)'}
                </span>
                <span style={{ fontSize: 11, color: 'var(--color-accent)' }}>Browse</span>
              </div>
              <input
                ref={skillFileRef}
                type="file"
                accept=".md,.txt,.yaml,.yml,.json"
                style={{ display: 'none' }}
                onChange={(e) => handleSkillFileChange(e.target.files?.[0] ?? null)}
              />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Manifest file (manifest.json)</label>
              <div
                onClick={() => manifestFileRef.current?.click()}
                style={{
                  ...inputStyle,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  color: manifestFile
                    ? 'var(--color-text-primary)'
                    : 'var(--color-text-muted)',
                }}
              >
                <span>{manifestFile ? manifestFile.name : 'Choose manifest.json'}</span>
                <span style={{ fontSize: 11, color: 'var(--color-accent)' }}>Browse</span>
              </div>
              <input
                ref={manifestFileRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={(e) => handleManifestFileChange(e.target.files?.[0] ?? null)}
              />
              <div style={hintStyle}>
                Uploading a manifest will pre-fill the fields below
              </div>
            </div>
          </>
        )}

        {/* Manifest fields — always shown */}
        <div
          style={{
            borderTop: '1px solid var(--color-border-default)',
            paddingTop: 18,
            marginTop: 8,
          }}
        >
          <Text
            variant="caption"
            font="sans"
            color="muted"
            as="div"
            style={{ marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            Manifest details
          </Text>

          {/* Name + Version row */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Name</label>
              <input
                style={inputStyle}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="@scope/my-skill or my-skill"
              />
              <div style={hintStyle}>Use @org/name for org-scoped skills</div>
            </div>
            <div style={{ width: 140 }}>
              <label style={labelStyle}>Version</label>
              <input
                style={inputStyle}
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="1.0.0"
              />
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Description</label>
            <textarea
              style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A clear description of what this skill does (min 30 chars)"
            />
            <div style={hintStyle}>{description.length}/30 minimum characters</div>
          </div>

          {/* Categories */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Categories</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CATEGORY_OPTIONS.map((cat) => {
                const selected = categories.includes(cat.value);
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => toggleCategory(cat.value)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 6,
                      border: selected
                        ? '1px solid var(--color-accent)'
                        : '1px solid var(--color-border-default)',
                      background: selected ? 'rgba(16,185,129,0.12)' : 'transparent',
                      color: selected ? 'var(--color-accent)' : 'var(--color-text-muted)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      cursor: 'pointer',
                      transition: 'all 100ms',
                    }}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Keywords */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Keywords (optional)</label>
            <input
              style={inputStyle}
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="typescript, testing, react (comma-separated)"
            />
          </div>

          {/* Private toggle */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--color-accent)' }}
              />
              <span style={{ ...labelStyle, margin: 0 }}>Private skill</span>
            </label>
            <div style={{ ...hintStyle, marginLeft: 26 }}>
              Only visible to org members. Requires an org-scoped name (@org/name).
            </div>
          </div>

          {/* README */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>README (optional)</label>
            <textarea
              style={{ ...inputStyle, minHeight: 100, resize: 'vertical', lineHeight: 1.6 }}
              value={readme}
              onChange={(e) => setReadme(e.target.value)}
              placeholder="# My Skill&#10;&#10;Detailed usage instructions, examples, configuration options..."
            />
            <div style={hintStyle}>Markdown supported. Shown on the skill detail page.</div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 6,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#f87171',
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={state === 'publishing'}
          style={{
            width: '100%',
            padding: '12px 20px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--color-accent)',
            color: 'var(--color-bg)',
            fontFamily: 'var(--font-sans)',
            fontSize: 15,
            fontWeight: 600,
            cursor: state === 'publishing' ? 'wait' : 'pointer',
            opacity: state === 'publishing' ? 0.7 : 1,
          }}
        >
          {state === 'publishing' ? 'Publishing...' : 'Publish skill'}
        </button>
      </div>
    </form>
  );
};

// ── Guide content ──

const steps = [
  {
    step: '1',
    title: 'Create your skill',
    content:
      'Initialize a new skill with spm init, which scaffolds a SKILL.md manifest and directory structure.',
    code: '$ spm init my-skill\n$ cd my-skill',
  },
  {
    step: '2',
    title: 'Write SKILL.md',
    content:
      "Define your skill's metadata, instructions, and configuration in the SKILL.md manifest file.",
    code: `---
name: my-skill
version: 1.0.0
description: A brief description
author: your-username
categories: [code-quality, testing]
tags: [typescript, testing]
---

# My Skill

Instructions for the agent go here...`,
  },
  {
    step: '3',
    title: 'Test locally',
    content: 'Validate your skill passes all checks before publishing.',
    code: '$ spm publish --dry-run',
  },
  {
    step: '4',
    title: 'Authenticate',
    content: 'Log in with your GitHub account using the device flow.',
    code: '$ spm login',
  },
  {
    step: '5',
    title: 'Pack & publish',
    content:
      'Pack your skill into a .skl archive and publish it — either from the CLI or upload the .skl file above.',
    code: '$ spm pack        # creates .skl file\n$ spm publish     # or upload here',
  },
];

const guidelines = [
  'Keep skills focused — one skill, one purpose',
  'Write clear, specific instructions in SKILL.md',
  'Include examples of expected input/output',
  'Tag your skill accurately for discoverability',
  'Use semantic versioning (major.minor.patch)',
  "Don't include secrets, API keys, or credentials",
  'Test with multiple agent platforms if possible',
];

// ── Main component ──

export const Publish = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 32px 60px' }}>
      <Text
        variant="h1"
        font="sans"
        color="primary"
        as="h1"
        style={{ marginBottom: 4, marginTop: 0 }}
      >
        Publish a Skill
      </Text>
      <Text
        variant="body"
        font="sans"
        color="muted"
        as="p"
        style={{ marginBottom: 32, marginTop: 0 }}
      >
        {isAuthenticated
          ? 'Write or upload your skill to publish it to the registry.'
          : 'Share your skill with the community. Sign in to publish from the web.'}
      </Text>

      {isAuthenticated ? (
        <PublishForm />
      ) : (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '32px 28px' }}>
          <Text variant="body" font="sans" color="muted" as="p" style={{ margin: '0 0 16px' }}>
            Sign in with GitHub to publish skills from the web.
          </Text>
          <a
            href="/signin"
            style={{
              display: 'inline-block',
              padding: '10px 28px',
              borderRadius: 8,
              background: 'var(--color-accent)',
              color: 'var(--color-bg)',
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Sign in
          </a>
        </div>
      )}

      {/* CLI guide */}
      <Text
        variant="h3"
        font="sans"
        color="secondary"
        as="h2"
        style={{ marginBottom: 12, marginTop: 8 }}
      >
        Publishing via CLI
      </Text>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
        {steps.map((s) => (
          <div key={s.step} style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Text
                variant="caption"
                font="mono"
                color="accent"
                weight={700}
                as="div"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'rgba(16,185,129,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {s.step}
              </Text>
              <Text variant="h4" font="sans" color="primary" as="span">
                {s.title}
              </Text>
            </div>
            <Text
              variant="body-sm"
              font="sans"
              color="muted"
              as="div"
              style={{ marginBottom: 12, lineHeight: 1.5 }}
            >
              {s.content}
            </Text>
            <Text
              variant="body-sm"
              font="mono"
              color="secondary"
              as="pre"
              style={{
                padding: '12px 14px',
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 6,
                margin: 0,
                overflow: 'auto',
                lineHeight: 1.6,
              }}
            >
              {s.code}
            </Text>
          </div>
        ))}
      </div>

      {/* Guidelines */}
      <Text
        variant="h3"
        font="sans"
        color="secondary"
        as="h2"
        style={{ marginBottom: 12, marginTop: 0 }}
      >
        Publishing guidelines
      </Text>
      <div style={cardStyle}>
        {guidelines.map((g, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: 10,
              padding: '8px 0',
              borderBottom: i < guidelines.length - 1 ? '1px solid #1a1d2733' : 'none',
            }}
          >
            <Text variant="caption" font="mono" color="accent" as="span">
              &#x2713;
            </Text>
            <Text
              variant="body-sm"
              font="sans"
              color="secondary"
              as="span"
              style={{ lineHeight: 1.5 }}
            >
              {g}
            </Text>
          </div>
        ))}
      </div>
    </div>
  );
};
