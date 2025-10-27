#!/usr/bin/env node

/**
 * Test script to verify the nodeKey fix handles content changes properly
 */

// Import JSDOM for DOM environment
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

import { getCustomDiffStats } from './dist/index.js';

console.log('🧪 Testing nodeKey fix for content changes\n');

// Test case 1: Your specific scenario - changing first word in paragraph
console.log('Test 1: First word change in paragraph (سیاتیک → سینماتیک)');
console.log('─'.repeat(60));

const oldContent = `
<div>
  <p class="western">
    اگرچه درد آن می‌تواند آزاردهنده باشد، خوشبختانه بیشترِ بیماران با درمان‌های مرحله‌ای و غیرجراحی بهبود می‌یابند. در این مقاله، طبق راهنمایی
    <b>دکتر محمدرضا شاه محمدی</b>
    متخصص مغز و اعصاب و جراح دیسک کمر و دیدگاه‌های معتبر بین المللی پزشکی با علت درد سیاتیک و روش درمان آن آشنا می‌شوید.
  </p>
  <p class="western">
    <a href="https://drshahmohamadi.com/sciatica/">
      <span style="text-decoration: none;">
        <b>سیاتیک</b>
      </span>
    </a>
    <b></b>
    <b>Sciatica</b>
    اصطلاحی است که به درد ناشی از تحریک یا فشار بر عصب سیاتیک اشاره دارد. عصب سیاتیک، طولانی‌ترین و ضخیم‌ترین عصب در بدن انسان است که از ریشه‌های عصبی در ناحیه کمری نخاع (معمولاً L4 تا S3) شروع می‌شود و نقش حیاتی در انتقال سیگنال‌های حسی و حرکتی به پاها ایفا می‌کند.
  </p>
</div>
`;

const newContent = `
<div>
  <p class="western">
    اگرچه درد آن می‌تواند آزاردهنده باشد، خوشبختانه بیشترِ بیماران با درمان‌های مرحله‌ای و غیرجراحی بهبود می‌یابند. در این مقاله، طبق راهنمایی
    <b>دکتر محمدرضا شاه محمدی</b>
    متخصص مغز و اعصاب و جراح دیسک کمر و دیدگاه‌های معتبر بین المللی پزشکی با علت درد سیاتیک و روش درمان آن آشنا می‌شوید.
  </p>
  <p class="western">
    <a href="https://drshahmohamadi.com/sciatica/">
      <span style="text-decoration: none;">
        <b>سینماتیک</b>
      </span>
    </a>
    <b></b>
    <b>Sciatica</b>
    اصطلاحی است که به درد ناشی از تحریک یا فشار بر عصب سیاتیک اشاره دارد. عصب سیاتیک، طولانی‌ترین و ضخیم‌ترین عصب در بدن انسان است که از ریشه‌های عصبی در ناحیه کمری نخاع (معمولاً L4 تا S3) شروع می‌شود و نقش حیاتی در انتقال سیگنال‌های حسی و حرکتی به پاها ایفا می‌کند.
  </p>
</div>
`;

const { diffResult, stats } = getCustomDiffStats(oldContent, newContent, {
  watchedTags: ['*'],
  addedClass: 'diff-added',
  removedClass: 'diff-removed',
  attributeChangeClass: 'diff-attr-changed',
  elementChangeClass: 'diff-element-changed',
  minSimilarityThreshold: 0.5,
});

console.log('\n📊 Results:');
console.log('Total changed tags:', stats?.totalChangedTags || 0);
console.log('Added tags:', Object.keys(stats?.addedTags || {}).length);
console.log('Removed tags:', Object.keys(stats?.removedTags || {}).length);

// Check if second paragraph was treated as element change vs removed/added
const newP = diffResult.newRootElements[0]?.children[1];
const oldP = diffResult.oldRootElements[0]?.children[1];

console.log('\n🔍 Second paragraph analysis:');
console.log(
  'New P has diff-element-changed wrapper:',
  newP?.parentElement?.classList?.contains('diff-element-changed') || false
);
console.log('New P has data-diff-added-tag:', newP?.getAttribute('data-diff-added-tag') !== null);
console.log(
  'Old P has diff-removed wrapper:',
  oldP?.parentElement?.classList?.contains('diff-removed') || false
);
console.log(
  'Old P has data-diff-removed-tag:',
  oldP?.getAttribute('data-diff-removed-tag') !== null
);

// The fix should result in:
// - NO element-level wrapping (no diff-element-changed)
// - Only text-level changes (diff-added/diff-removed spans within the paragraph)
const isFixed =
  !newP?.getAttribute('data-diff-added-tag') && !oldP?.getAttribute('data-diff-removed-tag');

console.log('\n🎯 Fix Status:', isFixed ? '✅ FIXED' : '❌ STILL BROKEN');

if (isFixed) {
  console.log('✅ The paragraph is now correctly identified as the same element with text changes');
} else {
  console.log('❌ The paragraph is still being treated as removed/added instead of modified');
}

// Test case 2: Test other tag types
console.log('\n\nTest 2: Other tag types');
console.log('─'.repeat(60));

const testCases = [
  {
    name: 'Span with first word change',
    old: '<span>Hello world how are you</span>',
    new: '<span>Hi world how are you</span>',
  },
  {
    name: 'Div with beginning change',
    old: '<div>Start of content with some text</div>',
    new: '<div>Beginning of content with some text</div>',
  },
  {
    name: 'Anchor with href text change',
    old: '<a href="example.com">Click here for more info</a>',
    new: '<a href="example.com">Press here for more info</a>',
  },
];

testCases.forEach((testCase, index) => {
  console.log(`\nTest 2.${index + 1}: ${testCase.name}`);

  const result = getCustomDiffStats(testCase.old, testCase.new, {
    watchedTags: ['*'],
    minSimilarityThreshold: 0.5,
  });

  const hasElementChange = result.stats?.totalChangedTags > 0;
  const hasAddedTags = Object.keys(result.stats?.addedTags || {}).length > 0;
  const hasRemovedTags = Object.keys(result.stats?.removedTags || {}).length > 0;

  const isGoodResult = !hasAddedTags && !hasRemovedTags;
  console.log(`  Result: ${isGoodResult ? '✅ Text-level change' : '❌ Element-level change'}`);
  console.log(`  Added tags: ${hasAddedTags}`);
  console.log(`  Removed tags: ${hasRemovedTags}`);
});

console.log('\n🏁 Test completed!');
