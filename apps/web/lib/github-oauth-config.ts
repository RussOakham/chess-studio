/**
 * Server-only: used to decide whether to show the GitHub OAuth UI.
 * Do not import from client components (secrets are not bundled; values would be wrong).
 */
export function isGithubOAuthEnvConfigured(): boolean {
  const id = process.env.GITHUB_CLIENT_ID;
  const secret = process.env.GITHUB_CLIENT_SECRET;

  return (
    typeof id === "string" &&
    id.length > 0 &&
    typeof secret === "string" &&
    secret.length > 0
  );
}
