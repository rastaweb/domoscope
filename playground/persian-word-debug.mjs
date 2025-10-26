import { JSDOM } from 'jsdom';
import { getCustomDiffStats } from '../dist/index.js';

// Set up DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;
global.Element = dom.window.Element;
global.Node = dom.window.Node;
global.Text = dom.window.Text;
global.NodeFilter = dom.window.NodeFilter;
global.performance = { now: () => Date.now() };

console.log('🔍 Persian Word Counting Debug\n');

// Test the exact content from your React app
const oldContent = `<p class="western">
  راهنمای درمان درد سیاتیک با بررسی علائم سیاتیک طبق نظر دکتر محمدرضا شاه محمدی متخصص مغز و اعصاب، بهترین جراح دیسک کمر در تهران - عضو انجمن جراحان ستون فقرات اروپا [ Euro Spine ]
</p>`;

const newContent = `<p class="western">
  راهنمای درمان درد سیاتیک با بررسی علائم سیاتیک طبق نظر دکتر محمدرضا شاه متخصص مغز و اعصاب، بهترین جراح دیسک کمر در تهران - عضو انجمن جراحان ستون فقرات اروپا [ Euro Spine ]
</p>`;

console.log('=== Your Exact Content ===');
console.log('Old content length:', oldContent.length);
console.log('New content length:', newContent.length);

// Extract just the text content for analysis
const parser = new dom.window.DOMParser();
const oldDoc = parser.parseFromString(oldContent, 'text/html');
const newDoc = parser.parseFromString(newContent, 'text/html');

const oldText = oldDoc.body.textContent?.trim() || '';
const newText = newDoc.body.textContent?.trim() || '';

console.log('\n=== Text Content Analysis ===');
console.log('Old text:', oldText);
console.log('New text:', newText);

// Word splitting analysis
const oldWords = oldText.split(/\s+/).filter((word) => word.length > 0);
const newWords = newText.split(/\s+/).filter((word) => word.length > 0);

console.log('\n=== Word Analysis ===');
console.log('Old words count:', oldWords.length);
console.log('New words count:', newWords.length);
console.log('Expected word difference:', oldWords.length - newWords.length);

console.log('\n=== Word-by-word comparison ===');
const maxLength = Math.max(oldWords.length, newWords.length);
for (let i = 0; i < maxLength; i++) {
  const oldWord = oldWords[i] || '[MISSING]';
  const newWord = newWords[i] || '[MISSING]';
  const status = oldWord === newWord ? '✓' : '✗';
  console.log(`${(i + 1).toString().padStart(2)}: ${status} "${oldWord}" vs "${newWord}"`);
}

// Run domoscope diff
console.log('\n=== Domoscope Results ===');
const result = getCustomDiffStats(oldContent, newContent, {
  watchedTags: ['*'],
  addedClass: 'diff-added',
  removedClass: 'diff-removed',
  attributeChangeClass: 'diff-attr-changed',
  elementChangeClass: 'diff-element-changed',
  wrapperTag: 'span',
  textWrapperTag: 'span',
});

console.log('Stats:', JSON.stringify(result.stats, null, 2));

// Debug word counting in detail
console.log('\n=== Debug: Check diff result content ===');
if (result.diffResult.oldRootElements[0]) {
  const oldElement = result.diffResult.oldRootElements[0];
  console.log('Old element text content:', oldElement.textContent?.trim());

  // Look for removed text spans
  const removedSpans = oldElement.querySelectorAll('.diff-removed');
  console.log(`Found ${removedSpans.length} removed spans`);

  removedSpans.forEach((span, index) => {
    const text = span.textContent?.trim() || '';
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    console.log(`  Removed span ${index + 1}: "${text}" (${words.length} words)`);
  });
}

if (result.diffResult.newRootElements[0]) {
  const newElement = result.diffResult.newRootElements[0];
  console.log('New element text content:', newElement.textContent?.trim());

  // Look for added text spans
  const addedSpans = newElement.querySelectorAll('.diff-added');
  console.log(`Found ${addedSpans.length} added spans`);

  addedSpans.forEach((span, index) => {
    const text = span.textContent?.trim() || '';
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    console.log(`  Added span ${index + 1}: "${text}" (${words.length} words)`);
  });
}

// Test with simpler Persian example
console.log('\n=== Simple Persian Test ===');
const simpleOld = '<p>دکتر محمدرضا شاه محمدی متخصص</p>';
const simpleNew = '<p>دکتر محمدرضا شاه متخصص</p>';

const simpleResult = getCustomDiffStats(simpleOld, simpleNew, {
  watchedTags: ['*'],
});

console.log('Simple test - Old:', simpleOld);
console.log('Simple test - New:', simpleNew);
console.log('Simple test - Stats:', JSON.stringify(simpleResult.stats, null, 2));

// Test with English equivalent
console.log('\n=== English Equivalent Test ===');
const englishOld = '<p>Dr Mohammad Reza Shah Mohammadi specialist</p>';
const englishNew = '<p>Dr Mohammad Reza Shah specialist</p>';

const englishResult = getCustomDiffStats(englishOld, englishNew, {
  watchedTags: ['*'],
});

console.log('English test - Old:', englishOld);
console.log('English test - New:', englishNew);
console.log('English test - Stats:', JSON.stringify(englishResult.stats, null, 2));
