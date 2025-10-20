export function stringToFlatTree(html: string): {
  rootElements: Element[];
  allElements: Element[];
} {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html.trim();

  const allElements: Element[] = [];
  const rootElements = Array.from(wrapper.children);

  function traverse(node: Element) {
    allElements.push(node);
    Array.from(node.children).forEach(traverse);
  }

  rootElements.forEach(traverse);

  return { rootElements, allElements };
}
export type TokenType = 'equal' | 'added' | 'removed';

export type Token = {
  type: TokenType;
  text: string;
};

// NEW FEATURE: diff stats
export type DiffStats = {
  totalChangedTags: number; // elements with tag or attribute changes
  totalAddedTexts: number; // added text spans/nodes
  totalRemovedTexts: number; // removed text spans/nodes
  totalAddedTags: number; // newly added elements
  totalRemovedTags: number; // removed elements

  // NEW FEATURE: Per-tag statistics tracking
  addedTags?: Record<string, number>; // e.g. { a: 5, img: 2 }
  removedTags?: Record<string, number>; // e.g. { a: 2, span: 10 }
  changedTags?: Record<string, { count: number; changedAttributes: string[] }>; // e.g. { img: { count: 3, changedAttributes: ["src", "alt"] } }
};

export type CompareOptions = {
  // No inline HTML; user can map classes if desired. Keep for extension.
  addedClass?: string; // default: "diff-added"
  removedClass?: string; // default: "diff-removed"

  // element/attribute change behavior
  elementChangeClass?: string; // wrapper class for tag changes (default: "diff-elem-changed")
  attributeChangeClass?: string; // wrapper class for attribute-only changes (default: "diff-attr-changed")
  wrapperTag?: string; // wrapper tag to use (default: "span")

  // Optional callback to let consumers control how element-level changes are wrapped.
  // Called right before the default wrapping would occur. Return a custom Element
  // to be used as the wrapper (it will be used for both old/new sides; the returned
  // element will be cloned for the second insertion). Return null to skip wrapping.
  // changeType can be "tag" | "attribute" | "tag-added" | "tag-removed".
  onElementChange?: (
    oldEl: Element | null,
    newEl: Element | null,
    changeType: 'tag' | 'attribute' | 'tag-added' | 'tag-removed',
    changedAttrs?: string[]
  ) => void | Element | null;

  // New: tags to watch specifically for added/removed events (case-insensitive)
  watchedTags?: string[]; // e.g. ["img", "video", "iframe"]

  // NEW FEATURE: Advanced diff statistics and configurable tracking
  // Specify which tags and their attributes to track for change detection
  trackedTags?: string[] | Record<string, string[]>; // e.g. { a: ["href", "class"], img: ["src"] } or ["a", "img"]

  // If provided, only consider these attributes when detecting attribute changes (global filter)
  trackedAttributes?: string[]; // e.g. ["href", "src", "class"]
};

/* -------------------------
   Public entry
   ------------------------- */

/**
 * Compare two lists of Elements by attempting to pair similar elements,
 * then recursively diff their child trees. This never writes innerHTML;
 * it only replaces/restructures TEXT_NODEs (and inserts <span> wrappers
 * with classes) to indicate additions/removals. All element nodes and
 * attributes are preserved.
 *
 * NOTE: pairing now may match across different tagNames if elementSimilarity
 * deems them similar; when tagName or attributes differ the matched elements
 * can be wrapped so the caller can style/tag-level changes.
 */
