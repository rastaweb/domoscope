/**
 * Core diff engine for DOM comparison
 * Implements the main comparison logic with modular architecture
 */

import type { ExtendedCompareOptions, DiffStats } from '../types/index.js';
import { computeLCS, elementSimilarity, computeWordDiff } from '../algorithms/index.js';
import {
  isRelevantNode,
  nodeKey,
  wrapElement,
  markDescendantTextNodes,
  fragmentFromTokens,
  detectAndWrapElementChange,
  replaceTextNodeWithWrapped,
  getWrapperTag,
} from '../utils/index.js';

/**
 * Core diff engine class implementing the main comparison algorithm
 */
export class DiffEngine {
  private options: ExtendedCompareOptions;

  constructor(options: ExtendedCompareOptions = {}) {
    this.options = options;
  }

  /**
   * Compare two lists of elements by pairing similar elements and recursively diffing their trees
   */
  compareElements(oldElements: Element[], newElements: Element[]): void {
    const oldPool = new Set(oldElements);
    const matchedOld = new Set<Element>();

    const watchedTags = this.options.watchedTags
      ? this.options.watchedTags.map((tag: string) => tag.toLowerCase())
      : null;

    const watchAll = watchedTags ? watchedTags.includes('*') : false;
    const watchedSet = watchedTags ? new Set(watchedTags.filter((t) => t !== '*')) : null;

    // Pair elements by similarity
    for (const newElement of newElements) {
      const candidates = Array.from(oldPool);
      let bestMatch: Element | null = null;
      let bestScore = -Infinity;

      for (const candidate of candidates) {
        let score = elementSimilarity(
          candidate,
          newElement,
          this.options.enableMemoization ?? true
        );

        // Prefer same tag matches more strongly
        if (candidate.tagName === newElement.tagName) {
          score += 2; // Increased bonus for same tag
        } else {
          score -= 1.0; // Higher penalty for tag mismatch
        }

        // Additional bonus for exact text content match
        const candidateText = (candidate.textContent || '').trim();
        const newElementText = (newElement.textContent || '').trim();
        if (candidateText && newElementText && candidateText === newElementText) {
          score += 3; // Strong bonus for exact text match
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = candidate;
        }
      }

      // Dynamic threshold based on element type and content
      let dynamicThreshold = this.options.minSimilarityThreshold ?? 0.5;

      // Lower threshold for same-tag elements to encourage matching
      if (bestMatch && bestMatch.tagName === newElement.tagName) {
        // Same tag type - be more lenient about content differences
        dynamicThreshold = Math.min(dynamicThreshold, 2.0);

        // Even more lenient for content elements that commonly change
        const contentTags = ['TD', 'TH', 'P', 'SPAN', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'];
        if (contentTags.includes(newElement.tagName)) {
          dynamicThreshold = Math.min(dynamicThreshold, 1.0);
        }
      }

      if (bestMatch && bestScore >= dynamicThreshold) {
        // Pair found - remove from pool and compare
        matchedOld.add(bestMatch);
        oldPool.delete(bestMatch);
        this.compareNode(bestMatch, newElement, watchedSet, watchAll);
      } else {
        // New element with no suitable match
        this.handleAddedElement(newElement, watchedSet, watchAll);
      }
    }

    // Handle remaining old elements (removed)
    for (const oldElement of oldPool) {
      this.handleRemovedElement(oldElement, watchedSet, watchAll);
    }
  }

  /**
   * Handle an element that was added (no match in old tree)
   */
  private handleAddedElement(
    element: Element,
    watchedSet: Set<string> | null,
    watchAll = false
  ): void {
    const tagLower = element.tagName.toLowerCase();
    const shouldWatch = watchAll || (watchedSet && watchedSet.has(tagLower));

    // ALWAYS set the data attribute for statistics tracking
    element.setAttribute('data-diff-added-tag', element.tagName.toLowerCase());

    if (shouldWatch) {
      const wrapperTag = getWrapperTag('added', this.options);
      const elementClass = this.options.elementChangeClass ?? 'diff-elem-changed';
      const changeHandler = this.options.onElementChange;

      let handlerResult: Element | null | void = undefined;
      if (changeHandler) {
        handlerResult = changeHandler(null, element, 'tag-added');
      }

      if (handlerResult instanceof Element) {
        const parent = element.parentNode;
        if (parent) {
          parent.replaceChild(handlerResult, element);
          handlerResult.appendChild(element);
        }
      } else if (handlerResult === null) {
        // User opted out of wrapping
      } else {
        // Default wrapping for added watched tag
        wrapElement(element, elementClass, wrapperTag);
      }
    }

    // Mark all text descendants as added
    markDescendantTextNodes(element, 'added', this.options);
  }

  /**
   * Handle an element that was removed (no match in new tree)
   */
  private handleRemovedElement(
    element: Element,
    watchedSet: Set<string> | null,
    watchAll = false
  ): void {
    const tagLower = element.tagName.toLowerCase();
    const shouldWatch = watchAll || (watchedSet && watchedSet.has(tagLower));

    // ALWAYS set the data attribute for statistics tracking
    element.setAttribute('data-diff-removed-tag', element.tagName.toLowerCase());

    if (shouldWatch) {
      const wrapperTag = getWrapperTag('removed', this.options);
      const removedClass = this.options.removedClass ?? 'diff-removed';
      const changeHandler = this.options.onElementChange;

      let handlerResult: Element | null | void = undefined;
      if (changeHandler) {
        handlerResult = changeHandler(element, null, 'tag-removed');
      }

      if (handlerResult instanceof Element) {
        const parent = element.parentNode;
        if (parent) {
          parent.replaceChild(handlerResult, element);
          handlerResult.appendChild(element);
        }
      } else if (handlerResult === null) {
        // User opted out of wrapping
      } else {
        // Default wrapping with removed class
        wrapElement(element, removedClass, wrapperTag);
      }
    }

    // Mark descendant text nodes as removed
    markDescendantTextNodes(element, 'removed', this.options);
  }

  /**
   * Compare two matched elements recursively
   */
  private compareNode(
    oldElement: Element,
    newElement: Element,
    watchedSet: Set<string> | null = null,
    watchAll = false
  ): void {
    // Detect and wrap element-level changes first
    detectAndWrapElementChange(oldElement, newElement, this.options);

    // Get relevant child nodes
    const oldChildren = Array.from(oldElement.childNodes).filter(isRelevantNode);
    const newChildren = Array.from(newElement.childNodes).filter(isRelevantNode);

    // Build keys for LCS alignment
    const oldKeys = oldChildren.map(nodeKey);
    const newKeys = newChildren.map(nodeKey);

    // Compute optimal alignment
    const matches = computeLCS(oldKeys, newKeys, {
      enableMemoization: this.options.enableMemoization ?? true,
      maxSize: 1000,
    });

    // Process aligned children
    let oldIndex = 0;
    let newIndex = 0;
    let matchIndex = 0;

    // Track unmatched text nodes for potential comparison
    const unmatchedOldTextNodes: { node: Text; index: number }[] = [];
    const unmatchedNewTextNodes: { node: Text; index: number }[] = [];

    while (oldIndex < oldChildren.length || newIndex < newChildren.length) {
      const match = matches[matchIndex];
      const oldMatchIndex = match ? match[0] : null;
      const newMatchIndex = match ? match[1] : null;

      // Handle unmatched old nodes (removed)
      while (oldIndex < (oldMatchIndex ?? oldChildren.length)) {
        const oldNode = oldChildren[oldIndex]!;
        if (oldNode.nodeType === Node.TEXT_NODE) {
          // Store for potential text comparison later
          unmatchedOldTextNodes.push({ node: oldNode as Text, index: oldIndex });
        } else {
          // This is a removed element - handle it properly
          this.handleRemovedElement(oldNode as Element, watchedSet, watchAll);
        }
        oldIndex++;
      }

      // Handle unmatched new nodes (added)
      while (newIndex < (newMatchIndex ?? newChildren.length)) {
        const newNode = newChildren[newIndex]!;
        if (newNode.nodeType === Node.TEXT_NODE) {
          // Store for potential text comparison later
          unmatchedNewTextNodes.push({ node: newNode as Text, index: newIndex });
        } else {
          // This is an added element - handle it properly
          this.handleAddedElement(newNode as Element, watchedSet, watchAll);
        }
        newIndex++;
      }

      // Process matched pair
      if (match) {
        const [oldMatchIdx, newMatchIdx] = match;
        const oldNode = oldChildren[oldMatchIdx]!;
        const newNode = newChildren[newMatchIdx]!;

        if (oldNode.nodeType === Node.TEXT_NODE && newNode.nodeType === Node.TEXT_NODE) {
          this.compareTextNodes(oldNode as Text, newNode as Text);
        } else if (
          oldNode.nodeType === Node.ELEMENT_NODE &&
          newNode.nodeType === Node.ELEMENT_NODE
        ) {
          // Recursively compare element children
          this.compareNode(oldNode as Element, newNode as Element, watchedSet, watchAll);
        } else {
          // Different node types - mark as removed/added
          if (oldNode.nodeType === Node.TEXT_NODE) {
            replaceTextNodeWithWrapped(oldNode as Text, 'removed', this.options);
          } else {
            markDescendantTextNodes(oldNode as Element, 'removed', this.options);
          }

          if (newNode.nodeType === Node.TEXT_NODE) {
            replaceTextNodeWithWrapped(newNode as Text, 'added', this.options);
          } else {
            markDescendantTextNodes(newNode as Element, 'added', this.options);
          }
        }

        oldIndex = oldMatchIdx + 1;
        newIndex = newMatchIdx + 1;
        matchIndex++;
      } else {
        break; // No more matches
      }
    }

    // Post-process: Try to match similar unmatched text nodes
    this.matchSimilarTextNodes(unmatchedOldTextNodes, unmatchedNewTextNodes);
  }

  /**
   * Try to match similar unmatched text nodes for comparison
   */
  private matchSimilarTextNodes(
    unmatchedOld: { node: Text; index: number }[],
    unmatchedNew: { node: Text; index: number }[]
  ): void {
    const processedOld = new Set<number>();
    const processedNew = new Set<number>();

    // Find the best matches between unmatched text nodes
    for (const oldItem of unmatchedOld) {
      if (processedOld.has(oldItem.index)) continue;

      let bestMatch: { node: Text; index: number } | null = null;
      let bestSimilarity = 0;

      for (const newItem of unmatchedNew) {
        if (processedNew.has(newItem.index)) continue;

        const oldText = (oldItem.node.textContent || '').trim();
        const newText = (newItem.node.textContent || '').trim();

        // Skip empty text nodes
        if (!oldText || !newText) continue;

        // Calculate text similarity (simple word overlap ratio)
        const similarity = this.calculateTextSimilarity(oldText, newText);

        // Use a threshold - only match if similarity is reasonable
        if (similarity > 0.3 && similarity > bestSimilarity) {
          bestMatch = newItem;
          bestSimilarity = similarity;
        }
      }

      // If we found a good match, compare the texts
      if (bestMatch && bestSimilarity > 0.3) {
        this.compareTextNodes(oldItem.node, bestMatch.node);
        processedOld.add(oldItem.index);
        processedNew.add(bestMatch.index);
      }
    }

    // Handle remaining unmatched text nodes as pure additions/removals
    for (const oldItem of unmatchedOld) {
      if (!processedOld.has(oldItem.index)) {
        replaceTextNodeWithWrapped(oldItem.node, 'removed', this.options);
      }
    }

    for (const newItem of unmatchedNew) {
      if (!processedNew.has(newItem.index)) {
        replaceTextNodeWithWrapped(newItem.node, 'added', this.options);
      }
    }
  }

  /**
   * Calculate similarity between two text strings based on word overlap
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/).filter(Boolean);
    const words2 = text2.toLowerCase().split(/\s+/).filter(Boolean);

    if (words1.length === 0 && words2.length === 0) return 1;
    if (words1.length === 0 || words2.length === 0) return 0;

    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = new Set([...set1].filter((word) => set2.has(word)));

    // Calculate Jaccard similarity
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
  }

  /**
   * Compare two text nodes using word-level diffing
   */
  private compareTextNodes(oldText: Text, newText: Text): void {
    const oldContent = oldText.textContent || '';
    const newContent = newText.textContent || '';

    // Skip diffing if texts are identical
    if (oldContent.trim() === newContent.trim()) {
      return;
    }

    const maxLength = this.options.maxTextLength ?? 10000;
    const tokens = computeWordDiff(oldContent, newContent, maxLength);

    // Create fragments for old and new views
    const oldFragment = fragmentFromTokens(tokens, 'old', this.options);
    const newFragment = fragmentFromTokens(tokens, 'new', this.options);

    // Replace original text nodes with fragments
    newText.parentNode?.replaceChild(newFragment, newText);
    oldText.parentNode?.replaceChild(oldFragment, oldText);
  }
}

/**
 * Statistics collector for analyzing diff results
 */
export class StatsCollector {
  private options: ExtendedCompareOptions;

