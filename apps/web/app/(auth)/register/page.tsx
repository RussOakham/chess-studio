import { PageLoading } from "@/components/ui/page-loading";
import { isGithubOAuthEnvConfigured } from "@/lib/github-oauth-config";
import { Suspense } from "react";

import { RegisterPageClient } from "./register-page-client";

export default function RegisterPage() {
  const githubOAuthEnabled = isGithubOAuthEnvConfigured();

  return (
    <Suspense fallback={<PageLoading fullScreen message="Loading…" />}>
      <RegisterPageClient githubOAuthEnabled={githubOAuthEnabled} />
    </Suspense>
  );
}
