/**
 * Re-export all types for easy importing
 */

// Core diff types
export type { TokenType, Token, DiffStats } from "./diff.js";

// Configuration and options
export type {
  ElementChangeHandler,
  TrackingConfig,
  StyleConfig,
  CompareOptions,
  DiffResult,
  DiffResultWithStats,
  PerformanceConfig,
  ExtendedCompareOptions,
} from "./options.js";

// Internal algorithm types
export type {
  LCSMatch,
  LCSConfig,
  DOMNodeType,
  NodeKey,
  SimilarityScore,
  ParsedTree,
  MarkingMode,
  TokenTarget,
  CacheEntry,
  MemoCache,
  PerformanceMetrics,
} from "./internal.js";
