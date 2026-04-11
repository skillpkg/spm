/** Build the client-side route path for a skill page */
export function skillPath(name: string): string {
  // "@alice/my-skill" → "/skills/@alice/my-skill"
  return `/skills/${name}`;
}

/** Build the API path segment for a skill name.
 * Uses full encodeURIComponent so the scoped name hits the unscoped
 * /skills/:name route (Hono decodes it automatically).
 */
export function skillApiPath(name: string): string {
  return `/skills/${encodeURIComponent(name)}`;
}

/** Extract a human-readable display name from a scoped skill name.
 *  "@github/write-coding-standards-from-file" → "Write Coding Standards From File"
 */
export function displayName(fullName: string): string {
  const bare = fullName.includes('/') ? fullName.split('/').pop()! : fullName;
  return bare
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Extract the bare name (without scope) from a skill name.
 *  "@github/my-skill" → "my-skill", "my-skill" → "my-skill"
 */
export function bareName(fullName: string): string {
  return fullName.includes('/') ? fullName.split('/').pop()! : fullName;
}

/** Extract the @scope from a scoped name, or null.
 *  "@github/my-skill" → "@github", "my-skill" → null
 */
export function extractScope(name: string): string | null {
  if (name.startsWith('@') && name.includes('/')) {
    return name.slice(0, name.indexOf('/'));
  }
  return null;
}
