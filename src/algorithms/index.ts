/**
 * Optimized algorithms for DOM comparison with memoization and caching
 * Implements Dynamic Programming patterns for improved performance
 */

import type {
  LCSMatch,
  LCSConfig,
  SimilarityScore,
  MemoCache,
  PerformanceMetrics,
} from '../types/index.js';

/**
 * Memoization cache for LCS computations
 */
const lcsCache: MemoCache<string, LCSMatch[]> = new Map();

/**
 * Memoization cache for similarity scores
 */
const similarityCache: MemoCache<string, SimilarityScore> = new Map();

/**
 * Performance metrics tracking
 */
let performanceMetrics: PerformanceMetrics = {
  pairingTime: 0,
  lcsTime: 0,
  textDiffTime: 0,
  elementsProcessed: 0,
  cacheHits: 0,
  cacheMisses: 0,
};

/**
 * Cache cleanup configuration
 */
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 1000;

/**
 * Create a cache key for LCS computation
 */
function createLCSKey(a: string[], b: string[]): string {
  return `${a.join('|')}::${b.join('|')}`;
}

/**
 * Create a cache key for element similarity
 */
function createSimilarityKey(a: Element, b: Element): string {
  const aKey = `${a.tagName}:${a.id}:${Array.from(a.classList).sort().join(',')}`;
  const bKey = `${b.tagName}:${b.id}:${Array.from(b.classList).sort().join(',')}`;
  return `${aKey}::${bKey}`;
}

/**
 * Clean expired cache entries
 */
function cleanCache<K, V>(cache: MemoCache<K, V>): void {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
}

/**
 * Limit cache size by removing oldest entries
 */
function limitCacheSize<K, V>(cache: MemoCache<K, V>): void {
  if (cache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = entries.slice(0, cache.size - MAX_CACHE_SIZE + 100);
    toRemove.forEach(([key]) => cache.delete(key));
  }
}

/**
 * Get cached result or compute and cache new result
 */
function memoized<K, V>(cache: MemoCache<K, V>, key: K, computeFn: () => V, enabled = true): V {
  if (!enabled) {
    return computeFn();
  }

  const cached = cache.get(key);
  if (cached) {
    performanceMetrics.cacheHits++;
    return cached.result;
  }

  performanceMetrics.cacheMisses++;
  const result = computeFn();

  cache.set(key, {
    result,
    timestamp: Date.now(),
  });

  // Periodic cache maintenance
  if (cache.size % 100 === 0) {
    cleanCache(cache);
    limitCacheSize(cache);
  }

  return result;
}

/**
 * Optimized Longest Common Subsequence algorithm with memoization
 * Uses dynamic programming with optional space optimization for large inputs
 */
export function computeLCS(a: string[], b: string[], config: LCSConfig = {}): LCSMatch[] {
  const startTime = performance.now();

  const key = createLCSKey(a, b);

  const result = memoized(
    lcsCache,
    key,
    () => computeLCSInternal(a, b, config),
    config.enableMemoization ?? true
  );

  performanceMetrics.lcsTime += performance.now() - startTime;
  return result;
}

/**
 * Internal LCS computation with space optimization for large inputs
 */
function computeLCSInternal(a: string[], b: string[], config: LCSConfig): LCSMatch[] {
  const n = a.length;
  const m = b.length;

  // Use space-optimized version for large inputs
  if (config.maxSize && (n > config.maxSize || m > config.maxSize)) {
    return computeLCSSpaceOptimized(a, b);
  }

  // Standard DP approach for smaller inputs
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  // Fill DP table
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (a[i] === b[j]) {
        dp[i]![j] = 1 + dp[i + 1]![j + 1]!;
      } else {
        dp[i]![j] = Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
      }
    }
  }

  // Backtrack to find matches
  const matches: LCSMatch[] = [];
  let i = 0,
    j = 0;

  while (i < n && j < m) {
    if (a[i] === b[j]) {
      matches.push([i, j]);
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      i++;
    } else {
      j++;
    }
  }

  return matches;
}

/**
 * Space-optimized LCS for very large inputs
 * Uses O(min(n,m)) space instead of O(n*m)
 */