  constructor(options: ExtendedCompareOptions = {}) {
    this.options = options;
  }

  /**
   * Collect comprehensive statistics from diffed DOM elements
   */
  collectStats(rootElements: Element[]): DiffStats {
    const stats: DiffStats = {
      totalChangedTags: 0,
      totalAddedTexts: 0,
      totalRemovedTexts: 0,
      totalAddedTags: 0,
      totalRemovedTags: 0,
      totalAddedWords: 0,
      totalRemovedWords: 0,
      addedTags: {},
      removedTags: {},
      changedTags: {},
    };

    const addedClass = this.options.addedClass ?? 'diff-added';
    const removedClass = this.options.removedClass ?? 'diff-removed';
    const elementChangeClass = this.options.elementChangeClass ?? 'diff-elem-changed';
    const attributeChangeClass = this.options.attributeChangeClass ?? 'diff-attr-changed';

    // Track counted changes to prevent double counting
    const countedChanges = new Set<string>();

    // Traverse and count changes
    const traverseAndCount = (element: Element): void => {
      const classes = element.className.split(' ');

      // Skip counting elements that are diff markup (elements created by the diff algorithm)
      // Check if element has diff classes regardless of tag type (since wrapper tags are customizable)
      const isDiffMarkup = classes.includes(addedClass) || classes.includes(removedClass);

      // Count element-level changes
      if (classes.includes(elementChangeClass) || classes.includes(attributeChangeClass)) {
        // Create unique identifier for this change
        const tagName = element.getAttribute('data-diff-tag-name') || element.tagName.toLowerCase();
        const changedAttrsStr = element.getAttribute('data-diff-changed-attrs') || '';
        const changeId = `${tagName}:${changedAttrsStr}:${element.textContent?.substring(0, 50) || ''}`;

        // Only count if we haven't seen this change before
        if (!countedChanges.has(changeId)) {
          countedChanges.add(changeId);
          stats.totalChangedTags++;

          // Collect per-tag change statistics
          if (!stats.changedTags![tagName]) {
            stats.changedTags![tagName] = { count: 0, changedAttributes: [] };
          }

          const tagStats = stats.changedTags![tagName]!;
          tagStats.count++;

          // If we have specific attribute information, use it
          if (changedAttrsStr) {
            const changedAttrs = changedAttrsStr.split(',').filter(Boolean);

            // Merge unique changed attributes
            for (const attr of changedAttrs) {
              if (!tagStats.changedAttributes.includes(attr)) {
                tagStats.changedAttributes.push(attr);
              }
            }
          } else if (classes.includes(attributeChangeClass)) {
            // For attribute changes without specific data, try to detect from the element
            // This is a fallback when data attributes aren't set properly
            tagStats.changedAttributes.push('attributes');
          }
        }
      }

      // Count text-level changes with optional whitespace filtering (only for diff markup spans)
      if (isDiffMarkup) {
        if (classes.includes(addedClass)) {
          const text = element.textContent || '';
          const isWhitespaceOnly = /^\s*$/.test(text);

          // Count text nodes (with optional whitespace filtering)
          if (!this.options.ignoreWhitespaceTexts || !isWhitespaceOnly) {
            stats.totalAddedTexts++;
          }

          // Count words in added text
          if (!isWhitespaceOnly) {
            const words = this.countWords(text);
            stats.totalAddedWords += words;
          }
        }

        if (classes.includes(removedClass)) {
          const text = element.textContent || '';
          const isWhitespaceOnly = /^\s*$/.test(text);

          // Count text nodes (with optional whitespace filtering)
          if (!this.options.ignoreWhitespaceTexts || !isWhitespaceOnly) {
            stats.totalRemovedTexts++;
          }

          // Count words in removed text
          if (!isWhitespaceOnly) {
            const words = this.countWords(text);
            stats.totalRemovedWords += words;
          }
        }
      }

      // Count added tags per tag type (only from data attributes, not diff markup)
      const addedTagName = element.getAttribute('data-diff-added-tag');
      if (addedTagName) {
        stats.totalAddedTags++;
        stats.addedTags![addedTagName] = (stats.addedTags![addedTagName] || 0) + 1;
      }

      // Count removed tags per tag type (only from data attributes, not diff markup)
      const removedTagName = element.getAttribute('data-diff-removed-tag');
      if (removedTagName) {
        stats.totalRemovedTags++;
        stats.removedTags![removedTagName] = (stats.removedTags![removedTagName] || 0) + 1;
      }

      // Count structural additions/removals (but skip diff markup spans)
      if (!isDiffMarkup) {
        if (classes.includes(addedClass) && element.children.length > 0) {
          const tagName = element.tagName.toLowerCase();
          stats.totalAddedTags++;
          stats.addedTags![tagName] = (stats.addedTags![tagName] || 0) + 1;
        }

        if (classes.includes(removedClass) && element.children.length > 0) {
          const tagName = element.tagName.toLowerCase();
          stats.totalRemovedTags++;
          stats.removedTags![tagName] = (stats.removedTags![tagName] || 0) + 1;
        }
      }

      // Recursively process children
      Array.from(element.children).forEach(traverseAndCount);
    };

    // Start traversal from all root elements
    rootElements.forEach(traverseAndCount);

    return stats;
  }

