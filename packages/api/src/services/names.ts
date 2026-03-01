/** Skill name validation and anti-squat detection. */

import { compareTwoStrings } from 'string-similarity';

const NAME_RE = /^(@[a-z0-9-]+\/)?[a-z][a-z0-9-]*$/;
const NAME_MIN = 2;
const NAME_MAX = 50;
const SIMILARITY_THRESHOLD = 0.8;

export const RESERVED_NAMES: readonly string[] = [
  'spm',
  'skill',
  'skills',
  'package',
  'packages',
  'npm',
  'node',
  'test',
  'admin',
  'api',
  'auth',
  'login',
  'register',
  'signup',
  'signin',
  'logout',
  'profile',
  'settings',
  'config',
  'system',
  'root',
  'help',
  'docs',
  'documentation',
  'search',
  'explore',
  'trending',
  'official',
  'verified',
  'support',
  'status',
  'health',
  'download',
  'publish',
  'registry',
  'undefined',
  'null',
  'true',
  'false',
];

export const isReservedName = (name: string): boolean => {
  const bare = name.includes('/') ? name.split('/')[1] : name;
  return RESERVED_NAMES.includes(bare);
};

export const validateSkillName = (name: string): { valid: boolean; error?: string } => {
  if (name.length < NAME_MIN) {
    return { valid: false, error: `Name must be at least ${NAME_MIN} characters` };
  }

  if (name.length > NAME_MAX) {
    return { valid: false, error: `Name must be at most ${NAME_MAX} characters` };
  }

  if (!NAME_RE.test(name)) {
    return {
      valid: false,
      error: 'Name must be kebab-case, start with a letter, optionally scoped with @org/',
    };
  }

  if (isReservedName(name)) {
    return { valid: false, error: `"${name}" is a reserved name` };
  }

  return { valid: true };
};

export const checkNameSimilarity = (
  name: string,
  existingNames: string[],
): { similar: boolean; matches: string[] } => {
  const matches = existingNames.filter(
    (existing) => compareTwoStrings(name, existing) >= SIMILARITY_THRESHOLD,
  );
  return { similar: matches.length > 0, matches };
};