export function compareElements(
  oldEls: Element[],
  newEls: Element[],
  options: CompareOptions = {}
) {
  const oldPool = new Set(oldEls);
  const matchedOld = new Set<Element>();

  const watchedSet = options.watchedTags
    ? new Set(options.watchedTags.map((t) => t.toLowerCase()))
    : null;

  // pairing by best similarity among remaining candidates (allow cross-tag pairing
  // when similarity is high). Same-tag matches get a small bonus.
  for (const newEl of newEls) {
    const candidates = Array.from(oldPool);
    let best: Element | null = null;
    let bestScore = -Infinity;
    for (const c of candidates) {
      let s = elementSimilarity(c, newEl);
      if (c.tagName === newEl.tagName)
        s += 1; // prefer same tag
      else s -= 0.2; // slight penalty for tag mismatch
      if (s > bestScore) {
        bestScore = s;
        best = c;
      }
    }
    if (best && bestScore >= 0) {
      // pair and remove from pool
      matchedOld.add(best);
      oldPool.delete(best);
      compareNode(best, newEl, options);
    } else {
      // new element (no similar old candidate)
      // Check watched tags: if this tag is watched treat as a "tag-added" event and wrap/call callback.
      const tagLower = newEl.tagName.toLowerCase();
      if (watchedSet && watchedSet.has(tagLower)) {
        const wrapperTag = options.wrapperTag ?? 'span';
        const elemClass = options.elementChangeClass ?? 'diff-elem-changed';
        const cb = options.onElementChange;
        let cbResult: Element | null | void = undefined;
        if (cb) cbResult = cb(null, newEl, 'tag-added');
        if (cbResult instanceof Element) {
          const parentNew = newEl.parentNode;
          if (parentNew) {
            parentNew.replaceChild(cbResult, newEl);
            cbResult.appendChild(newEl);
          }
        } else if (cbResult === null) {
          // user opted out of wrapping; do nothing
        } else {
          // default wrapping for added watched tag (wrap the element itself; do not mark children)
          wrapElement(newEl, elemClass, wrapperTag);
        }
      } else {
        // mark all text descendants as added
        markDescendantTextNodes(newEl, 'added', options);
        // NEW FEATURE: Store tag info for statistics
        newEl.setAttribute('data-diff-added-tag', newEl.tagName.toLowerCase());
      }
    }
  }

  // remaining old elements are considered removed
  for (const oldEl of oldPool) {
    // If this old element is a watched tag, wrap it first (caller may want to style the removed tag)
    const tagLower = oldEl.tagName.toLowerCase();
    if (watchedSet && watchedSet.has(tagLower)) {
      const wrapperTag = options.wrapperTag ?? 'span';
      // For removals we use removedClass per spec (or fallback to diff-removed)
      const removedCls = options.removedClass ?? 'diff-removed';
      const cb = options.onElementChange;
      let cbResult: Element | null | void = undefined;
      if (cb) cbResult = cb(oldEl, null, 'tag-removed');
      if (cbResult instanceof Element) {
        const parentOld = oldEl.parentNode;
        if (parentOld) {
          parentOld.replaceChild(cbResult, oldEl);
          cbResult.appendChild(oldEl);
        }
      } else if (cbResult === null) {
        // user opted out of wrapping; proceed to mark texts removed
      } else {
        // default wrapping with removedClass
        wrapElement(oldEl, removedCls, wrapperTag);
      }
      // After wrapping the element itself, mark descendant text nodes removed
      markDescendantTextNodes(oldEl, 'removed', options);
    } else {
      markDescendantTextNodes(oldEl, 'removed', options);
      // NEW FEATURE: Store tag info for statistics
      oldEl.setAttribute('data-diff-removed-tag', oldEl.tagName.toLowerCase());
    }
  }
}

/* -------------------------
   Recursive tree diff
   ------------------------- */

/**
 * Compare two Element trees in-place. Only text nodes are modified;
 * element structure and attributes are preserved. Child node alignment
 * uses a simple LCS on node "kinds" (text vs element with tag) so text
 * nodes align to text nodes and element nodes to elements of the same tag.
 *
 * Additionally detects tagName and attribute-level changes and wraps
 * the affected elements (old/new) so callers can style or mark the tag-level changes.
 */