  /**
   * Count the number of words in a text string
   * Words are defined as sequences of non-whitespace characters, excluding HTML tags
   */
  private countWords(text: string): number {
    if (!text || text.trim() === '') {
      return 0;
    }

    // Clean the text: remove any HTML tags that might have slipped through
    const cleanText = text
      .replace(/<[^>]*>/g, '') // Remove any HTML tags
      .replace(/&[a-zA-Z0-9#]+;/g, ' '); // Replace HTML entities with space

    // Split by whitespace and filter out empty strings and tag-like content
    const words = cleanText
      .trim()
      .split(/\s+/)
      .filter((word) => {
        // Filter out empty strings
        if (word.length === 0) return false;

        // Filter out anything that looks like an HTML tag or entity
        if (word.match(/^<.*>$/) || word.match(/^&[a-zA-Z0-9#]+;$/)) return false;

        // Only count words that contain letters or numbers (include Unicode letters for international text)
        return word.match(/[\p{L}\p{N}]/u);
      });

    return words.length;
  }
}

/**
 * Format statistics into a human-readable summary
 */
export function formatStatsSummary(stats: DiffStats): string {
  const lines: string[] = [];

  lines.push('=== DOMOSCOPE DIFF STATISTICS ===');

  if (stats.addedTags && Object.keys(stats.addedTags).length > 0) {
    lines.push('\n🟢 Added Tags:');
    Object.entries(stats.addedTags).forEach(([tag, count]) => {
      lines.push(`  - <${tag}>: ${count} element(s)`);
    });
  }

  if (stats.removedTags && Object.keys(stats.removedTags).length > 0) {
    lines.push('\n🔴 Removed Tags:');
    Object.entries(stats.removedTags).forEach(([tag, count]) => {
      lines.push(`  - <${tag}>: ${count} element(s)`);
    });
  }

  if (stats.changedTags && Object.keys(stats.changedTags).length > 0) {
    lines.push('\n🟡 Changed Tags:');
    Object.entries(stats.changedTags).forEach(([tag, data]) => {
      lines.push(`  - <${tag}>: ${data.count} element(s)`);
      if (data.changedAttributes.length > 0) {
        lines.push(`    Changed attributes: ${data.changedAttributes.join(', ')}`);
      }
    });
  }

  lines.push(
    `\n📊 Totals: ${stats.totalAddedTags} added, ${stats.totalRemovedTags} removed, ${stats.totalChangedTags} changed`
  );
  lines.push(`📝 Text changes: ${stats.totalAddedTexts} added, ${stats.totalRemovedTexts} removed`);
  lines.push(`📖 Word changes: ${stats.totalAddedWords} added, ${stats.totalRemovedWords} removed`);

  return lines.join('\n');
}
