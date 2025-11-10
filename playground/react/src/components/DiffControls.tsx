/**
 * DiffControls Component
 *
 * Provides interactive controls for configuring the diff viewer:
 * - Toggle between different view modes
 * - Configure tracking options
 * - Adjust styling preferences
 * - Export diff results
 */

import React, { useState } from 'react';
import type { ExtendedCompareOptions } from '@rastaweb/domoscope';

interface DiffControlsProps {
  onOptionsChange: (options: Partial<ExtendedCompareOptions>) => void;
  onExport?: () => void;
}

export const DiffControls: React.FC<DiffControlsProps> = ({ onOptionsChange, onExport }) => {
  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified'>('side-by-side');
  const [showStats, setShowStats] = useState(true);
  const [highlightLevel, setHighlightLevel] = useState<'word' | 'line'>('word');
  const [trackedElements, setTrackedElements] = useState({
    links: true,
    images: true,
    buttons: true,
    forms: true,
  });

  const handleViewModeChange = (mode: 'side-by-side' | 'unified') => {
    setViewMode(mode);
    // Could trigger layout change in parent
  };

  const handleHighlightLevelChange = (level: 'word' | 'line') => {
    setHighlightLevel(level);
    onOptionsChange({
      wrapperTag: level === 'word' ? 'span' : 'div',
    });
  };

  const handleTrackedElementsChange = (element: keyof typeof trackedElements) => {
    const newTracked = {
      ...trackedElements,
      [element]: !trackedElements[element],
    };
    setTrackedElements(newTracked);

    // Build watchedTags array based on selection
    const watchedTags: string[] = [];
    if (newTracked.links) watchedTags.push('a');
    if (newTracked.images) watchedTags.push('img');
    if (newTracked.buttons) watchedTags.push('button');
    if (newTracked.forms) watchedTags.push('form', 'input');

    onOptionsChange({
      watchedTags,
    });
  };

  const handleReset = () => {
    setViewMode('side-by-side');
    setShowStats(true);
    setHighlightLevel('word');
    setTrackedElements({
      links: true,
      images: true,
      buttons: true,
      forms: true,
    });
    onOptionsChange({
      watchedTags: ['a', 'img', 'button', 'form', 'input'],
      wrapperTag: 'span',
    });
  };

  return (
    <div className="diff-controls">
      <div className="controls-header">
        <h3 className="controls-title">⚙️ تنظیمات نمایش</h3>
      </div>

      <div className="controls-body">
        {/* View Mode Section */}
        <div className="control-section">
          <h4 className="section-title">حالت نمایش</h4>
          <div className="button-group">
            <button
              className={`mode-button ${viewMode === 'side-by-side' ? 'active' : ''}`}
              onClick={() => handleViewModeChange('side-by-side')}
            >
              <span className="icon">⚏</span>
              دو ستونه
            </button>
            <button
              className={`mode-button ${viewMode === 'unified' ? 'active' : ''}`}
              onClick={() => handleViewModeChange('unified')}
            >
              <span className="icon">☰</span>
              یکپارچه
            </button>
          </div>
        </div>

        {/* Highlight Level Section */}
        <div className="control-section">
          <h4 className="section-title">سطح برجسته‌سازی</h4>
          <div className="button-group">
            <button
              className={`mode-button ${highlightLevel === 'word' ? 'active' : ''}`}
              onClick={() => handleHighlightLevelChange('word')}
            >
              <span className="icon">📝</span>
              کلمه‌ای
            </button>
            <button
              className={`mode-button ${highlightLevel === 'line' ? 'active' : ''}`}
              onClick={() => handleHighlightLevelChange('line')}
            >
              <span className="icon">📄</span>
              خطی
            </button>
          </div>
        </div>

        {/* Tracked Elements Section */}
        <div className="control-section">
          <h4 className="section-title">عناصر قابل ردیابی</h4>
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={trackedElements.links}
                onChange={() => handleTrackedElementsChange('links')}
              />
              <span className="checkbox-text">🔗 لینک‌ها (a)</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={trackedElements.images}
                onChange={() => handleTrackedElementsChange('images')}
              />
              <span className="checkbox-text">🖼️ تصاویر (img)</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={trackedElements.buttons}
                onChange={() => handleTrackedElementsChange('buttons')}
              />
              <span className="checkbox-text">🔘 دکمه‌ها (button)</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={trackedElements.forms}
                onChange={() => handleTrackedElementsChange('forms')}
              />
              <span className="checkbox-text">📋 فرم‌ها (form, input)</span>
            </label>
          </div>
        </div>

        {/* Stats Toggle */}
        <div className="control-section">
          <h4 className="section-title">نمایش</h4>
          <label className="checkbox-label">
            <input type="checkbox" checked={showStats} onChange={() => setShowStats(!showStats)} />
            <span className="checkbox-text">📊 نمایش آمار تفصیلی</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="control-actions">
          <button className="action-button reset-button" onClick={handleReset}>
            <span className="icon">↻</span>
            بازنشانی
          </button>
          {onExport && (
            <button className="action-button export-button" onClick={onExport}>
              <span className="icon">⤓</span>
              خروجی HTML
            </button>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="controls-footer">
        <div className="info-box">
          <p className="info-text">
            <strong>راهنما:</strong> از این کنترل‌ها برای تنظیم نحوه نمایش تفاوت‌ها استفاده کنید.
            عناصر قابل ردیابی به شما کمک می‌کند تا تغییرات خاص را برجسته کنید.
          </p>
        </div>
      </div>
    </div>
  );
};
