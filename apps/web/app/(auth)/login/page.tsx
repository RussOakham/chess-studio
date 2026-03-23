import { LoginForm } from "@/components/auth/login-form";
import { isGithubOAuthEnvConfigured } from "@/lib/github-oauth-config";
import { Suspense } from "react";

export default function LoginPage() {
  const githubOAuthEnabled = isGithubOAuthEnvConfigured();

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-4">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <LoginForm githubOAuthEnabled={githubOAuthEnabled} />
    </Suspense>
  );
}
