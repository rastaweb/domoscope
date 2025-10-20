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

    const watchedSet = this.options.watchedTags
      ? new Set(this.options.watchedTags.map((tag: string) => tag.toLowerCase()))
      : null;

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

        // Prefer same tag matches
        if (candidate.tagName === newElement.tagName) {
          score += 1;
        } else {
          score -= 0.2; // Slight penalty for tag mismatch
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = candidate;
        }
      }

      const minThreshold = this.options.minSimilarityThreshold ?? 0;

      if (bestMatch && bestScore >= minThreshold) {
        // Pair found - remove from pool and compare
        matchedOld.add(bestMatch);
        oldPool.delete(bestMatch);
        this.compareNode(bestMatch, newElement);
      } else {
        // New element with no suitable match
        this.handleAddedElement(newElement, watchedSet);
      }
    }

    // Handle remaining old elements (removed)
    for (const oldElement of oldPool) {
      this.handleRemovedElement(oldElement, watchedSet);
    }
  }

  /**
   * Handle an element that was added (no match in old tree)
   */
  private handleAddedElement(element: Element, watchedSet: Set<string> | null): void {
    const tagLower = element.tagName.toLowerCase();

    if (watchedSet && watchedSet.has(tagLower)) {
      const wrapperTag = this.options.wrapperTag ?? 'span';
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
    } else {
      // Mark all text descendants as added
      markDescendantTextNodes(element, 'added', this.options);
      // Store tag info for statistics
      element.setAttribute('data-diff-added-tag', element.tagName.toLowerCase());
    }
  }

  /**
   * Handle an element that was removed (no match in new tree)
   */
  private handleRemovedElement(element: Element, watchedSet: Set<string> | null): void {
    const tagLower = element.tagName.toLowerCase();

    if (watchedSet && watchedSet.has(tagLower)) {
      const wrapperTag = this.options.wrapperTag ?? 'span';
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

      // Mark descendant text nodes as removed
      markDescendantTextNodes(element, 'removed', this.options);
    } else {
      markDescendantTextNodes(element, 'removed', this.options);
      // Store tag info for statistics
      element.setAttribute('data-diff-removed-tag', element.tagName.toLowerCase());
    }
  }

  /**
   * Compare two matched elements recursively
   */
  private compareNode(oldElement: Element, newElement: Element): void {
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

    while (oldIndex < oldChildren.length || newIndex < newChildren.length) {
      const match = matches[matchIndex];
      const oldMatchIndex = match ? match[0] : null;
      const newMatchIndex = match ? match[1] : null;

      // Handle unmatched old nodes (removed)
      while (oldIndex < (oldMatchIndex ?? oldChildren.length)) {
        const oldNode = oldChildren[oldIndex++]!;
        if (oldNode.nodeType === Node.TEXT_NODE) {
          replaceTextNodeWithWrapped(oldNode as Text, 'removed', this.options);
        } else {
          markDescendantTextNodes(oldNode as Element, 'removed', this.options);
        }
      }

      // Handle unmatched new nodes (added)
      while (newIndex < (newMatchIndex ?? newChildren.length)) {
        const newNode = newChildren[newIndex++]!;
        if (newNode.nodeType === Node.TEXT_NODE) {
          replaceTextNodeWithWrapped(newNode as Text, 'added', this.options);
        } else {
          markDescendantTextNodes(newNode as Element, 'added', this.options);
        }
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
          this.compareNode(oldNode as Element, newNode as Element);
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
      addedTags: {},
      removedTags: {},
      changedTags: {},
    };

    const addedClass = this.options.addedClass ?? 'diff-added';
    const removedClass = this.options.removedClass ?? 'diff-removed';
    const elementChangeClass = this.options.elementChangeClass ?? 'diff-elem-changed';
    const attributeChangeClass = this.options.attributeChangeClass ?? 'diff-attr-changed';

    // Traverse and count changes
    const traverseAndCount = (element: Element): void => {
      const classes = element.className.split(' ');

      // Count element-level changes
      if (classes.includes(elementChangeClass) || classes.includes(attributeChangeClass)) {
        stats.totalChangedTags++;

        // Collect per-tag change statistics
        const tagName = element.getAttribute('data-diff-tag-name') || element.tagName.toLowerCase();
        const changedAttrsStr = element.getAttribute('data-diff-changed-attrs');

        if (changedAttrsStr) {
          const changedAttrs = changedAttrsStr.split(',').filter(Boolean);

          if (!stats.changedTags![tagName]) {
            stats.changedTags![tagName] = { count: 0, changedAttributes: [] };
          }

          const tagStats = stats.changedTags![tagName]!;
          tagStats.count++;

          // Merge unique changed attributes
          for (const attr of changedAttrs) {
            if (!tagStats.changedAttributes.includes(attr)) {
              tagStats.changedAttributes.push(attr);
            }
          }
        }
      }

      // Count text-level changes
      if (classes.includes(addedClass)) {
        stats.totalAddedTexts++;
      }
      if (classes.includes(removedClass)) {
        stats.totalRemovedTexts++;
      }

      // Count added tags per tag type
      const addedTagName = element.getAttribute('data-diff-added-tag');
      if (addedTagName) {
        stats.totalAddedTags++;
        stats.addedTags![addedTagName] = (stats.addedTags![addedTagName] || 0) + 1;
      }

      // Count removed tags per tag type
      const removedTagName = element.getAttribute('data-diff-removed-tag');
      if (removedTagName) {
        stats.totalRemovedTags++;
        stats.removedTags![removedTagName] = (stats.removedTags![removedTagName] || 0) + 1;
      }

      // Count structural additions/removals
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

      // Recursively process children
      Array.from(element.children).forEach(traverseAndCount);
    };

    // Start traversal from all root elements
    rootElements.forEach(traverseAndCount);

    return stats;
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

  return lines.join('\n');
}
