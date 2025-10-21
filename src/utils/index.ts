/**
 * DOM manipulation utilities for diff operations
 * Focused on preserving DOM structure while adding annotations
 */

import type { CompareOptions, MarkingMode, TokenTarget, Token } from '../types/index.js';

/**
 * Check if a node is relevant for diff processing
 */
export function isRelevantNode(node: Node): boolean {
  return node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE;
}

/**
 * Generate a key for node identification in LCS algorithm
 */
export function nodeKey(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.textContent || '').trim();
    return `T:${text}`;
  }

  const element = node as Element;
  const tagName = element.tagName;

  // For structural elements like table, thead, tbody, tr - use only tag name
  // to allow content changes within them
  const structuralTags = ['TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'UL', 'OL', 'DIV'];
  if (structuralTags.includes(tagName)) {
    return `E:${tagName}`;
  }

  // For heading elements, use only tag name to allow content changes
  const headingTags = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'];
  if (headingTags.includes(tagName)) {
    return `E:${tagName}`;
  }

  // For content elements, use a more flexible approach
  const textContent = (element.textContent || '').trim();

  // For very short content (1-2 words), include full content for precise matching
  const words = textContent.split(/\s+/).filter((w) => w.length > 0);
  if (words.length <= 2) {
    return `E:${tagName}:${textContent}`;
  }

  // For longer content, use tag + first word to allow partial content matching
  // This helps match elements like <td>Rezaei</td> with <td>Rezaei hastam</td>
  const firstWord = words[0] || '';
  return `E:${tagName}:${firstWord}`;
} /**
 * Wrap an element with a wrapper element containing the specified class
 * Preserves element hierarchy and relationships
 */
export function wrapElement(
  element: Element,
  className: string | undefined,
  wrapperTag = 'span'
): void {
  const parent = element.parentNode;
  if (!parent) return; // Element is detached

  const wrapper = document.createElement(wrapperTag);
  if (className) {
    wrapper.className = className;
  }

  parent.replaceChild(wrapper, element);
  wrapper.appendChild(element);
}

/**
 * Wrap an element with a wrapper element and return the wrapper
 * Used when we need to set additional attributes on the wrapper
 */
export function wrapElementWithData(
  element: Element,
  className: string | undefined,
  wrapperTag = 'span'
): Element | null {
  const parent = element.parentNode;
  if (!parent) return null; // Element is detached

  const wrapper = document.createElement(wrapperTag);
  if (className) {
    wrapper.className = className;
  }

  parent.replaceChild(wrapper, element);
  wrapper.appendChild(element);
  return wrapper;
}

/**
 * Replace a text node with a wrapped version containing diff styling
 */
export function replaceTextNodeWithWrapped(
  textNode: Text,
  mode: MarkingMode,
  options: CompareOptions
): void {
  const className =
    mode === 'added'
      ? (options.addedClass ?? 'diff-added')
      : (options.removedClass ?? 'diff-removed');

  const fragment = document.createDocumentFragment();
  const span = document.createElement('span');

  span.className = className;
  span.textContent = ` ${textNode.textContent ?? ''} `;
  fragment.appendChild(span);

  textNode.parentNode?.replaceChild(fragment, textNode);
}

/**
 * Traverse an element and mark all descendant text nodes with the specified mode
 * Uses TreeWalker for efficient traversal
 */
export function markDescendantTextNodes(
  element: Element,
  mode: MarkingMode,
  options: CompareOptions
): void {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);

  const textNodes: Text[] = [];
  let currentNode = walker.nextNode();

  while (currentNode) {
    textNodes.push(currentNode as Text);
    currentNode = walker.nextNode();
  }

  // Process from last to first to avoid invalidating tree walker paths
  for (let i = textNodes.length - 1; i >= 0; i--) {
    const textNode = textNodes[i];
    if (textNode) {
      replaceTextNodeWithWrapped(textNode, mode, options);
    }
  }
}

/**
 * Create a DocumentFragment from diff tokens for a specific target view
 * 'old' view shows equal + removed tokens, 'new' view shows equal + added tokens
 */
export function fragmentFromTokens(
  tokens: Token[],
  target: TokenTarget,
  options: CompareOptions
): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const addedClass = options.addedClass ?? 'diff-added';
  const removedClass = options.removedClass ?? 'diff-removed';

  let isFirst = true;

  for (const token of tokens) {
    if (token.type === 'equal') {
      appendTextNode(fragment, token.text, isFirst);
    } else if (token.type === 'added' && target === 'new') {
      const span = document.createElement('span');
      span.className = addedClass;
      span.textContent = ` ${token.text} `;
      fragment.appendChild(span);
    } else if (token.type === 'removed' && target === 'old') {
      const span = document.createElement('span');
      span.className = removedClass;
      span.textContent = ` ${token.text} `;
      fragment.appendChild(span);
    }
    isFirst = false;
  }

  // Ensure fragment has at least an empty text node for consistent structure
  if (!fragment.firstChild) {
    fragment.appendChild(document.createTextNode(''));
  }

  return fragment;
}

