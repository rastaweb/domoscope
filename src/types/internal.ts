/**
 * Internal types for algorithms and utility functions
 */

/**
 * Represents a match between indices in two arrays for LCS algorithm
 */
export type LCSMatch = [number, number];

/**
 * Configuration for LCS algorithm optimization
 */
export interface LCSConfig {
  /** Whether to enable memoization */
  enableMemoization?: boolean;

  /** Maximum size before switching to optimized algorithm */
  maxSize?: number;
}

/**
 * Node types for DOM traversal
 */
export type DOMNodeType = "text" | "element" | "other";

/**
 * Key type for node identification in LCS algorithm
 */
export type NodeKey = string;

/**
 * Similarity score between elements
 */
export type SimilarityScore = number;

/**
 * Result of parsing HTML into a structured tree
 */
export interface ParsedTree {
  /** Root level elements */
  rootElements: Element[];

  /** All elements in a flat array for easy processing */
  allElements: Element[];
}

/**
 * Mode for text node marking
 */
export type MarkingMode = "added" | "removed";

/**
 * Target view for token fragment generation
 */
export type TokenTarget = "old" | "new";

/**
 * Cache entry for memoized function results
 */
export interface CacheEntry<T> {
  result: T;
  timestamp: number;
}

/**
 * Generic memoization cache
 */
export type MemoCache<K, V> = Map<K, CacheEntry<V>>;

/**
 * Performance metrics for algorithm execution
 */
export interface PerformanceMetrics {
  /** Time taken for element pairing in milliseconds */
  pairingTime: number;

  /** Time taken for LCS computation in milliseconds */
  lcsTime: number;

  /** Time taken for text diffing in milliseconds */
  textDiffTime: number;

  /** Total elements processed */
  elementsProcessed: number;

  /** Number of cache hits */
  cacheHits: number;

  /** Number of cache misses */
  cacheMisses: number;
}
