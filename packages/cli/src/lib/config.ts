import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import toml from 'toml';

export interface SpmConfig {
  registry: string;
  token: string | null;
  globalDir: string;
}

const DEFAULT_REGISTRY = 'https://registry.skillpkg.dev/api/v1';

export const getConfigDir = (): string => {
  return path.join(os.homedir(), '.spm');
};

const getConfigPath = (): string => {
  return path.join(getConfigDir(), 'config.toml');
};

const ensureConfigDir = (): void => {
  const dir = getConfigDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

export const loadConfig = (): SpmConfig => {
  const configPath = getConfigPath();

  const defaultConfig: SpmConfig = {
    registry: DEFAULT_REGISTRY,
    token: null,
    globalDir: getConfigDir(),
  };

  if (!fs.existsSync(configPath)) {
    return defaultConfig;
  }

  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = toml.parse(raw) as Record<string, unknown>;
    return {
      registry: typeof parsed.registry === 'string' ? parsed.registry : DEFAULT_REGISTRY,
      token: typeof parsed.token === 'string' ? parsed.token : null,
      globalDir: typeof parsed.globalDir === 'string' ? parsed.globalDir : getConfigDir(),
    };
  } catch {
    return defaultConfig;
  }
};

/**
 * Serialize config to TOML format.
 * toml package is read-only, so we write a simple key = "value" format.
 */
const serializeToml = (config: SpmConfig): string => {
  const lines: string[] = [];
  lines.push(`registry = "${config.registry}"`);
  if (config.token) {
    lines.push(`token = "${config.token}"`);
  }
  if (config.globalDir && config.globalDir !== getConfigDir()) {
    lines.push(`globalDir = "${config.globalDir}"`);
  }
  return lines.join('\n') + '\n';
};

export const saveToken = (token: string): void => {
  ensureConfigDir();
  const config = loadConfig();
  config.token = token;
  fs.writeFileSync(getConfigPath(), serializeToml(config), 'utf-8');
};

export const removeToken = (): void => {
  ensureConfigDir();
  const config = loadConfig();
  config.token = null;
  fs.writeFileSync(getConfigPath(), serializeToml(config), 'utf-8');
};
