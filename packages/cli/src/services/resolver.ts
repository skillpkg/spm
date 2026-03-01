import type { ApiClient } from '../lib/api-client.js';

export interface SkillSpecifier {
  name: string;
  range?: string;
}

export interface ResolvedSkill {
  name: string;
  version: string;
  downloadUrl: string;
  checksum: string;
  trustTier: string;
  signed: boolean;
}

export interface ResolveResult {
  resolved: ResolvedSkill[];
  unresolved: Array<{
    name: string;
    reason: string;
    suggestions?: string[];
  }>;
}

/**
 * Resolve skill specifiers to exact versions via the registry API.
 */
export const resolveSkills = async (
  apiClient: ApiClient,
  specifiers: SkillSpecifier[],
): Promise<ResolveResult> => {
  const skills = specifiers.map((s) => ({
    name: s.name,
    range: s.range ?? 'latest',
  }));

  const response = await apiClient.resolve(skills);

  const resolved: ResolvedSkill[] = [];
  const unresolved: ResolveResult['unresolved'] = [];

  const resolvedArray = response.resolved as Array<Record<string, unknown>>;

  for (const entry of resolvedArray) {
    if (entry.error) {
      unresolved.push({
        name: entry.name as string,
        reason: (entry.error as string) ?? 'Not found',
        suggestions: (entry.suggestions as string[] | undefined) ?? [],
      });
      continue;
    }

    resolved.push({
      name: entry.name as string,
      version: entry.version as string,
      downloadUrl: entry.download_url as string,
      checksum: entry.checksum as string,
      trustTier: (entry.trust_tier as string) ?? 'registered',
      signed: (entry.signed as boolean) ?? false,
    });
  }

  return { resolved, unresolved };
};

/**
 * Parse a skill specifier string like "data-viz@^1.2.0" into name + range.
 */
export const parseSpecifier = (input: string): SkillSpecifier => {
  // Handle scoped packages: @scope/name@version
  if (input.startsWith('@')) {
    const slashIndex = input.indexOf('/');
    if (slashIndex === -1) {
      return { name: input };
    }
    const afterSlash = input.slice(slashIndex + 1);
    const atIndex = afterSlash.indexOf('@');
    if (atIndex === -1) {
      return { name: input };
    }
    return {
      name: input.slice(0, slashIndex + 1 + atIndex),
      range: afterSlash.slice(atIndex + 1),
    };
  }

  const atIndex = input.indexOf('@');
  if (atIndex === -1) {
    return { name: input };
  }

  return {
    name: input.slice(0, atIndex),
    range: input.slice(atIndex + 1),
  };
};