function compareNode(oldEl: Element, newEl: Element, options: CompareOptions) {
  // detect and wrap element-level changes (tag/attributes) BEFORE recursing
  detectAndWrapElementChange(oldEl, newEl, options);

  const oldChildren = Array.from(oldEl.childNodes).filter(isRelevantNode);
  const newChildren = Array.from(newEl.childNodes).filter(isRelevantNode);

  // build keys so LCS aligns text <-> text and element<tag> <-> element<tag>
  const oldKeys = oldChildren.map(nodeKey);
  const newKeys = newChildren.map(nodeKey);

  const lcs = computeLCS(oldKeys, newKeys);

  let oi = 0;
  let ni = 0;
  let li = 0;

  while (oi < oldChildren.length || ni < newChildren.length) {
    const match = lcs[li];
    const oldMatchIndex = match ? match[0] : null;
    const newMatchIndex = match ? match[1] : null;

    // handle runs of unmatched nodes before the next match
    while (oi < (oldMatchIndex ?? oldChildren.length)) {
      // old-only => removed
      const oldNode = oldChildren[oi++];
      if (oldNode.nodeType === Node.TEXT_NODE) {
        replaceTextNodeWithWrapped(oldNode as Text, 'removed', options);
      } else {
        // element node wholly removed => mark its descendant text nodes removed
        markDescendantTextNodes(oldNode as Element, 'removed', options);
      }
    }
    while (ni < (newMatchIndex ?? newChildren.length)) {
      // new-only => added
      const newNode = newChildren[ni++];
      if (newNode.nodeType === Node.TEXT_NODE) {
        replaceTextNodeWithWrapped(newNode as Text, 'added', options);
      } else {
        markDescendantTextNodes(newNode as Element, 'added', options);
      }
    }

    // if there's a match, process it
    if (match) {
      const [oiMatch, niMatch] = match;
      const oldNode = oldChildren[oiMatch];
      const newNode = newChildren[niMatch];

      if (oldNode.nodeType === Node.TEXT_NODE && newNode.nodeType === Node.TEXT_NODE) {
        // word-level diff and replace each text node with fragments:
        const oldText = oldNode.textContent || '';
        const newText = newNode.textContent || '';
        if (oldText.trim() === newText.trim()) {
          // identical text -> leave both text nodes alone
        } else {
          const tokens = computeWordDiff(oldText, newText);
          const newFrag = fragmentFromTokens(tokens, 'new', options);
          const oldFrag = fragmentFromTokens(tokens, 'old', options);
          newNode.parentNode?.replaceChild(newFrag, newNode);
          oldNode.parentNode?.replaceChild(oldFrag, oldNode);
        }
      } else if (oldNode.nodeType === Node.ELEMENT_NODE && newNode.nodeType === Node.ELEMENT_NODE) {
        // both elements - even if tagName differs we've potentially wrapped above -
        // recurse into children to handle inner diffs
        compareNode(oldNode as Element, newNode as Element, options);
      } else {
        // different kinds but matched by key - as a fallback mark old removed, new added
        if (oldNode.nodeType === Node.TEXT_NODE) {
          replaceTextNodeWithWrapped(oldNode as Text, 'removed', options);
        } else {
          markDescendantTextNodes(oldNode as Element, 'removed', options);
        }
        if (newNode.nodeType === Node.TEXT_NODE) {
          replaceTextNodeWithWrapped(newNode as Text, 'added', options);
        } else {
          markDescendantTextNodes(newNode as Element, 'added', options);
        }
      }
      oi = oiMatch + 1;
      ni = niMatch + 1;
      li++;
    } else {
      // no more matches; the while loops above will drain remaining nodes
      break;
    }
  }
}

/* -------------------------
   Utilities: node handling
   ------------------------- */

function isRelevantNode(n: Node) {
  return n.nodeType === Node.TEXT_NODE || n.nodeType === Node.ELEMENT_NODE;
}

function nodeKey(n: Node) {
  if (n.nodeType === Node.TEXT_NODE) return 'T';
  return 'E:' + (n as Element).tagName;
}

/**
 * Replace a single text node with a fragment that wraps the whole text
 * in added/removed span (used when an entire text node is new/removed).
 */
function replaceTextNodeWithWrapped(txt: Text, mode: 'added' | 'removed', options: CompareOptions) {
  const cls =
    mode === 'added'
      ? (options.addedClass ?? 'diff-added')
      : (options.removedClass ?? 'diff-removed');
  const frag = document.createDocumentFragment();
  const span = document.createElement('span');
  span.className = cls;
  span.textContent = ` ${txt.textContent ?? ''} `;
  frag.appendChild(span);
  txt.parentNode?.replaceChild(frag, txt);
}

/**
 * Traverse an element and wrap every descendant TEXT_NODE with the given mode.
 * Preserves element nodes and attributes.
 */
