import { isGithubOAuthEnvConfigured } from "@/lib/github-oauth-config";
import { Suspense } from "react";

import { RegisterPageClient } from "./register-page-client";

export default function RegisterPage() {
  const githubOAuthEnabled = isGithubOAuthEnvConfigured();

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-4">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <RegisterPageClient githubOAuthEnabled={githubOAuthEnabled} />
    </Suspense>
  );
}