/**
 * Append a text node to a fragment with proper spacing
 */
export function appendTextNode(fragment: DocumentFragment, text: string, _isFirst: boolean): void {
  fragment.appendChild(document.createTextNode(text));
}

/**
 * Get all changed attributes between two elements
 * Respects tracking configuration to filter relevant changes
 */
export function getChangedAttributes(
  elementA: Element,
  elementB: Element,
  options: CompareOptions = {}
): string[] {
  const changed = new Set<string>();

  // Build attribute maps
  const attrsA = new Map<string, string | null>();
  for (let i = 0; i < elementA.attributes.length; i++) {
    const attr = elementA.attributes[i]!;
    attrsA.set(attr.name, attr.value);
  }

  const attrsB = new Map<string, string | null>();
  for (let i = 0; i < elementB.attributes.length; i++) {
    const attr = elementB.attributes[i]!;
    attrsB.set(attr.name, attr.value);
  }

  // Find differences
  for (const [name, value] of attrsA) {
    if (!attrsB.has(name) || attrsB.get(name) !== value) {
      changed.add(name);
    }
  }

  for (const name of attrsB.keys()) {
    if (!attrsA.has(name)) {
      changed.add(name);
    }
  }

  const allChanged = Array.from(changed);

  // Apply tracking filters
  return applyTrackingFilters(allChanged, elementA.tagName.toLowerCase(), options);
}

/**
 * Apply tracking configuration filters to attribute changes
 */
function applyTrackingFilters(
  changedAttributes: string[],
  tagName: string,
  options: CompareOptions
): string[] {
  // Apply tag-specific tracking if available
  if (options.trackedTags) {
    if (Array.isArray(options.trackedTags)) {
      // Array form: if tag is not in the list, no attributes count as changed
      if (!options.trackedTags.map((tag) => tag.toLowerCase()).includes(tagName)) {
        return [];
      }
    } else {
      // Record form: check for tag-specific attribute filters
      const tagRule = options.trackedTags[tagName];
      if (tagRule !== undefined) {
        if (Array.isArray(tagRule)) {
          // Only these specific attributes for this tag
          return changedAttributes.filter((attr) => tagRule.includes(attr));
        }
      } else {
        // Tag not in trackedTags record, check for wildcard "*"
        const wildcardRule = options.trackedTags['*'];
        if (wildcardRule && Array.isArray(wildcardRule)) {
          return changedAttributes.filter((attr) => wildcardRule.includes(attr));
        } else if (!wildcardRule) {
          // No rule for this tag and no wildcard, don't track changes
          return [];
        }
      }
    }
  }

  // Apply global attribute filter if provided
  if (options.trackedAttributes) {
    return changedAttributes.filter((attr) => options.trackedAttributes!.includes(attr));
  }

  return changedAttributes;
}

/**
 * Detect and wrap element-level changes (tag name or attributes)
 * Respects tracking configuration and custom change handlers
 */