function markDescendantTextNodes(el: Element, mode: 'added' | 'removed', options: CompareOptions) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
  const textNodes: Text[] = [];
  let curr = walker.nextNode();
  while (curr) {
    textNodes.push(curr as Text);
    curr = walker.nextNode();
  }
  // replace text nodes from last to first to avoid invalidating tree walker paths
  for (let i = textNodes.length - 1; i >= 0; i--) {
    replaceTextNodeWithWrapped(textNodes[i], mode, options);
  }
}

/**
 * Build a DocumentFragment for either the 'old' or 'new' view from tokens.
 * 'new' view shows equal + added (wrap added), 'old' shows equal + removed (wrap removed).
 * We never write innerHTML; we use textContent and element creation.
 */
function fragmentFromTokens(tokens: Token[], target: 'old' | 'new', options: CompareOptions) {
  const frag = document.createDocumentFragment();
  const addedCls = options.addedClass ?? 'diff-added';
  const removedCls = options.removedClass ?? 'diff-removed';

  let first = true;
  for (const t of tokens) {
    if (t.type === 'equal') {
      // preserve spacing between tokens by creating text nodes with trailing space
      appendTextNode(frag, t.text, first);
    } else if (t.type === 'added' && target === 'new') {
      const sp = document.createElement('span');
      sp.className = addedCls;
      sp.textContent = ` ${t.text} `;
      frag.appendChild(sp);
      first = false;
    } else if (t.type === 'removed' && target === 'old') {
      const sp = document.createElement('span');
      sp.className = removedCls;
      sp.textContent = ` ${t.text} `;
      frag.appendChild(sp);
      first = false;
    }
    first = false;
  }

  // ensure there is at least an empty text node so parent structure remains consistent
  if (!frag.firstChild) frag.appendChild(document.createTextNode(''));
  return frag;
}

function appendTextNode(frag: DocumentFragment, txt: string, _isFirst: boolean) {
  // tokens were merged to retain spaces; just append with a leading space when appropriate
  const value = txt;
  frag.appendChild(document.createTextNode(value));
}

/* -------------------------
   Matching helpers
   ------------------------- */

/**
 * Very small heuristic similarity: id exact match, class overlap, token text overlap.
 * Returns a numeric score; higher means more similar. Used to prefer matching nodes.
 */
function elementSimilarity(a: Element, b: Element) {
  let score = 0;
  if (a.id && b.id && a.id === b.id) score += 10;
  // class overlap
  const aClasses = new Set(Array.from(a.classList));
  const bClasses = new Set(Array.from(b.classList));
  let common = 0;
  for (const c of aClasses) if (bClasses.has(c)) common++;
  score += common;
  // token overlap in text content (cheap)
  const aTokens = new Set(tokenize(a.textContent || ''));
  const bTokens = new Set(tokenize(b.textContent || ''));
  let tcommon = 0;
  for (const t of aTokens) if (bTokens.has(t)) tcommon++;
  score += tcommon * 0.5;
  return score;
}

/* -------------------------
   Element/attribute change detection & wrapping helpers
   ------------------------- */

/**
 * Return an array of attribute names that differ between a and b.
 * - includes attributes present in one but not the other
 * - includes attributes whose values differ
 * NEW FEATURE: respects tracking configuration to filter which attributes count as changes
 */
function getChangedAttributes(a: Element, b: Element, options: CompareOptions = {}): string[] {
  const changed: Set<string> = new Set();
  const aMap = new Map<string, string | null>();
  for (let i = 0; i < a.attributes.length; i++) {
    const at = a.attributes[i];
    aMap.set(at.name, at.value);
  }
  const bMap = new Map<string, string | null>();
  for (let i = 0; i < b.attributes.length; i++) {
    const at = b.attributes[i];
    bMap.set(at.name, at.value);
  }

  // any key in a that is missing or different in b
  for (const [k, v] of aMap) {
    if (!bMap.has(k) || bMap.get(k) !== v) changed.add(k);
  }
  // any key in b missing in a
  for (const k of bMap.keys()) {
    if (!aMap.has(k)) changed.add(k);
  }

  // NEW FEATURE: Apply tracking filters
  const allChanged = Array.from(changed);

  // Apply tag-specific tracking if available
  const tagName = a.tagName.toLowerCase();
  if (options.trackedTags) {
    if (Array.isArray(options.trackedTags)) {
      // Array form: if tag is not in the list, no attributes count as changed
      if (!options.trackedTags.map((t) => t.toLowerCase()).includes(tagName)) {
        return [];
      }
    } else {
      // Record form: check for tag-specific attribute filters
      const tagRule = options.trackedTags[tagName];
      if (tagRule !== undefined) {
        if (Array.isArray(tagRule)) {
          // Only these specific attributes for this tag
          return allChanged.filter((attr) => tagRule.includes(attr));
        }
        // If tagRule is not an array, it should be treated as boolean (but we expect arrays)
      } else {
        // Tag not in trackedTags record, check for wildcard "*"
        const wildcardRule = options.trackedTags['*'];
        if (wildcardRule && Array.isArray(wildcardRule)) {
          return allChanged.filter((attr) => wildcardRule.includes(attr));
        } else if (!wildcardRule) {
          // No rule for this tag and no wildcard, don't track changes
          return [];
        }
      }
    }
  }

  // Apply global attribute filter if provided
  if (options.trackedAttributes) {
    return allChanged.filter((attr) => options.trackedAttributes!.includes(attr));
  }

  return allChanged;
}

