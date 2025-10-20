/**
 * Basic functionality tests to verify the refactored library works correctly
 */

const { JSDOM } = require('jsdom');

// Setup DOM environment for testing
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
  resources: 'usable',
});

// Set up global DOM objects
(global as any).document = dom.window.document;
(global as any).window = dom.window;
(global as any).Element = dom.window.Element;
(global as any).Node = dom.window.Node;
(global as any).Text = dom.window.Text;
(global as any).NodeFilter = dom.window.NodeFilter;
(global as any).performance = {
  now: () => Date.now(),
};

// Import our library after setting up DOM
const { getCustomDiffStats, formatTagStatsSummary, ConfigBuilder } = require('../dist/index.js');

describe('Domoscope Library', () => {
  beforeEach(() => {
    // Clear any cached data between tests
    // Reset DOM to clean state
    dom.window.document.body.innerHTML = '';
  });

  test('should handle basic HTML diff', () => {
    const oldHTML = '<div><p>Original content</p></div>';
    const newHTML = '<div><p>Modified content</p></div>';

    const { diffResult, stats } = getCustomDiffStats(oldHTML, newHTML);

    expect(diffResult.rootElements).toHaveLength(2); // old and new versions
    expect(stats.totalChangedTags).toBeGreaterThanOrEqual(0);
    expect(typeof stats.totalAddedTexts).toBe('number');
    expect(typeof stats.totalRemovedTexts).toBe('number');
  });

  test('should track added elements', () => {
    const oldHTML = '<div><p>Original</p></div>';
    const newHTML = '<div><p>Original</p><img src="new.jpg" alt="New"></div>';

    const { stats } = getCustomDiffStats(oldHTML, newHTML);

    expect(stats.totalAddedTags).toBeGreaterThan(0);
    expect(stats.addedTags).toBeDefined();
  });

  test('should work with custom configuration', () => {
    const config = new ConfigBuilder()
      .withStyles({
        addedClass: 'custom-added',
        removedClass: 'custom-removed',
      })
      .trackTags(['p', 'img'])
      .build();

    const oldHTML = '<div><p>Original</p></div>';
    const newHTML = '<div><p>Modified</p><img src="test.jpg"></div>';

    const { diffResult, stats } = getCustomDiffStats(oldHTML, newHTML, config);

    expect(diffResult.rootElements).toHaveLength(2);
    expect(stats).toBeDefined();
  });

  test('should format statistics summary', () => {
    const oldHTML = '<div><p>Original</p></div>';
    const newHTML = '<div><p>Modified</p><span>New</span></div>';

    const { stats } = getCustomDiffStats(oldHTML, newHTML);
    const summary = formatTagStatsSummary(stats);

    expect(typeof summary).toBe('string');
    expect(summary).toContain('DOMOSCOPE DIFF STATISTICS');
  });

  test('should preserve DOM structure', () => {
    const oldHTML = '<div class="container"><p id="text">Original</p></div>';
    const newHTML = '<div class="container"><p id="text">Modified</p></div>';

    const { diffResult } = getCustomDiffStats(oldHTML, newHTML);

    // Check that the original structure is preserved
    const oldRoot = diffResult.rootElements[0];
    const newRoot = diffResult.rootElements[1];

    expect(oldRoot?.tagName).toBe('DIV');
    expect(newRoot?.tagName).toBe('DIV');
    expect(oldRoot?.getAttribute('class')).toBe('container');
    expect(newRoot?.getAttribute('class')).toBe('container');
  });
});
