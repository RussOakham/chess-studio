import { isGithubOAuthEnvConfigured } from "@/lib/github-oauth-config";

import { RegisterPageClient } from "./register-page-client";

export default function RegisterPage() {
  const githubOAuthEnabled = isGithubOAuthEnvConfigured();

  return <RegisterPageClient githubOAuthEnabled={githubOAuthEnabled} />;
}
