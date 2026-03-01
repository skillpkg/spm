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
