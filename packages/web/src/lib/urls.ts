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
