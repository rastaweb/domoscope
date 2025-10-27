import { getCustomDiffStats } from './dist/index.js';
import { JSDOM } from 'jsdom';

// Setup DOM
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;
global.Element = dom.window.Element;
global.Node = dom.window.Node;
global.Text = dom.window.Text;
global.NodeFilter = dom.window.NodeFilter;
global.performance = { now: () => Date.now() };

console.log('🧪 Testing different configuration approaches\n');

// Test your specific scenario
const oldContent = `
<p class="western">
  اگرچه درد آن می‌تواند آزاردهنده باشد، خوشبختانه بیشترِ بیماران با درمان‌های مرحله‌ای و غیرجراحی بهبود می‌یابند.
</p>
`;

const newContent = `
<p class="western">
  اگرچه درد آن می‌تواند آزاردهنده باشد، خوشبختانه <strong><em><span style="text-decoration: underline;">بیشترِ</span></em></strong> بیماران با درمان‌های مرحله‌ای و غیرجراحی بهبود می‌یابند.
</p>
`;

// Test different configurations
const configs = [
  {
    name: 'Default Configuration',
    config: {
      watchedTags: ['*'],
      minSimilarityThreshold: 0.5,
    },
  },
  {
    name: 'Lower Threshold',
    config: {
      watchedTags: ['*'],
      minSimilarityThreshold: 0.1,
    },
  },
  {
    name: 'Only Watch Structural Tags',
    config: {
      watchedTags: ['div', 'p', 'h1', 'h2', 'h3'],
      minSimilarityThreshold: 0.5,
    },
  },
  {
    name: 'Exclude Formatting Tags',
    config: {
      watchedTags: ['div', 'p', 'h1', 'h2', 'h3', 'img', 'a'],
      minSimilarityThreshold: 0.3,
    },
  },
  {
    name: 'No Watched Tags (Track Only)',
    config: {
      watchedTags: [],
      minSimilarityThreshold: 0.5,
    },
  },
];

configs.forEach((test, index) => {
  console.log(`\n${index + 1}. ${test.name}`);
  console.log('─'.repeat(50));

  const { diffResult, stats } = getCustomDiffStats(oldContent, newContent, test.config);

  console.log('Added tags:', Object.keys(stats?.addedTags || {}).length);
  console.log('Removed tags:', Object.keys(stats?.removedTags || {}).length);
  console.log('Added tags detail:', JSON.stringify(stats?.addedTags, null, 2));

  const newP = diffResult.newRootElements[0];
  const elementChangedWrappers = newP.querySelectorAll('.diff-elem-changed, .diff-element-changed');
  const addedElements = newP.querySelectorAll('[data-diff-added-tag]');

  console.log('Element wrappers found:', elementChangedWrappers.length);
  console.log('Added element markers:', addedElements.length);

  const isGoodResult = addedElements.length === 0 && elementChangedWrappers.length === 0;
  console.log('Result:', isGoodResult ? '✅ Good' : '❌ Still has issues');
});

console.log('\n🎯 Recommendation:');
console.log('Try using the configuration that shows "Good" result in your Vue component.');
