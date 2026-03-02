import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  icons,
  c,
  getOutputMode,
  setOutputMode,
  getCurrentMode,
  log,
  logVerbose,
  logJson,
  logError,
} from '../lib/output.js';

describe('icons', () => {
  it('has all required icon keys', () => {
    const requiredKeys = [
      'success',
      'error',
      'warning',
      'info',
      'pending',
      'arrow',
      'bullet',
      'shield',
      'package',
      'link',
      'lock',
    ];
    for (const key of requiredKeys) {
      expect(icons).toHaveProperty(key);
      expect(typeof icons[key as keyof typeof icons]).toBe('string');
    }
  });

  it('icon strings are non-empty', () => {
    for (const value of Object.values(icons)) {
      expect(value.length).toBeGreaterThan(0);
    }
  });
});

describe('c (semantic colors)', () => {
  it('has all required color keys', () => {
    const requiredKeys = [
      'name',
      'version',
      'cmd',
      'path',
      'url',
      'trust',
      'dim',
      'bold',
      'err',
      'warn',
      'hint',
    ];
    for (const key of requiredKeys) {
      expect(c).toHaveProperty(key);
      expect(typeof c[key as keyof typeof c]).toBe('function');
    }
  });

  it('color functions return strings', () => {
    expect(typeof c.name('test')).toBe('string');
    expect(typeof c.version('1.0.0')).toBe('string');
    expect(typeof c.cmd('spm install')).toBe('string');
    expect(typeof c.err('failed')).toBe('string');
  });
});

describe('getOutputMode', () => {
  it('returns "default" when no flags are set', () => {
    expect(getOutputMode({})).toBe('default');
  });

  it('returns "verbose" for --verbose flag', () => {
    expect(getOutputMode({ verbose: true })).toBe('verbose');
  });

  it('returns "silent" for --silent flag', () => {
    expect(getOutputMode({ silent: true })).toBe('silent');
  });

  it('returns "json" for --json flag', () => {
    expect(getOutputMode({ json: true })).toBe('json');
  });

  it('json takes precedence over verbose and silent', () => {
    expect(getOutputMode({ json: true, verbose: true, silent: true })).toBe('json');
  });

  it('silent takes precedence over verbose', () => {
    expect(getOutputMode({ silent: true, verbose: true })).toBe('silent');
  });
});

describe('setOutputMode / getCurrentMode', () => {
  afterEach(() => {
    setOutputMode('default');
  });

  it('sets and gets the current mode', () => {
    setOutputMode('verbose');
    expect(getCurrentMode()).toBe('verbose');

    setOutputMode('json');
    expect(getCurrentMode()).toBe('json');
  });
});

describe('log', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    setOutputMode('default');
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    setOutputMode('default');
  });

  it('outputs with 2-space indent in default mode', () => {
    log('hello');
    expect(consoleSpy).toHaveBeenCalledWith('  hello');
  });

  it('suppresses output in silent mode', () => {
    setOutputMode('silent');
    log('hello');
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('suppresses output in json mode', () => {
    setOutputMode('json');
    log('hello');
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('outputs in verbose mode', () => {
    setOutputMode('verbose');
    log('hello');
    expect(consoleSpy).toHaveBeenCalledWith('  hello');
  });
});

describe('logVerbose', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    setOutputMode('default');
  });

  it('outputs only in verbose mode', () => {
    setOutputMode('verbose');
    logVerbose('detail');
    expect(consoleSpy).toHaveBeenCalledWith('  detail');
  });

  it('suppresses output in default mode', () => {
    setOutputMode('default');
    logVerbose('detail');
    expect(consoleSpy).not.toHaveBeenCalled();
  });
});

describe('logJson', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    setOutputMode('default');
  });

  it('outputs JSON in json mode', () => {
    setOutputMode('json');
    logJson({ status: 'ok' });
    expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify({ status: 'ok' }, null, 2));
  });

  it('suppresses output in default mode', () => {
    setOutputMode('default');
    logJson({ status: 'ok' });
    expect(consoleSpy).not.toHaveBeenCalled();
  });
});

