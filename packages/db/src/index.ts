// Database client and utilities

export * from "./client";
export * from "./schema";

// Re-export Drizzle types for convenience
export type { InferSelectModel, InferInsertModel } from "drizzle-orm";

// Re-export commonly used Drizzle query functions
// This ensures all Drizzle functions come from the same module instance,
// preventing TypeScript type incompatibility issues in monorepos
export {
  eq,
  ne,
  gt,
  gte,
  lt,
  lte,
  and,
  or,
  not,
  inArray,
  notInArray,
  isNull,
  isNotNull,
  like,
  ilike,
  desc,
  asc,
  sql,
  count,
  sum,
  avg,
  max,
  min,
} from "drizzle-orm";
