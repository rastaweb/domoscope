/**
 * Domoscope - Advanced HTML Diff Engine
 *
 * A sophisticated TypeScript library for comparing HTML content with intelligent
 * DOM matching, configurable tracking, and comprehensive statistics.
 *
 * @version 1.0.0
 * @author Your Name
 * @license MIT
 */

// Export all types
export type {
  // Core diff types
  TokenType,
  Token,
  DiffStats,

  // Configuration types
  ElementChangeHandler,
  TrackingConfig,
  StyleConfig,
  CompareOptions,
  DiffResult,
  DiffResultWithStats,
  PerformanceConfig,
  ExtendedCompareOptions,

  // Internal types (for advanced usage)
  LCSMatch,
  SimilarityScore,
  ParsedTree,
  PerformanceMetrics,
} from './types/index.js';

// Export configuration management
export type { ConfigProvider } from './config/index.js';
export {
  DEFAULT_CONFIG,
  DefaultConfigProvider,
  ConfigBuilder,
  ConfigPresets,
  validateConfig,
} from './config/index.js';

// Export algorithm functions
export {
  computeLCS,
  elementSimilarity,
  tokenize,
  computeWordDiff,
  clearCaches,
  getCacheStats,
  getPerformanceMetrics,
  resetPerformanceMetrics,
  configureCaching,
} from './algorithms/index.js';

// Export utility functions
export {
  isRelevantNode,
  nodeKey,
  wrapElement,
  markDescendantTextNodes,
  fragmentFromTokens,
  getChangedAttributes,
  detectAndWrapElementChange,
  getWrapperTag,
  stringToFlatTree,
  validateHTML,
} from './utils/index.js';

// Export core engine
export { DiffEngine, StatsCollector, formatStatsSummary } from './core/index.js';

// Core API Functions
import { DiffEngine, StatsCollector, formatStatsSummary } from './core/index.js';
import { stringToFlatTree } from './utils/index.js';
import { DefaultConfigProvider, ConfigBuilder, ConfigPresets } from './config/index.js';
import {
  computeLCS,
  elementSimilarity,
  tokenize,
  computeWordDiff,
  clearCaches,
  getCacheStats,
  getPerformanceMetrics,
  resetPerformanceMetrics,
} from './algorithms/index.js';
import type { ExtendedCompareOptions, DiffResultWithStats, DiffStats } from './types/index.js';

/**
 * Compare two lists of DOM elements with intelligent pairing and recursive diffing
 *
 * @param oldElements - Array of elements from the old version
 * @param newElements - Array of elements from the new version
 * @param options - Configuration options for the comparison
 */
export function compareElements(
  oldElements: Element[],
  newElements: Element[],
  options: ExtendedCompareOptions = {}
): void {
  const configProvider = new DefaultConfigProvider(options);
  const config = configProvider.getFullConfig();
  const engine = new DiffEngine(config);

  engine.compareElements(oldElements, newElements);
}

/**
 * Analyze diffed DOM elements and collect comprehensive statistics
 *
 * @param rootElements - Root elements of the diffed DOM trees
 * @param options - Configuration options that were used for diffing
 * @returns Detailed statistics about the changes
 */
export function collectDiffStats(
  rootElements: Element[],
  options: ExtendedCompareOptions = {}
): DiffStats {
  const configProvider = new DefaultConfigProvider(options);
  const config = configProvider.getFullConfig();
  const collector = new StatsCollector(config);

  return collector.collectStats(rootElements);
}

/**
 * High-level function that combines parsing, diffing, and statistics collection
 *
 * @param oldHTML - HTML string of the old version
 * @param newHTML - HTML string of the new version
 * @param options - Configuration options for the comparison
 * @returns Object containing both the diffed DOM and comprehensive statistics
 */
export function getCustomDiffStats(
  oldHTML: string,
  newHTML: string,
  options: ExtendedCompareOptions = {}
): DiffResultWithStats {
  // Parse HTML into element trees
  const oldTree = stringToFlatTree(oldHTML);
  const newTree = stringToFlatTree(newHTML);

  // Create containers for the diff operation
  const oldContainer = document.createElement('div');
  const newContainer = document.createElement('div');

  // Append parsed elements to containers and mark trees
  oldTree.rootElements.forEach((el) => oldContainer.appendChild(el));
  newTree.rootElements.forEach((el) => newContainer.appendChild(el));

  // Mark trees to distinguish old from new for statistics
  oldContainer.setAttribute('data-diff-old-tree', 'true');
  newContainer.setAttribute('data-diff-new-tree', 'true');

  // Run the diff operation with improved element matching
  // Compare elements with enhanced similarity for structural matching
  compareElements(
    Array.from(oldContainer.children) as Element[],
    Array.from(newContainer.children) as Element[],
    {
      ...options,
      // Use very low threshold for top-level elements to encourage structural matching
      minSimilarityThreshold: 0.1,
    }
  );

  // Collect all elements for the result
  const allOldElements = Array.from(oldContainer.querySelectorAll('*'));
  const allNewElements = Array.from(newContainer.querySelectorAll('*'));

  const oldRootElements = Array.from(oldContainer.children) as Element[];
  const newRootElements = Array.from(newContainer.children) as Element[];

  const diffResult = {
    oldRootElements,
    newRootElements,
    rootElements: [...oldRootElements, ...newRootElements], // Keep for backward compatibility
    allElements: [...allOldElements, ...allNewElements],
  };

  // Collect statistics from the diffed DOM
  const stats = collectDiffStats(diffResult.rootElements, options);

  return { diffResult, stats };
}

/**
 * Create a formatted summary of diff statistics for debugging and reporting
 *
 * @param stats - Statistics object from collectDiffStats or getCustomDiffStats
 * @returns Human-readable string summary of the changes
 */
export function formatTagStatsSummary(stats: DiffStats): string {
  return formatStatsSummary(stats);
}

/**
 * Get a simple list of which tags were changed and what attributes changed
 *
 * @param stats - Statistics object from getCustomDiffStats
 * @returns Array of objects with tag name and changed attributes
 */
export function getChangedTagsList(stats: DiffStats): Array<{
  tagName: string;
  count: number;
  changedAttributes: string[];
}> {
  return Object.entries(stats.changedTags || {}).map(([tagName, data]) => ({
    tagName,
    count: data.count,
    changedAttributes: data.changedAttributes,
  }));
}

// Default export for convenience
export default {
  compareElements,
  collectDiffStats,
  getCustomDiffStats,
  formatTagStatsSummary,
  getChangedTagsList,
  stringToFlatTree,

  // Configuration
  ConfigBuilder,
  ConfigPresets,

  // Core classes for advanced usage
  DiffEngine,
  StatsCollector,

  // Algorithm utilities
  computeLCS,
  elementSimilarity,
  tokenize,
  computeWordDiff,

  // Performance utilities
  clearCaches,
  getCacheStats,
  getPerformanceMetrics,
  resetPerformanceMetrics,
};
