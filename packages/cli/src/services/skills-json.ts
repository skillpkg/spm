import { readFile, writeFile, mkdir } from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { SkillsJsonSchema, SkillsLockSchema } from '@spm/shared';
import type { SkillsJson, SkillsLock } from '@spm/shared';
import type { ResolvedSkill } from './resolver.js';

const SKILLS_JSON = 'skills.json';
const SKILLS_LOCK = 'skills-lock.json';

/**
 * Get the path for global skills.json (~/.spm/skills.json).
 */
export const getGlobalSkillsDir = (): string => {
  return path.join(os.homedir(), '.spm');
};

/**
 * Read and validate skills.json from a directory.
 */
export const loadSkillsJson = async (dir: string): Promise<SkillsJson | null> => {
  const filePath = path.join(dir, SKILLS_JSON);
  try {
    const raw = await readFile(filePath, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    const result = SkillsJsonSchema.safeParse(parsed);
    if (!result.success) {
      throw new Error(`Invalid ${SKILLS_JSON}: ${result.error.message}`);
    }
    return result.data;
  } catch (err) {
    if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw err;
  }
};

/**
 * Write skills.json to a directory.
 */
export const saveSkillsJson = async (dir: string, data: SkillsJson): Promise<void> => {
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, SKILLS_JSON);
  await writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
};

/**
 * Add a skill dependency to skills.json.
 * Creates the file if it doesn't exist.
 */
export const addSkillToJson = async (dir: string, name: string, range: string): Promise<void> => {
  let data = await loadSkillsJson(dir);
  if (!data) {
    data = { skills: {} };
  }
  data.skills[name] = range;
  await saveSkillsJson(dir, data);
};

/**
 * Remove a skill dependency from skills.json.
 */
export const removeSkillFromJson = async (dir: string, name: string): Promise<boolean> => {
  const data = await loadSkillsJson(dir);
  if (!data || !(name in data.skills)) {
    return false;
  }
  delete data.skills[name];
  await saveSkillsJson(dir, data);
  return true;
};

/**
 * Read and validate skills-lock.json from a directory.
 */
export const loadLockFile = async (dir: string): Promise<SkillsLock | null> => {
  const filePath = path.join(dir, SKILLS_LOCK);
  try {
    const raw = await readFile(filePath, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    const result = SkillsLockSchema.safeParse(parsed);
    if (!result.success) {
      throw new Error(`Invalid ${SKILLS_LOCK}: ${result.error.message}`);
    }
    return result.data;
  } catch (err) {
    if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw err;
  }
};

/**
 * Write skills-lock.json to a directory.
 */
export const saveLockFile = async (dir: string, data: SkillsLock): Promise<void> => {
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, SKILLS_LOCK);
  await writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
};

/**
 * Update lock file entries for resolved skills.
 * Merges new entries into existing lock file, or creates a new one.
 */
export const updateLockFile = async (dir: string, resolved: ResolvedSkill[]): Promise<void> => {
  let lock = await loadLockFile(dir);
  if (!lock) {
    lock = {
      lockfileVersion: 1,
      generated_at: new Date().toISOString(),
      generated_by: 'spm@0.0.1',
      skills: {},
    };
  }

  for (const skill of resolved) {
    lock.skills[skill.name] = {
      version: skill.version,
      resolved: skill.downloadUrl,
      checksum: skill.checksum,
      source: 'registry',
      signer: skill.signed ? undefined : undefined,
    };
  }

  lock.generated_at = new Date().toISOString();
  await saveLockFile(dir, lock);
};

/**
 * Remove a skill entry from the lock file.
 */
export const removeFromLockFile = async (dir: string, name: string): Promise<boolean> => {
  const lock = await loadLockFile(dir);
  if (!lock || !(name in lock.skills)) {
    return false;
  }
  delete lock.skills[name];
  lock.generated_at = new Date().toISOString();
  await saveLockFile(dir, lock);
  return true;
};
