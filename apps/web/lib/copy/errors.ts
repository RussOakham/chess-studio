import { auth } from "./auth";

export const errors = {
  segment: {
    root: {
      title: "Something went wrong",
      description:
        "An unexpected error occurred. You can try again or go back home.",
    },
    main: {
      title: "This part of the app crashed",
      description:
        "Try again, or go home and come back. If it keeps happening, refresh the page.",
    },
    auth: {
      title: "Sign-in ran into a problem",
      description: "Try again. You can also return home and start over.",
      signInLink: auth.signIn,
    },
  },
  convexFallback: {
    title: "Something went wrong",
    description: "Please try again.",
    retryLabel: "Retry",
  },
  redirectingToSignIn: "Redirecting to sign in…",
  global: {
    title: "Something went wrong",
    fallbackMessage: "An unexpected error occurred.",
  },
} as const;
