/**
 * Configuration and options types for domoscope
 */

/**
 * Callback function for handling element changes during diff operation
 *
 * @param oldEl - The old element (null if element was added)
 * @param newEl - The new element (null if element was removed)
 * @param changeType - The type of change detected
 * @param changedAttrs - Array of changed attribute names (for attribute changes)
 * @returns Custom wrapper element, null to skip wrapping, or undefined for default behavior
 */
export type ElementChangeHandler = (
  oldEl: Element | null,
  newEl: Element | null,
  changeType: 'tag' | 'attribute' | 'tag-added' | 'tag-removed',
  changedAttrs?: string[]
) => void | Element | null;

/**
 * Configuration for tag and attribute tracking
 */
export type TrackingConfig = {
  /** Tags to watch for special handling during additions/removals */
  watchedTags?: string[];

  /**
   * Tags and their attributes to track for change detection
   * Can be an array of tag names or a record mapping tags to their tracked attributes
   */
  trackedTags?: string[] | Record<string, string[]>;

  /** Global filter for which attributes to consider when detecting changes */
  trackedAttributes?: string[];
};

/**
 * Styling configuration for diff visualization
 */
export type StyleConfig = {
  /** CSS class for added content (default: "diff-added") */
  addedClass?: string;

  /** CSS class for removed content (default: "diff-removed") */
  removedClass?: string;

  /** CSS class for elements with tag changes (default: "diff-elem-changed") */
  elementChangeClass?: string;

  /** CSS class for elements with attribute changes (default: "diff-attr-changed") */
  attributeChangeClass?: string;

  /** HTML tag to use for wrapper elements (default: "span") */
  wrapperTag?: string;
};

/**
 * Complete configuration options for diff operations
 */
export interface CompareOptions extends StyleConfig, TrackingConfig {
  /** Custom callback for handling element changes */
  onElementChange?: ElementChangeHandler;
}

/**
 * Result of a diff operation including both DOM and statistics
 */
export interface DiffResult {
  /** All root elements from both old and new trees */
  rootElements: Element[];

  /** All elements from both old and new trees */
  allElements: Element[];
}

/**
 * Complete result of a diff operation with statistics
 */
export interface DiffResultWithStats {
  /** The diff result containing modified DOM elements */
  diffResult: DiffResult;

  /** Comprehensive statistics about the changes */
  stats: import('./diff.js').DiffStats;
}

/**
 * Configuration for performance optimizations
 */
export interface PerformanceConfig {
  /** Maximum text length before skipping word-level diffing */
  maxTextLength?: number;

  /** Minimum similarity score for element pairing */
  minSimilarityThreshold?: number;

  /** Enable memoization for repeated comparisons */
  enableMemoization?: boolean;

  /** Ignore whitespace-only text nodes when counting totalAddedTexts/totalRemovedTexts */
  ignoreWhitespaceTexts?: boolean;
}

/**
 * Extended options including performance configurations
 */
export interface ExtendedCompareOptions extends CompareOptions, PerformanceConfig {}