function computeLCSSpaceOptimized(a: string[], b: string[]): LCSMatch[] {
  // Ensure a is the shorter array for space optimization
  if (a.length > b.length) {
    const result = computeLCSSpaceOptimized(b, a);
    return result.map(([i, j]) => [j, i] as LCSMatch);
  }

  const n = a.length;
  const m = b.length;

  let prev = Array(n + 1).fill(0);
  let curr = Array(n + 1).fill(0);

  // Fill DP table row by row
  for (let j = m - 1; j >= 0; j--) {
    for (let i = n - 1; i >= 0; i--) {
      if (a[i] === b[j]) {
        curr[i] = 1 + prev[i + 1];
      } else {
        curr[i] = Math.max(prev[i], curr[i + 1]);
      }
    }
    [prev, curr] = [curr, prev];
  }

  // Reconstruct matches (simplified for space-optimized version)
  const matches: LCSMatch[] = [];
  let i = 0,
    j = 0;

  while (i < n && j < m) {
    if (a[i] === b[j]) {
      matches.push([i, j]);
      i++;
      j++;
    } else {
      // Simple heuristic for space-optimized version
      i++;
    }
  }

  return matches;
}

/**
 * Enhanced element similarity scoring with memoization
 * Uses multiple heuristics and caching for better performance
 */
export function elementSimilarity(
  a: Element,
  b: Element,
  enableMemoization = true
): SimilarityScore {
  const startTime = performance.now();

  const key = createSimilarityKey(a, b);

  const result = memoized(
    similarityCache,
    key,
    () => computeSimilarityScore(a, b),
    enableMemoization
  );

  performanceMetrics.pairingTime += performance.now() - startTime;
  performanceMetrics.elementsProcessed++;

  return result;
}

/**
 * Internal similarity computation with enhanced heuristics
 */
function computeSimilarityScore(a: Element, b: Element): SimilarityScore {
  let score = 0;

  // ID exact match (highest weight)
  if (a.id && b.id && a.id === b.id) {
    score += 10;
  }

  // Tag name match
  if (a.tagName === b.tagName) {
    score += 5;
  }

  // Class overlap scoring
  const aClasses = new Set(Array.from(a.classList));
  const bClasses = new Set(Array.from(b.classList));
  let classOverlap = 0;

  for (const className of aClasses) {
    if (bClasses.has(className)) {
      classOverlap++;
    }
  }

  score += classOverlap;

  // Attribute similarity
  const aAttrs = new Set(Array.from(a.attributes).map((attr) => attr.name));
  const bAttrs = new Set(Array.from(b.attributes).map((attr) => attr.name));
  let attrOverlap = 0;

  for (const attrName of aAttrs) {
    if (bAttrs.has(attrName)) {
      const aValue = a.getAttribute(attrName);
      const bValue = b.getAttribute(attrName);
      if (aValue === bValue) {
        attrOverlap += 2; // Exact value match
      } else {
        attrOverlap += 0.5; // Attribute name match
      }
    }
  }

  score += attrOverlap * 0.5;

  // Text content similarity (enhanced for better matching)
  const aText = (a.textContent || '').trim();
  const bText = (b.textContent || '').trim();

  if (aText && bText) {
    if (aText === bText) {
      score += 5; // Strong bonus for exact text match
    } else {
      // Enhanced text similarity for partial matches
      const aTokens = new Set(tokenizeForSimilarity(aText));
      const bTokens = new Set(tokenizeForSimilarity(bText));
      let textOverlap = 0;
      const totalTokens = Math.max(aTokens.size, bTokens.size);

      for (const token of aTokens) {
        if (bTokens.has(token)) {
          textOverlap++;
        }
      }

      // Calculate overlap percentage and give significant score for partial matches
      const overlapRatio = totalTokens > 0 ? textOverlap / totalTokens : 0;

      if (overlapRatio >= 0.5) {
        // If 50%+ of words match, give substantial similarity score
        score += 3 + overlapRatio * 2;
      } else if (overlapRatio > 0) {
        // Some overlap, give partial score
        score += textOverlap * 0.5;
      }
    }
  } else if (!aText && !bText) {
    // Both empty, that's a perfect match for text content
    score += 2;
  }

  // Structural similarity (number of children)
  const aChildCount = a.children.length;
  const bChildCount = b.children.length;

  if (aChildCount === bChildCount && aChildCount > 0) {
    score += 1;
  } else if (aChildCount > 0 && bChildCount > 0) {
    const childRatio = Math.min(aChildCount, bChildCount) / Math.max(aChildCount, bChildCount);
    score += childRatio * 0.5;
  }

  return score;
}