export function detectAndWrapElementChange(
  oldElement: Element,
  newElement: Element,
  options: CompareOptions
): void {
  const wrapperTag = options.wrapperTag ?? 'span';
  const elementClass = options.elementChangeClass ?? 'diff-elem-changed';
  const attributeClass = options.attributeChangeClass ?? 'diff-attr-changed';

  const tagChanged = oldElement.tagName !== newElement.tagName;
  const changedAttrs = getChangedAttributes(oldElement, newElement, options);
  const attributesChanged = changedAttrs.length > 0;

  const changeHandler = options.onElementChange;

  if (tagChanged) {
    const changeType = 'tag' as const;
    let handlerResult: Element | null | void = undefined;

    if (changeHandler) {
      handlerResult = changeHandler(oldElement, newElement, changeType);
    }

    // Always store tag change data for statistics collection
    const oldTagName = oldElement.tagName.toLowerCase();
    const newTagName = newElement.tagName.toLowerCase();
    oldElement.setAttribute('data-diff-tag-name', oldTagName);
    newElement.setAttribute('data-diff-tag-name', newTagName);
    oldElement.setAttribute('data-diff-changed-attrs', 'tagName');
    newElement.setAttribute('data-diff-changed-attrs', 'tagName');

    if (handlerResult instanceof Element) {
      // Use custom wrapper element
      wrapWithCustomElement(oldElement, handlerResult);
      wrapWithCustomElement(newElement, handlerResult.cloneNode(true) as Element);
    } else if (handlerResult === null) {
      // User opted out of wrapping
    } else {
      // Default wrapping for tag changes
      const oldWrapper = wrapElementWithData(
        oldElement,
        `${elementClass} diff-tag-changed`,
        wrapperTag
      );
      const newWrapper = wrapElementWithData(
        newElement,
        `${elementClass} diff-tag-changed`,
        wrapperTag
      );

      // Copy data attributes to wrapper for statistics collection
      if (oldWrapper) {
        const tagName = oldElement.getAttribute('data-diff-tag-name');
        const changedAttrs = oldElement.getAttribute('data-diff-changed-attrs');
        if (tagName) oldWrapper.setAttribute('data-diff-tag-name', tagName);
        if (changedAttrs) oldWrapper.setAttribute('data-diff-changed-attrs', changedAttrs);
      }

      if (newWrapper) {
        const tagName = newElement.getAttribute('data-diff-tag-name');
        const changedAttrs = newElement.getAttribute('data-diff-changed-attrs');
        if (tagName) newWrapper.setAttribute('data-diff-tag-name', tagName);
        if (changedAttrs) newWrapper.setAttribute('data-diff-changed-attrs', changedAttrs);
      }
    }
  } else if (attributesChanged) {
    const changeType = 'attribute' as const;
    let handlerResult: Element | null | void = undefined;

    if (changeHandler) {
      handlerResult = changeHandler(oldElement, newElement, changeType, changedAttrs);
    }

    // Always store changed attributes data for statistics collection (regardless of wrapping)
    if (changedAttrs.length > 0) {
      const tagName = oldElement.tagName.toLowerCase();
      oldElement.setAttribute('data-diff-changed-attrs', changedAttrs.join(','));
      oldElement.setAttribute('data-diff-tag-name', tagName);
      newElement.setAttribute('data-diff-changed-attrs', changedAttrs.join(','));
      newElement.setAttribute('data-diff-tag-name', tagName);
    }

    if (handlerResult instanceof Element) {
      // Use custom wrapper element
      wrapWithCustomElement(oldElement, handlerResult);
      wrapWithCustomElement(newElement, handlerResult.cloneNode(true) as Element);
    } else if (handlerResult === null) {
      // User opted out of wrapping
    } else {
      // Default wrapping for attribute changes
      const oldWrapper = wrapElementWithData(oldElement, attributeClass, wrapperTag);
      const newWrapper = wrapElementWithData(newElement, attributeClass, wrapperTag);

      // Copy data attributes to wrapper for statistics collection
      if (oldWrapper) {
        const tagName = oldElement.getAttribute('data-diff-tag-name');
        const changedAttrs = oldElement.getAttribute('data-diff-changed-attrs');
        if (tagName) oldWrapper.setAttribute('data-diff-tag-name', tagName);
        if (changedAttrs) oldWrapper.setAttribute('data-diff-changed-attrs', changedAttrs);
      }

      if (newWrapper) {
        const tagName = newElement.getAttribute('data-diff-tag-name');
        const changedAttrs = newElement.getAttribute('data-diff-changed-attrs');
        if (tagName) newWrapper.setAttribute('data-diff-tag-name', tagName);
        if (changedAttrs) newWrapper.setAttribute('data-diff-changed-attrs', changedAttrs);
      }
    }
  }
}

/**
 * Wrap an element with a custom wrapper element
 */
function wrapWithCustomElement(element: Element, wrapper: Element): void {
  const parent = element.parentNode;
  if (!parent) return;

  parent.replaceChild(wrapper, element);
  wrapper.appendChild(element);
}

/**
 * Parse HTML string into a structured tree representation
 */
export function stringToFlatTree(html: string): {
  rootElements: Element[];
  allElements: Element[];
} {
  const container = document.createElement('div');
  container.innerHTML = html.trim();

  const allElements: Element[] = [];
  const rootElements = Array.from(container.children) as Element[];

  function traverse(element: Element): void {
    allElements.push(element);
    Array.from(element.children).forEach(traverse);
  }

  rootElements.forEach(traverse);

  return { rootElements, allElements };
}

/**
 * Validate HTML string for parsing
 */
export function validateHTML(html: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (typeof html !== 'string') {
    errors.push('HTML must be a string');
    return { isValid: false, errors };
  }

  if (html.trim().length === 0) {
    errors.push('HTML cannot be empty');
    return { isValid: false, errors };
  }

  try {
    const container = document.createElement('div');
    container.innerHTML = html;

    // Basic validation - check if parsing succeeded
    if (container.children.length === 0 && html.trim().indexOf('<') !== -1) {
      errors.push('HTML parsing failed - no valid elements found');
    }
  } catch (error) {
    errors.push(`HTML parsing error: ${error}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
