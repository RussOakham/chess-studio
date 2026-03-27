/**
 * Central product copy. Prefer `import { … } from "@/lib/copy"` at call sites.
 * Domain modules (`./brand`, `./errors`, …) are the source of truth; this file re-exports only.
 */
export { auth } from "./auth";
export { brand } from "./brand";
export { common } from "./common";
export { errors } from "./errors";