/**
 * Simple tokenization for similarity scoring
 */
function tokenizeForSimilarity(text: string): string[] {
  return text.toLowerCase().match(/\w+/g) || [];
}

/**
 * Enhanced tokenization with better Unicode support
 */
export function tokenize(text: string): string[] {
  if (!text) return [];

  // Enhanced regex for better international text support
  const tokens = text.match(/\p{L}+\p{M}*|\d+|[^\s\p{L}\p{N}]+/gu);

  if (!tokens) return [];

  return tokens.map((token) => token.trim()).filter(Boolean);
}

/**
 * Optimized word-level diff with performance enhancements
 */
export function computeWordDiff(
  oldText: string,
  newText: string,
  maxLength = 10000
): Array<{ type: 'equal' | 'added' | 'removed'; text: string }> {
  const startTime = performance.now();

  // Skip expensive word diffing for very long texts
  if (oldText.length > maxLength || newText.length > maxLength) {
    const result = [
      { type: 'removed' as const, text: oldText },
      { type: 'added' as const, text: newText },
    ];
    performanceMetrics.textDiffTime += performance.now() - startTime;
    return result;
  }

  const a = tokenize(oldText);
  const b = tokenize(newText);

  const matches = computeLCS(a, b, { enableMemoization: true, maxSize: 1000 });

  const tokens: Array<{ type: 'equal' | 'added' | 'removed'; text: string }> = [];
  let i = 0,
    j = 0,
    matchIndex = 0;

  while (i < a.length || j < b.length) {
    const match = matches[matchIndex];
    const nextMatchI = match ? match[0] : a.length;
    const nextMatchJ = match ? match[1] : b.length;

    // Process unmatched tokens
    while (i < nextMatchI) {
      tokens.push({ type: 'removed', text: a[i++]! });
    }
    while (j < nextMatchJ) {
      tokens.push({ type: 'added', text: b[j++]! });
    }

    // Process matched token
    if (match) {
      tokens.push({ type: 'equal', text: a[i]! });
      i++;
      j++;
      matchIndex++;
    }
  }

  // Merge consecutive tokens of the same type
  const merged = [];
  for (const token of tokens) {
    const last = merged[merged.length - 1];
    if (last && last.type === token.type) {
      last.text += ' ' + token.text;
    } else {
      merged.push({ ...token });
    }
  }

  performanceMetrics.textDiffTime += performance.now() - startTime;
  return merged;
}

/**
 * Clear all caches
 */
export function clearCaches(): void {
  lcsCache.clear();
  similarityCache.clear();
  resetPerformanceMetrics();
}

/**
 * Get current cache statistics
 */
export function getCacheStats() {
  return {
    lcsCache: {
      size: lcsCache.size,
      entries: lcsCache.size,
    },
    similarityCache: {
      size: similarityCache.size,
      entries: similarityCache.size,
    },
  };
}

/**
 * Get performance metrics
 */
export function getPerformanceMetrics(): PerformanceMetrics {
  return { ...performanceMetrics };
}

/**
 * Reset performance metrics
 */
export function resetPerformanceMetrics(): void {
  performanceMetrics = {
    pairingTime: 0,
    lcsTime: 0,
    textDiffTime: 0,
    elementsProcessed: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };
}

/**
 * Configure cache settings
 */
export function configureCaching(options: { ttl?: number; maxSize?: number; enabled?: boolean }) {
  if (options.ttl !== undefined) {
    // Update TTL (would need to be implemented in cache cleanup)
  }
  if (options.maxSize !== undefined) {
    // Update max size (would need to be implemented in size limiting)
  }
  if (options.enabled === false) {
    clearCaches();
  }
}