/**
 * Wrap an element in a wrapper element with a class. If element has no parent,
 * the function is a no-op (element may be detached).
 */
function wrapElement(el: Element, className: string | undefined, wrapperTag = 'span') {
  const parent = el.parentNode;
  if (!parent) return;
  const wrapper = document.createElement(wrapperTag);
  if (className) wrapper.className = className;
  parent.replaceChild(wrapper, el);
  wrapper.appendChild(el);
}

/**
 * Detect tagName or attribute differences and wrap the matched old/new elements
 * so callers can style or mark the tag-level changes. Tag changes get elementChangeClass,
 * attribute-only changes get attributeChangeClass. After wrapping we still recurse
 * into children for normal text/element diffs.
 *
 * If options.onElementChange is provided it is called before wrapping. If it returns
 * an Element that element will be used as the wrapper (cloned for the second side).
 * If it returns null/undefined, wrapping is skipped for that change.
 *
 * NEW FEATURE: now respects tracking configuration to determine what counts as a change
 * and stores changed attributes data for statistics collection
 */
function detectAndWrapElementChange(oldEl: Element, newEl: Element, options: CompareOptions) {
  const wrapperTag = options.wrapperTag ?? 'span';
  const elemClass = options.elementChangeClass ?? 'diff-elem-changed';
  const attrClass = options.attributeChangeClass ?? 'diff-attr-changed';

  const tagChanged = oldEl.tagName !== newEl.tagName;

  // NEW FEATURE: Use updated getChangedAttributes that respects tracking config
  const changedAttrs = getChangedAttributes(oldEl, newEl, options);
  const attrChanged = changedAttrs.length > 0;

  const cb = options.onElementChange;

  if (tagChanged) {
    const changeType: 'tag' = 'tag';
    let cbResult: Element | null | void = undefined;
    if (cb) cbResult = cb(oldEl, newEl, changeType);
    if (cbResult instanceof Element) {
      // use returned element as wrapper for both sides (clone for second)
      const wrapperOld = cbResult;
      const wrapperNew = cbResult.cloneNode(true) as Element;
      const parentOld = oldEl.parentNode;
      const parentNew = newEl.parentNode;
      if (parentOld) {
        parentOld.replaceChild(wrapperOld, oldEl);
        wrapperOld.appendChild(oldEl);
      }
      if (parentNew) {
        parentNew.replaceChild(wrapperNew, newEl);
        wrapperNew.appendChild(newEl);
      }
    } else if (cbResult === null) {
      // user chose to skip wrapping
    } else {
      // fallback to default wrapping
      wrapElement(oldEl, elemClass + ' diff-tag-changed', wrapperTag);
      wrapElement(newEl, elemClass + ' diff-tag-changed', wrapperTag);
    }
  } else if (attrChanged) {
    const changeType: 'attribute' = 'attribute';
    let cbResult: Element | null | void = undefined;
    if (cb) cbResult = cb(oldEl, newEl, changeType, changedAttrs);
    if (cbResult instanceof Element) {
      const wrapperOld = cbResult;
      const wrapperNew = cbResult.cloneNode(true) as Element;
      const parentOld = oldEl.parentNode;
      const parentNew = newEl.parentNode;
      if (parentOld) {
        parentOld.replaceChild(wrapperOld, oldEl);
        wrapperOld.appendChild(oldEl);
      }
      if (parentNew) {
        parentNew.replaceChild(wrapperNew, newEl);
        wrapperNew.appendChild(newEl);
      }
    } else if (cbResult === null) {
      // user chose to skip wrapping
    } else {
      // fallback to default wrapping
      wrapElement(oldEl, attrClass, wrapperTag);
      wrapElement(newEl, attrClass, wrapperTag);

      // NEW FEATURE: Store changed attributes data for statistics collection
      // Store the changed attributes in a data attribute for later collection
      if (changedAttrs.length > 0) {
        const tagName = oldEl.tagName.toLowerCase();
        oldEl.setAttribute('data-diff-changed-attrs', changedAttrs.join(','));
        oldEl.setAttribute('data-diff-tag-name', tagName);
        newEl.setAttribute('data-diff-changed-attrs', changedAttrs.join(','));
        newEl.setAttribute('data-diff-tag-name', tagName);
      }
    }
  }
}

