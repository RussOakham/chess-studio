import { LoginForm } from "@/components/auth/login-form";
import { PageLoading } from "@/components/ui/page-loading";
import { isGithubOAuthEnvConfigured } from "@/lib/github-oauth-config";
import { Suspense } from "react";

export default function LoginPage() {
  const githubOAuthEnabled = isGithubOAuthEnvConfigured();

  return (
    <Suspense fallback={<PageLoading fullScreen message="Loading…" />}>
      <LoginForm githubOAuthEnabled={githubOAuthEnabled} />
    </Suspense>
  );
}
