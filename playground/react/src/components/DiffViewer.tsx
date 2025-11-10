/**
 * DiffViewer Component
 *
 * Professional WebStorm/PHPStorm-style diff viewer with:
 * - Synchronized scrolling between panels (proportional tracking)
 * - Linked highlighting of corresponding changes
 * - IntersectionObserver-based visibility tracking
 * - Hover-based interactive highlighting
 * - Smooth animations and transitions
 * - Support for deeply nested changes
 * - Attribute-level diff visualization
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { DiffStats, ExtendedCompareOptions } from '@rastaweb/domoscope';
import { getCustomDiffStats } from '@rastaweb/domoscope';
import { Stats } from './Stats';

interface DiffViewerProps {
  oldContent: string;
  newContent: string;
  options?: Partial<ExtendedCompareOptions>;
  title?: string;
  description?: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  oldContent,
  newContent,
  options = {},
  title = 'Diff Viewer',
  description,
}) => {
  const oldContainerRef = useRef<HTMLDivElement>(null);
  const newContainerRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<DiffStats | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Scroll synchronization state
  const syncScrollTimeoutRef = useRef<number | undefined>(undefined);
  const isScrollingRef = useRef<'old' | 'new' | null>(null);
  const scrollSyncEnabledRef = useRef(true);

  // IntersectionObserver refs for visibility tracking
  const oldObserverRef = useRef<IntersectionObserver | null>(null);
  const newObserverRef = useRef<IntersectionObserver | null>(null);

  // Map to store element pairs for linking
  const elementPairsRef = useRef<Map<string, { old: Element; new: Element }>>(new Map());
  const [hoveredPairId, setHoveredPairId] = useState<string | null>(null);

  useEffect(() => {
    processDiff();
    return () => {
      // Cleanup observers
      if (oldObserverRef.current) oldObserverRef.current.disconnect();
      if (newObserverRef.current) newObserverRef.current.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oldContent, newContent]);

  /**
   * Synchronized scrolling with smooth proportional tracking
   * Prevents infinite scroll loops and maintains proportional position
   */
  const handleScroll = useCallback(
    (source: 'old' | 'new', event: React.UIEvent<HTMLDivElement>) => {
      if (!scrollSyncEnabledRef.current) return;

      const sourceContainer = event.currentTarget;
      const targetContainer = source === 'old' ? newContainerRef.current : oldContainerRef.current;

      if (!targetContainer) return;

      // Prevent infinite scroll loops
      if (isScrollingRef.current && isScrollingRef.current !== source) return;

      isScrollingRef.current = source;

      // Clear any pending timeout
      if (syncScrollTimeoutRef.current) {
        clearTimeout(syncScrollTimeoutRef.current);
      }

      // Calculate proportional scroll position (handles different content heights)
      const scrollPercentage =
        sourceContainer.scrollTop /
        (sourceContainer.scrollHeight - sourceContainer.clientHeight || 1);

      // Apply to target with smooth scrolling
      const targetScrollTop =
        scrollPercentage * (targetContainer.scrollHeight - targetContainer.clientHeight);

      targetContainer.scrollTop = targetScrollTop;

      // Reset scrolling flag after a short delay
      syncScrollTimeoutRef.current = window.setTimeout(() => {
        isScrollingRef.current = null;
      }, 150);
    },
    []
  );

  /**
   * Process diff and setup element tracking
   */
  const processDiff = useCallback(() => {
    setIsProcessing(true);
    setError(null);

    try {
      // Configure domoscope options with comprehensive tracking
      const diffOptions: Partial<ExtendedCompareOptions> = {
        addedClass: 'diff-added',
        removedClass: 'diff-removed',
        elementChangeClass: 'diff-element-changed',
        attributeChangeClass: 'diff-attribute-changed',
        watchedTags: [
          'img',
          'a',
          'button',
          'input',
          'form',
          'blockquote',
          'code',
          'pre',
          'h2',
          'h3',
          'p',
          'li',
          'table',
          'tr',
          'td',
        ],
        trackedTags: {
          a: ['href', 'title', 'target', 'rel', 'data-mce-href'],
          img: ['src', 'alt', 'width', 'height', 'loading', 'border', 'data-mce-src'],
          button: ['type', 'disabled', 'class'],
          input: ['type', 'placeholder', 'required', 'value'],
          div: ['class', 'data-id', 'data-version'],
          section: ['class'],
          article: ['class', 'data-id', 'data-version'],
          span: ['class', 'style', 'data-mce-style'],
          form: ['class', 'action', 'method'],
          p: ['class'],
          table: ['width', 'cellpadding', 'cellspacing', 'dir', 'class'],
          td: ['width', 'bgcolor'],
          h2: ['class'],
          h3: ['class'],
        },
        onElementChange: (_oldEl, newEl, changeType, changedAttrs) => {
          if (newEl) {
            newEl.setAttribute('data-change-type', changeType);
            if (changedAttrs && changedAttrs.length > 0) {
              newEl.setAttribute('data-changed-attrs', changedAttrs.join(', '));
            }
          }
          return undefined;
        },
        ...options,
      };

      // Process diffs
      const newResult = getCustomDiffStats(oldContent, newContent, diffOptions);
      const oldResult = getCustomDiffStats(newContent, oldContent, {
        ...diffOptions,
        addedClass: 'diff-removed',
        removedClass: 'diff-added',
      });

      // Render content
      if (newContainerRef.current) {
        newContainerRef.current.innerHTML = '';
        newResult.diffResult.rootElements.forEach((el) => {
          newContainerRef.current?.appendChild(el.cloneNode(true));
        });
      }

      if (oldContainerRef.current) {
        oldContainerRef.current.innerHTML = '';
        oldResult.diffResult.rootElements.forEach((el) => {
          oldContainerRef.current?.appendChild(el.cloneNode(true));
        });
      }

      // Setup element pairing and enhancements
      setupElementPairing();
      enhanceChangedElements();
      setupIntersectionObservers();
      setupHoverTracking();

      setStats(newResult.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Diff processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [oldContent, newContent, options]);

  /**
   * Create mapping between corresponding elements in old and new panels
   * Uses multiple strategies: position-based, content-based, and change-type-based matching
   */
  const setupElementPairing = () => {
    elementPairsRef.current.clear();

    if (!oldContainerRef.current || !newContainerRef.current) return;

    // Strategy 1: Pair changed elements by position and type
    const oldChanged = Array.from(
      oldContainerRef.current.querySelectorAll('[data-change-type], .diff-added, .diff-removed')
    );
    const newChanged = Array.from(
      newContainerRef.current.querySelectorAll('[data-change-type], .diff-added, .diff-removed')
    );

    oldChanged.forEach((oldEl, index) => {
      const pairId = `pair-${index}`;
      oldEl.setAttribute('data-pair-id', pairId);

      const newEl = newChanged[index];
      if (newEl) {
        newEl.setAttribute('data-pair-id', pairId);
        elementPairsRef.current.set(pairId, {
          old: oldEl,
          new: newEl,
        });
      }
    });

    // Strategy 2: Pair by content similarity (for unchanged/modified paragraphs)
    const pairByContent = (selector: string) => {
      const oldElements = Array.from(oldContainerRef.current!.querySelectorAll(selector));
      const newElements = Array.from(newContainerRef.current!.querySelectorAll(selector));

      oldElements.forEach((oldEl, idx) => {
        if (oldEl.hasAttribute('data-pair-id')) return; // Already paired

        const oldText = oldEl.textContent?.trim().substring(0, 100);
        if (!oldText) return;

        newElements.forEach((newEl, newIdx) => {
          if (newEl.hasAttribute('data-pair-id')) return; // Already paired

          const newText = newEl.textContent?.trim().substring(0, 100);

          // Match by similar content
          if (
            oldText &&
            newText &&
            (oldText === newText || newText.includes(oldText) || oldText.includes(newText))
          ) {
            const pairId = `content-pair-${selector}-${idx}-${newIdx}`;
            oldEl.setAttribute('data-pair-id', pairId);
            newEl.setAttribute('data-pair-id', pairId);
            elementPairsRef.current.set(pairId, {
              old: oldEl,
              new: newEl,
            });
          }
        });
      });
    };

    // Pair structural elements
    pairByContent('p');
    pairByContent('h2');
    pairByContent('h3');
    pairByContent('li');
    pairByContent('td');
    pairByContent('a');

    // Strategy 3: Pair unchanged elements by position
    const oldAll = Array.from(
      oldContainerRef.current.querySelectorAll('p, h2, h3, li, a, img, table')
    );
    const newAll = Array.from(
      newContainerRef.current.querySelectorAll('p, h2, h3, li, a, img, table')
    );

    let pairCount = 0;
    const minLength = Math.min(oldAll.length, newAll.length);

    for (let i = 0; i < minLength; i++) {
      const oldEl = oldAll[i];
      const newEl = newAll[i];

      if (!oldEl.hasAttribute('data-pair-id') && !newEl.hasAttribute('data-pair-id')) {
        const pairId = `position-pair-${pairCount++}`;
        oldEl.setAttribute('data-pair-id', pairId);
        newEl.setAttribute('data-pair-id', pairId);
        elementPairsRef.current.set(pairId, {
          old: oldEl,
          new: newEl,
        });
      }
    }
  };

  /**
   * Setup IntersectionObserver for visibility-based highlighting
   * Highlights elements when they're in the viewport's center region
   */
  const setupIntersectionObservers = () => {
    if (!oldContainerRef.current || !newContainerRef.current) return;

    // Cleanup existing observers
    if (oldObserverRef.current) oldObserverRef.current.disconnect();
    if (newObserverRef.current) newObserverRef.current.disconnect();

    const observerOptions = {
      root: null,
      rootMargin: '-25% 0px -25% 0px', // Trigger when element is in the middle 50% of viewport
      threshold: [0, 0.25, 0.5, 0.75, 1],
    };

    // Observer for old panel
    oldObserverRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const element = entry.target as HTMLElement;
        const pairId = element.getAttribute('data-pair-id');

        if (entry.isIntersecting && entry.intersectionRatio >= 0.25 && pairId) {
          element.classList.add('is-visible');

          // Highlight corresponding element in new panel
          const pair = elementPairsRef.current.get(pairId);
          if (pair?.new) {
            (pair.new as HTMLElement).classList.add('paired-visible');
          }
        } else {
          element.classList.remove('is-visible');

          if (pairId) {
            const pair = elementPairsRef.current.get(pairId);
            if (pair?.new) {
              (pair.new as HTMLElement).classList.remove('paired-visible');
            }
          }
        }
      });
    }, observerOptions);

    // Observer for new panel
    newObserverRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const element = entry.target as HTMLElement;
        const pairId = element.getAttribute('data-pair-id');

        if (entry.isIntersecting && entry.intersectionRatio >= 0.25 && pairId) {
          element.classList.add('is-visible');

          // Highlight corresponding element in old panel
          const pair = elementPairsRef.current.get(pairId);
          if (pair?.old) {
            (pair.old as HTMLElement).classList.add('paired-visible');
          }
        } else {
          element.classList.remove('is-visible');

          if (pairId) {
            const pair = elementPairsRef.current.get(pairId);
            if (pair?.old) {
              (pair.old as HTMLElement).classList.remove('paired-visible');
            }
          }
        }
      });
    }, observerOptions);

    // Observe all paired elements
    oldContainerRef.current.querySelectorAll('[data-pair-id]').forEach((el) => {
      oldObserverRef.current?.observe(el);
    });

    newContainerRef.current.querySelectorAll('[data-pair-id]').forEach((el) => {
      newObserverRef.current?.observe(el);
    });
  };

  /**
   * Setup hover tracking for interactive highlighting
   * Highlights corresponding elements when hovering
   */
  const setupHoverTracking = () => {
    if (!oldContainerRef.current || !newContainerRef.current) return;

    const handleMouseEnter = (event: Event) => {
      const target = event.target as HTMLElement;
      const element = target.closest('[data-pair-id]') as HTMLElement;
      const pairId = element?.getAttribute('data-pair-id');

      if (pairId) {
        setHoveredPairId(pairId);

        const pair = elementPairsRef.current.get(pairId);
        if (pair) {
          (pair.old as HTMLElement).classList.add('hover-linked');
          (pair.new as HTMLElement).classList.add('hover-linked');
        }
      }
    };

    const handleMouseLeave = (event: Event) => {
      const target = event.target as HTMLElement;
      const element = target.closest('[data-pair-id]') as HTMLElement;
      const pairId = element?.getAttribute('data-pair-id');

      if (pairId) {
        const pair = elementPairsRef.current.get(pairId);
        if (pair) {
          (pair.old as HTMLElement).classList.remove('hover-linked');
          (pair.new as HTMLElement).classList.remove('hover-linked');
        }
        setHoveredPairId(null);
      }
    };

    // Add event listeners to all paired elements
    const oldElements = oldContainerRef.current.querySelectorAll('[data-pair-id]');
    const newElements = newContainerRef.current.querySelectorAll('[data-pair-id]');

    oldElements.forEach((el) => {
      el.addEventListener('mouseenter', handleMouseEnter);
      el.addEventListener('mouseleave', handleMouseLeave);
    });

    newElements.forEach((el) => {
      el.addEventListener('mouseenter', handleMouseEnter);
      el.addEventListener('mouseleave', handleMouseLeave);
    });
  };

  /**
   * Enhance changed elements with visual indicators, tooltips, and markers
   */
  const enhanceChangedElements = () => {
    const containers = [oldContainerRef.current, newContainerRef.current];

    containers.forEach((container) => {
      if (!container) return;

      // Add tooltips for attribute changes
      const changedElements = container.querySelectorAll('[data-change-type]');
      changedElements.forEach((el) => {
        const changeType = el.getAttribute('data-change-type');
        const changedAttrs = el.getAttribute('data-changed-attrs');

        let tooltipText = '';
        if (changeType === 'attribute' && changedAttrs) {
          tooltipText = `ویژگی‌های تغییر یافته: ${changedAttrs}`;
        } else if (changeType === 'tag') {
          tooltipText = 'تگ تغییر کرده است';
        } else if (changeType === 'tag-added') {
          tooltipText = 'عنصر جدید اضافه شده';
        } else if (changeType === 'tag-removed') {
          tooltipText = 'عنصر حذف شده';
        }

        if (tooltipText) {
          el.setAttribute('title', tooltipText);
          el.setAttribute('data-tooltip', tooltipText); // Also store in data attribute for CSS
          el.classList.add('has-tooltip');
        }
      });

      // Also add tooltips to any element with data-changed-attrs (even without data-change-type)
      const attrChangedElements = container.querySelectorAll(
        '[data-changed-attrs]:not([data-change-type])'
      );
      attrChangedElements.forEach((el) => {
        const changedAttrs = el.getAttribute('data-changed-attrs');
        if (changedAttrs) {
          const tooltipText = `ویژگی‌های تغییر یافته: ${changedAttrs}`;
          el.setAttribute('title', tooltipText);
          el.setAttribute('data-tooltip', tooltipText);
          el.classList.add('has-tooltip');
        }
      });

      // Add line markers for block-level changes
      const addLineMarker = (el: Element, type: 'added' | 'removed') => {
        if (['P', 'H2', 'H3', 'LI', 'TD', 'DIV'].includes(el.tagName)) {
          el.classList.add(`${type}-line`);

          if (!el.querySelector('.line-marker')) {
            const marker = document.createElement('span');
            marker.className = `line-marker ${type}-marker`;
            marker.textContent = type === 'added' ? '+' : '-';
            el.insertBefore(marker, el.firstChild);
          }
        }
      };

      const addedElements = container.querySelectorAll('.diff-added');
      addedElements.forEach((el) => addLineMarker(el, 'added'));

      const removedElements = container.querySelectorAll('.diff-removed');
      removedElements.forEach((el) => addLineMarker(el, 'removed'));

      // Add indicators for changed links
      const links = container.querySelectorAll('a[data-changed-attrs]');
      links.forEach((link) => {
        const changedAttrs = link.getAttribute('data-changed-attrs');
        if (changedAttrs?.includes('href')) {
          const badge = document.createElement('span');
          badge.className = 'link-change-badge';
          badge.textContent = '🔗';
          badge.title = 'لینک تغییر کرده است';
          link.appendChild(badge);
        }
      });

      // Add indicators for changed images
      const images = container.querySelectorAll('img[data-changed-attrs]');
      images.forEach((img) => {
        // Add outline class for styling
        (img as HTMLElement).classList.add('changed-image');

        // Add tooltip
        const changedAttrs = img.getAttribute('data-changed-attrs');
        if (changedAttrs) {
          img.setAttribute('title', `تصویر تغییر یافته - ویژگی‌ها: ${changedAttrs}`);
          img.classList.add('has-tooltip');
        }

        // Add visual indicator
        const wrapper = img.parentElement;
        if (wrapper && !wrapper.querySelector('.img-change-indicator')) {
          const indicator = document.createElement('div');
          indicator.className = 'img-change-indicator';
          indicator.innerHTML = `<span class="change-badge">🖼️ تصویر تغییر یافته</span>`;
          img.parentNode?.insertBefore(indicator, img);
        }
      });
    });
  };

  return (
    <div className="diff-viewer">
      {/* Header */}
      <div className="diff-viewer-header">
        <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
        {description && <p className="text-sm text-slate-600 mt-1">{description}</p>}
      </div>

      {/* Loading/Error States */}
      {isProcessing && (
        <div className="processing-indicator">
          <div className="spinner"></div>
          <p>در حال پردازش تفاوت‌ها...</p>
        </div>
      )}

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {/* Stats Section */}
      {stats && !isProcessing && (
        <div className="mb-6">
          <Stats stats={stats} />
        </div>
      )}

      {/* Side-by-side Diff View with Synchronized Scrolling */}
      <div className="diff-content-wrapper">
        <div className="diff-panels">
          {/* Old Content Panel */}
          <div className="diff-panel old-panel">
            <div className="panel-header">
              <h3 className="panel-title">
                <span className="icon">📄</span>
                محتوای قبلی (حذف‌شده‌ها)
              </h3>
              <span className="panel-badge old-badge">نسخه قدیم</span>
            </div>
            <div
              ref={oldContainerRef}
              className="diff-content old-content"
              dir="rtl"
              onScroll={(e) => handleScroll('old', e)}
            />
          </div>

          {/* New Content Panel */}
          <div className="diff-panel new-panel">
            <div className="panel-header">
              <h3 className="panel-title">
                <span className="icon">📝</span>
                محتوای جدید (اضافه‌شده‌ها)
              </h3>
              <span className="panel-badge new-badge">نسخه جدید</span>
            </div>
            <div
              ref={newContainerRef}
              className="diff-content new-content"
              dir="rtl"
              onScroll={(e) => handleScroll('new', e)}
            />
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="diff-legend">
        <h3 className="legend-title">راهنمای رنگ‌ها و تعامل:</h3>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-color added"></span>
            <span>اضافه شده (سبز)</span>
          </div>
          <div className="legend-item">
            <span className="legend-color removed"></span>
            <span>حذف شده (قرمز)</span>
          </div>
          <div className="legend-item">
            <span className="legend-color changed"></span>
            <span>تگ تغییر یافته (زرد)</span>
          </div>
          <div className="legend-item">
            <span className="legend-color attribute"></span>
            <span>ویژگی تغییر کرده (آبی)</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon">🖱️</span>
            <span>با موس روی تغییرات حرکت کنید تا برجسته شوند</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon">👁️</span>
            <span>اسکرول کنید - تغییرات مرتبط خودکار برجسته می‌شوند</span>
          </div>
        </div>
      </div>
    </div>
  );
};