/* -------------------------
   NEW FEATURE: Diff Statistics Collection
   ------------------------- */

/**
 * Analyzes a diffed DOM tree and collects statistics about changes.
 * This function only reads the DOM and doesn't modify it.
 * It looks for wrapped elements and spans to count different types of changes.
 * NEW FEATURE: Now also collects per-tag statistics
 */
export function collectDiffStats(rootElements: Element[], options: CompareOptions = {}): DiffStats {
  const stats: DiffStats = {
    totalChangedTags: 0,
    totalAddedTexts: 0,
    totalRemovedTexts: 0,
    totalAddedTags: 0,
    totalRemovedTags: 0,
    // NEW FEATURE: Per-tag statistics
    addedTags: {},
    removedTags: {},
    changedTags: {},
  };

  const addedClass = options.addedClass ?? 'diff-added';
  const removedClass = options.removedClass ?? 'diff-removed';
  const elementChangeClass = options.elementChangeClass ?? 'diff-elem-changed';
  const attributeChangeClass = options.attributeChangeClass ?? 'diff-attr-changed';

  // Helper function to recursively traverse and count
  function traverseAndCount(element: Element) {
    // Check if this element represents a change
    const classes = element.className.split(' ');

    // Count element-level changes (tag or attribute changes)
    if (classes.includes(elementChangeClass) || classes.includes(attributeChangeClass)) {
      stats.totalChangedTags++;

      // NEW FEATURE: Collect per-tag change statistics
      const tagName = element.getAttribute('data-diff-tag-name') || element.tagName.toLowerCase();
      const changedAttrsStr = element.getAttribute('data-diff-changed-attrs');

      if (changedAttrsStr) {
        const changedAttrs = changedAttrsStr.split(',').filter(Boolean);

        if (!stats.changedTags![tagName]) {
          stats.changedTags![tagName] = { count: 0, changedAttributes: [] };
        }

        stats.changedTags![tagName].count++;

        // Merge unique changed attributes
        for (const attr of changedAttrs) {
          if (!stats.changedTags![tagName].changedAttributes.includes(attr)) {
            stats.changedTags![tagName].changedAttributes.push(attr);
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

    // NEW FEATURE: Count added tags per tag type
    const addedTagName = element.getAttribute('data-diff-added-tag');
    if (addedTagName) {
      stats.totalAddedTags++;
      stats.addedTags![addedTagName] = (stats.addedTags![addedTagName] || 0) + 1;
    }

    // NEW FEATURE: Count removed tags per tag type
    const removedTagName = element.getAttribute('data-diff-removed-tag');
    if (removedTagName) {
      stats.totalRemovedTags++;
      stats.removedTags![removedTagName] = (stats.removedTags![removedTagName] || 0) + 1;
    }

    // Count added/removed tags (look for elements that are entirely wrapped as added/removed)
    // This is a heuristic: if an element is wrapped with added/removed class and contains
    // significant structure (not just text), count it as a tag addition/removal
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

    // Recursively traverse children
    Array.from(element.children).forEach(traverseAndCount);
  }

  // Start traversal from all root elements
  rootElements.forEach(traverseAndCount);

  return stats;
}

/**
 * NEW FEATURE: Public helper function that runs diff and returns both results and stats
 * Accepts old and new HTML strings and optional CompareOptions
 * Returns both the modified DOM and computed statistics
 */
export function getCustomDiffStats(
  oldHTML: string,
  newHTML: string,
  options: CompareOptions = {}
): {
  diffResult: { rootElements: Element[]; allElements: Element[] };
  stats: DiffStats;
} {
  // Parse HTML into element trees
  const oldTree = stringToFlatTree(oldHTML);
  const newTree = stringToFlatTree(newHTML);

  // Create containers for the diff operation
  const oldContainer = document.createElement('div');
  const newContainer = document.createElement('div');

  // Append parsed elements to containers
  oldTree.rootElements.forEach((el) => oldContainer.appendChild(el));
  newTree.rootElements.forEach((el) => newContainer.appendChild(el));

  // Run the diff operation
  compareElements(
    Array.from(oldContainer.children) as Element[],
    Array.from(newContainer.children) as Element[],
    options
  );

  // Collect all elements for the result
  const allOldElements = Array.from(oldContainer.querySelectorAll('*'));
  const allNewElements = Array.from(newContainer.querySelectorAll('*'));
  const diffResult = {
    rootElements: [
      ...Array.from(oldContainer.children),
      ...Array.from(newContainer.children),
    ] as Element[],
    allElements: [...allOldElements, ...allNewElements],
  };

  // Collect statistics from the diffed DOM
  const stats = collectDiffStats(diffResult.rootElements, options);

  return { diffResult, stats };
}

/**
 * NEW FEATURE: Helper function to create a formatted summary of per-tag statistics
 */
export function formatTagStatsSummary(stats: DiffStats): string {
  const lines: string[] = [];

  lines.push('=== PER-TAG DIFF STATISTICS ===');

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

/* -------------------------
   End of Diff Statistics
   ------------------------- */

function computeLCS(a: string[], b: string[]): Array<[number, number]> {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (a[i] === b[j]) dp[i][j] = 1 + dp[i + 1][j + 1];
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const matches: Array<[number, number]> = [];
  let i = 0,
    j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      matches.push([i, j]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return matches;
}

/* -------------------------
   Diff algorithm (word-level)
   ------------------------- */

/**
 * Tokenize into words and punctuation tokens so punctuation is kept separate.
 * Example: "Hi, world!" => ["Hi", ",", "world", "!"]
 */
export function tokenize(text: string): string[] {
  if (!text) return [];
  const matched = text.match(/\p{L}+\p{M}*|\d+|[^\s\p{L}\p{N}]+/gu);
  if (!matched) return [];
  return matched.map((s) => s.trim()).filter(Boolean);
}

/**
 * Compute LCS-based word diff on token arrays.
 * Merges consecutive tokens of the same type into a single token (joined by spaces).
 */
export function computeWordDiff(oldText: string, newText: string): Token[] {
  const a = tokenize(oldText);
  const b = tokenize(newText);
  const na = a.length;
  const nb = b.length;
  const dp: number[][] = Array.from({ length: na + 1 }, () => Array(nb + 1).fill(0));
  for (let i = na - 1; i >= 0; i--) {
    for (let j = nb - 1; j >= 0; j--) {
      if (a[i] === b[j]) dp[i][j] = 1 + dp[i + 1][j + 1];
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const tokens: Token[] = [];
  let i = 0,
    j = 0;
  while (i < na && j < nb) {
    if (a[i] === b[j]) {
      tokens.push({ type: 'equal', text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      tokens.push({ type: 'removed', text: a[i] });
      i++;
    } else {
      tokens.push({ type: 'added', text: b[j] });
      j++;
    }
  }
  while (i < na) tokens.push({ type: 'removed', text: a[i++] });
  while (j < nb) tokens.push({ type: 'added', text: b[j++] });

  // merge consecutive tokens of same type and join with spaces where appropriate
  const merged: Token[] = [];
  for (const t of tokens) {
    if (!t.text) continue;
    const last = merged[merged.length - 1];
    if (last && last.type === t.type) {
      last.text = last.text + ' ' + t.text;
    } else {
      merged.push({ ...t });
    }
  }
  return merged;
}
