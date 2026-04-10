/** Build the client-side route path for a skill page */
export function skillPath(name: string): string {
  // "@alice/my-skill" → "/skills/@alice/my-skill"
  return `/skills/${name}`;
}
