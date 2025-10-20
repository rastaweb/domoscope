/**
 * Simple test to verify basic functionality works
 */

// Import JSDOM for DOM environment
const { JSDOM } = require('jsdom');

// Setup DOM
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;
global.Element = dom.window.Element;
global.Node = dom.window.Node;
global.Text = dom.window.Text;
global.NodeFilter = dom.window.NodeFilter;
global.performance = { now: () => Date.now() };

describe('Domoscope', () => {
  test('should be able to import the library', () => {
    // This will test if our build output can be required properly
    expect(() => {
      require('../dist/index.js');
    }).not.toThrow();
  });

  test('should perform basic diff operation', () => {
    const { getCustomDiffStats } = require('../dist/index.js');

    const oldHTML = '<div>Old content</div>';
    const newHTML = '<div>New content</div>';

    const result = getCustomDiffStats(oldHTML, newHTML);

    expect(result).toBeDefined();
    expect(result.diffResult).toBeDefined();
    expect(result.stats).toBeDefined();
    expect(Array.isArray(result.diffResult.rootElements)).toBe(true);
    expect(typeof result.stats.totalChangedTags).toBe('number');
  });

  test('should generate statistics summary', () => {
    const { getCustomDiffStats, formatTagStatsSummary } = require('../dist/index.js');

    const oldHTML = '<div><p>Original</p></div>';
    const newHTML = '<div><p>Modified</p><span>Added</span></div>';

    const { stats } = getCustomDiffStats(oldHTML, newHTML);
    const summary = formatTagStatsSummary(stats);

    expect(typeof summary).toBe('string');
    expect(summary).toContain('DOMOSCOPE DIFF STATISTICS');
  });
});
