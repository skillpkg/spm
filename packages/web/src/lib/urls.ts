/** Build the client-side route path for a skill page */
export function skillPath(name: string): string {
  // "@alice/my-skill" → "/skills/@alice/my-skill"
  return `/skills/${name}`;
}

/** Build the API path segment for a skill name, preserving the @scope/name structure */
export function skillApiPath(name: string): string {
  // "@alice/my-skill" → "/skills/@alice/my-skill"
  // "my-skill" → "/skills/my-skill"
  if (name.startsWith('@') && name.includes('/')) {
    const slashIdx = name.indexOf('/');
    const scope = name.slice(1, slashIdx);
    const skillName = name.slice(slashIdx + 1);
    return `/skills/@${encodeURIComponent(scope)}/${encodeURIComponent(skillName)}`;
  }
  return `/skills/${encodeURIComponent(name)}`;
}