describe('logError', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    setOutputMode('default');
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    setOutputMode('default');
  });

  it('formats error with title only', () => {
    logError('Something failed');
    const calls = consoleSpy.mock.calls.map((args) => String(args[0]));
    expect(calls.some((line) => line.includes('Something failed'))).toBe(true);
  });

  it('formats error with title and detail', () => {
    logError('Network error', 'Connection refused');
    const calls = consoleSpy.mock.calls.map((args) => String(args[0]));
    expect(calls.some((line) => line.includes('Network error'))).toBe(true);
    expect(calls.some((line) => line.includes('Connection refused'))).toBe(true);
  });

  it('formats error with title, detail, and hint', () => {
    logError('Auth required', 'No token found', 'Run spm login');
    const calls = consoleSpy.mock.calls.map((args) => String(args[0]));
    expect(calls.some((line) => line.includes('Auth required'))).toBe(true);
    expect(calls.some((line) => line.includes('No token found'))).toBe(true);
    expect(calls.some((line) => line.includes('Run spm login'))).toBe(true);
  });

  it('suppresses output in json mode', () => {
    setOutputMode('json');
    logError('Something failed');
    expect(consoleSpy).not.toHaveBeenCalled();
  });
});

// ============================================
// JSON output structure validation
// ============================================

describe('logJson output structure', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    setOutputMode('json');
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    setOutputMode('default');
  });

  it('outputs valid JSON for an object', () => {
    const data = { name: 'test', version: '1.0.0', count: 42 };
    logJson(data);

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const output = consoleSpy.mock.calls[0][0] as string;
    const parsed: unknown = JSON.parse(output);
    expect(parsed).toEqual(data);
  });

  it('outputs valid JSON for an array', () => {
    const data = [{ id: 1 }, { id: 2 }];
    logJson(data);

    const output = consoleSpy.mock.calls[0][0] as string;
    const parsed: unknown = JSON.parse(output);
    expect(parsed).toEqual(data);
  });

  it('outputs pretty-printed JSON with 2-space indent', () => {
    logJson({ key: 'value' });

    const output = consoleSpy.mock.calls[0][0] as string;
    expect(output).toContain('\n');
    expect(output).toContain('  "key"');
  });

  it('handles null value', () => {
    logJson(null);

    const output = consoleSpy.mock.calls[0][0] as string;
    expect(output).toBe('null');
  });

  it('handles nested objects', () => {
    const data = { outer: { inner: { deep: 'value' } } };
    logJson(data);

    const output = consoleSpy.mock.calls[0][0] as string;
    const parsed: unknown = JSON.parse(output);
    expect(parsed).toEqual(data);
  });
});

// ============================================
// Silent mode
// ============================================

describe('silent mode behavior', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    setOutputMode('silent');
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    setOutputMode('default');
  });

  it('log produces no output', () => {
    log('hello');
    log('world');
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('logVerbose produces no output', () => {
    logVerbose('detail');
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('logJson produces no output', () => {
    logJson({ data: true });
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('logError produces no output in silent mode (it uses json check, not silent)', () => {
    // logError is NOT suppressed by silent mode per the implementation —
    // it only suppresses in json mode. Verify it still outputs in silent.
    logError('Error title');
    // logError outputs regardless of silent mode (only json suppresses it)
    expect(consoleSpy).toHaveBeenCalled();
  });
});

// ============================================
// Verbose mode
// ============================================

describe('verbose mode behavior', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    setOutputMode('verbose');
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    setOutputMode('default');
  });

  it('log produces output in verbose mode', () => {
    log('visible');
    expect(consoleSpy).toHaveBeenCalledWith('  visible');
  });

  it('logVerbose produces output in verbose mode', () => {
    logVerbose('extra detail');
    expect(consoleSpy).toHaveBeenCalledWith('  extra detail');
  });

  it('logJson does NOT produce output in verbose mode', () => {
    logJson({ shouldNot: 'appear' });
    expect(consoleSpy).not.toHaveBeenCalled();
  });
});

// ============================================
// Color function behavior
// ============================================

describe('c color functions', () => {
  it('name wraps input and returns string', () => {
    const result = c.name('my-skill');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('err wraps error text and returns string', () => {
    const result = c.err('something broke');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('dim wraps text and returns string', () => {
    const result = c.dim('faded text');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('all color functions accept empty string', () => {
    for (const key of Object.keys(c) as Array<keyof typeof c>) {
      const result = c[key]('');
      expect(typeof result).toBe('string');
    }
  });
});

// ============================================
// getOutputMode edge cases
// ============================================

describe('getOutputMode edge cases', () => {
  it('returns current mode when called with undefined', () => {
    setOutputMode('verbose');
    expect(getOutputMode()).toBe('verbose');
    setOutputMode('default');
  });

  it('json overrides both silent and verbose', () => {
    expect(getOutputMode({ json: true, silent: true, verbose: true })).toBe('json');
  });

  it('returns default for empty opts object', () => {
    expect(getOutputMode({})).toBe('default');
  });

  it('returns default for opts with all false', () => {
    expect(getOutputMode({ json: false, silent: false, verbose: false })).toBe('default');
  });
});
