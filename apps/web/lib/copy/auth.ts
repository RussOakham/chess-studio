/** Sign-in / registration copy and validation messages (used by Zod). */
export const auth = {
  signIn: "Sign in",
  signUp: "Sign up",
  signOut: {
    label: "Sign Out",
    pending: "Signing out...",
  },
  login: {
    heading: "Sign In",
    emailLabel: "Email",
    passwordLabel: "Password",
    rememberMe: "Remember me",
    submit: "Sign In",
    submitting: "Signing in...",
    emailPlaceholder: "you@example.com",
    passwordPlaceholder: "••••••••",
    footerNoAccount: "Don't have an account?",
    errors: {
      failedSignIn: "Failed to sign in",
    },
  },
  register: {
    heading: "Create Account",
    nameLabel: "Name",
    emailLabel: "Email",
    passwordLabel: "Password",
    namePlaceholder: "Your name",
    emailPlaceholder: "you@example.com",
    passwordPlaceholder: "••••••••",
    submit: "Sign Up",
    submitting: "Creating account...",
    footerHasAccount: "Already have an account?",
    errors: {
      failedSignUp: "Failed to sign up",
    },
  },
  validation: {
    emailInvalid: "Please enter a valid email address",
    emailRequired: "Email is required",
    passwordRequired: "Password is required",
    nameRequired: "Name is required",
    nameMinLength: "Name must be at least 2 characters",
    nameMaxLength: "Name must be less than 100 characters",
    passwordMinLength: "Password must be at least 8 characters",
    passwordMaxLength: "Password must be less than 100 characters",
    passwordComplexity:
      "Password must contain at least one uppercase letter, one lowercase letter, and one number",
  },
  convexDebug: {
    loadingTitle: "Convex auth",
    loadingBadge: "Convex: loading…",
    notSignedIn: "Convex: not signed in",
    signedInTitle: "Signed in via Convex (Better Auth)",
    signedInPrefix: "Convex:",
  },
} as const;
