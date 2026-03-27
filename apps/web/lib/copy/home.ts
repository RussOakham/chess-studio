import { brand } from "./brand";
import { navigation } from "./navigation";

/** Home / dashboard hero copy. */
export const home = {
  heroTitle: brand.name,
  newGameCta: navigation.newGame,
  welcomeBack: (displayName: string) => `Welcome back, ${displayName}!`,
} as const;
