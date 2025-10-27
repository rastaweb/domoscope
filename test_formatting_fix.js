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

console.log('🧪 Testing formatting change detection\n');

// Test your specific scenario
const oldContent = `
<p class="western">
  اگرچه درد آن می‌تواند آزاردهنده باشد، خوشبختانه بیشترِ بیماران با درمان‌های مرحله‌ای و غیرجراحی بهبود می‌یابند. در این مقاله، طبق راهنمایی
  <b>دکتر محمدرضا شاه محمدی</b>
  متخصص مغز و اعصاب و جراح دیسک کمر و دیدگاه‌های معتبر بین المللی پزشکی با علت درد سیاتیک و روش درمان آن آشنا می‌شوید.
</p>
`;

const newContent = `
<p class="western">
  اگرچه درد آن می‌تواند آزاردهنده باشد، خوشبختانه <strong><em><span style="text-decoration: underline;">بیشترِ</span></em></strong> بیماران با درمان‌های مرحله‌ای و غیرجراحی بهبود می‌یابند. در این مقاله، طبق راهنمایی
  <b>دکتر محمدرضا شاه محمدی</b>
  متخصص مغز و اعصاب و جراح دیسک کمر و دیدگاه‌های معتبر بین المللی پزشکی با علت درد سیاتیک و روش درمان آن آشنا می‌شوید.
</p>
`;

console.log('Test: Formatting change (بیشترِ → <strong><em><span>بیشترِ</span></em></strong>)');
console.log('─'.repeat(70));

const { diffResult, stats } = getCustomDiffStats(oldContent, newContent, {
  watchedTags: ['*'],
  minSimilarityThreshold: 0.5,
});

console.log('\n📊 Results:');
console.log('Total added tags:', Object.keys(stats?.addedTags || {}).length);
console.log('Total removed tags:', Object.keys(stats?.removedTags || {}).length);
console.log('Added tags:', JSON.stringify(stats?.addedTags, null, 2));

// Check the new paragraph
const newP = diffResult.newRootElements[0];
console.log('\n🔍 New paragraph analysis:');
console.log('HTML:', newP.innerHTML.substring(0, 200) + '...');

// Look for formatting change markers
const formattingElements = newP.querySelectorAll('[data-diff-formatting-added]');
console.log('\nFormatting change elements found:', formattingElements.length);

// Look for regular added elements
const addedElements = newP.querySelectorAll('[data-diff-added-tag]');
console.log('Regular added elements found:', addedElements.length);

// Check for diff-element-changed wrappers
const elementChangedWrappers = newP.querySelectorAll('.diff-elem-changed, .diff-element-changed');
console.log('Element-changed wrappers found:', elementChangedWrappers.length);

// Check for diff-added text spans
const addedTextSpans = newP.querySelectorAll('.diff-added');
console.log('Added text spans found:', addedTextSpans.length);

console.log('\n🎯 Analysis:');
if (addedElements.length === 0 && elementChangedWrappers.length === 0) {
  console.log('✅ SUCCESS: No new elements detected as additions');
  console.log('✅ The algorithm correctly identified this as formatting change');
} else {
  console.log('❌ ISSUE: Still detecting elements as additions');
  console.log('Added elements:', addedElements.length);
  console.log('Element wrappers:', elementChangedWrappers.length);
}

if (formattingElements.length > 0) {
  console.log('✅ Formatting change detection working');
} else {
  console.log('ℹ️  Formatting change detection not triggered (might be handled differently)');
}

console.log('\n📝 Expected behavior:');
console.log('- No element-level additions for <strong>, <em>, <span>');
console.log('- Text "بیشترِ" should appear as unchanged or with minimal marking');
console.log('- Formatting changes should be handled gracefully');
