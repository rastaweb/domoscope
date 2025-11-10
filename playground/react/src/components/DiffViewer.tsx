/**
 * DiffViewer Component
 *
 * Demonstrates all features of the domoscope library:
 * - Text-level and word-level diffs
 * - Attribute changes with tooltips
 * - Added/removed element tracking
 * - Custom styling and visualization
 * - Comprehensive statistics
 */

import React, { useEffect, useRef, useState } from 'react';
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

  useEffect(() => {
    processDiff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oldContent, newContent]);

  const processDiff = () => {
    setIsProcessing(true);
    setError(null);

    try {
      // Configure domoscope options with comprehensive tracking
      const diffOptions: Partial<ExtendedCompareOptions> = {
        // Style classes for different change types
        addedClass: 'diff-added',
        removedClass: 'diff-removed',
        elementChangeClass: 'diff-element-changed',
        attributeChangeClass: 'diff-attribute-changed',

        // Watch specific tags for special handling
        watchedTags: ['img', 'a', 'button', 'input', 'form', 'blockquote', 'code', 'pre'],

        // Track all important tags and their attributes
        trackedTags: {
          a: ['href', 'title', 'target', 'rel'],
          img: ['src', 'alt', 'width', 'height', 'loading'],
          button: ['type', 'disabled', 'class'],
          input: ['type', 'placeholder', 'required', 'value'],
          div: ['class', 'data-id', 'data-version'],
          section: ['class'],
          article: ['class', 'data-id', 'data-version'],
          span: ['class'],
          form: ['class', 'action', 'method'],
        },

        // Custom element change handler for advanced features
        onElementChange: (_oldEl, newEl, changeType, changedAttrs) => {
          // Add custom data attributes to track changes
          if (newEl) {
            newEl.setAttribute('data-change-type', changeType);
            if (changedAttrs && changedAttrs.length > 0) {
              newEl.setAttribute('data-changed-attrs', changedAttrs.join(', '));
            }
          }

          // Return undefined to use default wrapping behavior
          return undefined;
        }, // Merge with custom options
        ...options,
      };

      // Process the diff for both old and new content
      const result = getCustomDiffStats(oldContent, newContent, diffOptions);

      // Render the diff results
      if (newContainerRef.current) {
        // Clear existing content
        newContainerRef.current.innerHTML = '';

        // Append the diffed elements
        result.diffResult.rootElements.forEach((el) => {
          //   if (el.parentElement?.tagName !== 'DIV') {
          newContainerRef.current?.appendChild(el.cloneNode(true));
          //   }
        });

        // Add tooltips and badges for changed elements
        enhanceChangedElements(newContainerRef.current);
      }

      // For old content, show what was removed
      if (oldContainerRef.current) {
        // Process old content to highlight removals
        const oldResult = getCustomDiffStats(newContent, oldContent, {
          ...diffOptions,
          addedClass: 'diff-removed', // Swap classes for old view
          removedClass: 'diff-added',
        });

        // Clear and append old content
        oldContainerRef.current.innerHTML = '';
        oldResult.diffResult.rootElements.forEach((el) => {
          //   if (el.parentElement?.tagName !== 'DIV') {
          oldContainerRef.current?.appendChild(el.cloneNode(true));
          //   }
        });
        enhanceChangedElements(oldContainerRef.current);
      }
      setStats(result.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Diff processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Enhance changed elements with tooltips, badges, and visual indicators
   */
  const enhanceChangedElements = (container: HTMLElement) => {
    // Add tooltips for attribute changes
    const changedElements = container.querySelectorAll('[data-change-type]');
    changedElements.forEach((el) => {
      const changeType = el.getAttribute('data-change-type');
      const changedAttrs = el.getAttribute('data-changed-attrs');

      // Create tooltip content
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
        el.classList.add('has-tooltip');
      }
    });

    // Add badges for specific element types
    const images = container.querySelectorAll('img[data-change-type]');
    images.forEach((img) => {
      addBadge(img as HTMLElement, '🖼️', 'تصویر تغییر یافته');
    });

    const links = container.querySelectorAll('a[data-change-type]');
    links.forEach((link) => {
      const changedAttrs = link.getAttribute('data-changed-attrs');
      if (changedAttrs?.includes('href')) {
        addBadge(link as HTMLElement, '🔗', 'لینک تغییر یافته');
      }
    });

    const buttons = container.querySelectorAll('button[data-change-type]');
    buttons.forEach((button) => {
      addBadge(button as HTMLElement, '🔘', 'دکمه تغییر یافته');
    });

    // Highlight added sections
    const addedElements = container.querySelectorAll('.diff-added');
    addedElements.forEach((el) => {
      if (el.tagName === 'SECTION' || el.tagName === 'DIV') {
        el.classList.add('added-section');
      }
    });

    // Highlight removed sections
    const removedElements = container.querySelectorAll('.diff-removed');
    removedElements.forEach((el) => {
      if (el.tagName === 'SECTION' || el.tagName === 'DIV') {
        el.classList.add('removed-section');
      }
    });
  };

  /**
   * Add a visual badge to an element
   */
  const addBadge = (element: HTMLElement, icon: string, title: string) => {
    const badge = document.createElement('span');
    badge.className = 'change-badge';
    badge.textContent = icon;
    badge.title = title;

    // Position badge relative to element
    const wrapper = document.createElement('span');
    wrapper.className = 'badge-wrapper';

    if (element.parentNode) {
      element.parentNode.insertBefore(wrapper, element);
      wrapper.appendChild(element);
      wrapper.insertBefore(badge, element);
    }
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

      {/* Side-by-side Diff View */}
      <div className="diff-content-wrapper">
        <div className="diff-panels">
          {/* Old Content Panel */}
          <div className="diff-panel old-panel">
            <div className="panel-header">
              <h3 className="panel-title">
                <span className="icon">📄</span>
                محتوای قبلی
              </h3>
              <span className="panel-badge old-badge">نسخه قدیم</span>
            </div>
            <div ref={oldContainerRef} className="diff-content old-content" dir="rtl" />
          </div>

          {/* New Content Panel */}
          <div className="diff-panel new-panel">
            <div className="panel-header">
              <h3 className="panel-title">
                <span className="icon">📝</span>
                محتوای جدید
              </h3>
              <span className="panel-badge new-badge">نسخه جدید</span>
            </div>
            <div ref={newContainerRef} className="diff-content new-content" dir="rtl" />
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="diff-legend">
        <h3 className="legend-title">راهنمای رنگ‌ها:</h3>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-color added"></span>
            <span>اضافه شده</span>
          </div>
          <div className="legend-item">
            <span className="legend-color removed"></span>
            <span>حذف شده</span>
          </div>
          <div className="legend-item">
            <span className="legend-color changed"></span>
            <span>تغییر یافته</span>
          </div>
          <div className="legend-item">
            <span className="legend-color attribute"></span>
            <span>ویژگی تغییر کرده</span>
          </div>
        </div>
      </div>
    </div>
  );
};
