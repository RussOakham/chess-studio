/**
 * Central product copy. Prefer `import { … } from "@/lib/copy"` at call sites.
 * Domain modules (`./brand`, `./errors`, …) are the source of truth; this file re-exports only.
 */
export { a11y } from "./a11y";
export { auth } from "./auth";
export { brand } from "./brand";
export { common } from "./common";
export { loading } from "./loading";
export { newGame } from "./new-game";
export { review } from "./review";
export { errors } from "./errors";
export { game } from "./game";
export { gameList } from "./game-list";
export { gameStatusMessages } from "./game-status-messages";
export { github } from "./github";
export { home } from "./home";
export { navigation } from "./navigation";
export { theme } from "./theme";
