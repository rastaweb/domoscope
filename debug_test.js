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

const oldContent = `<div>
  <p class="western">
    اگرچه درد آن می‌تواند آزاردهنده باشد، خوشبختانه بیشترِ بیماران با درمان‌های مرحله‌ای و غیرجراحی بهبود می‌یابند. در این مقاله، طبق راهنمایی
    <b>
    دکتر محمدرضا شاه محمدی
  </b>
  متخصص مغز و اعصاب و جراح دیسک کمر و دیدگاه‌های معتبر بین المللی پزشکی با علت درد سیاتیک و روش درمان آن آشنا می‌شوید.
</p>
<p class="western">
  <a href="https://drshahmohamadi.com/sciatica/" data-mce-href="https://drshahmohamadi.com/sciatica/" data-mce-selected="inline-boundary">
  <span style="text-decoration: none;" data-mce-style="text-decoration: none;">
  <b>
  سیاتیک
</b>
</span>
</a>
<b>
</b>
<b>
Sciatica
</b>
اصطلاحی است که به درد ناشی از تحریک یا فشار بر عصب سیاتیک اشاره دارد. عصب سیاتیک، طولانی‌ترین و ضخیم‌ترین عصب در بدن انسان است که از ریشه‌های عصبی در ناحیه کمری نخاع (معمولاً L4 تا S3) شروع می‌شود و نقش حیاتی در انتقال سیگنال‌های حسی و حرکتی به پاها ایفا می‌کند.
</p>
</div>
`;

const newContent = `<div>
  <p class="western">
    اگرچه درد آن می‌تواند آزاردهنده باشد، خوشبختانه بیشترِ بیماران با درمان‌های مرحله‌ای و غیرجراحی بهبود می‌یابند. در این مقاله، طبق راهنمایی
    <b>
    دکتر محمدرضا شاه محمدی
  </b>
  متخصص مغز و اعصاب و جراح دیسک کمر و دیدگاه‌های معتبر بین المللی پزشکی با علت درد سیاتیک و روش درمان آن آشنا می‌شوید.
</p>
<p class="western">
  <a href="https://drshahmohamadi.com/sciatica/" data-mce-href="https://drshahmohamadi.com/sciatica/" data-mce-selected="inline-boundary">
  <span style="text-decoration: none;" data-mce-style="text-decoration: none;">
  <b>
  سینماتیک
</b>
</span>
</a>
<b>
</b>
<b>
Sciatica
</b>
اصطلاحی است که به درد ناشی از تحریک یا فشار بر عصب سیاتیک اشاره دارد. عصب سیاتیک، طولانی‌ترین و ضخیم‌ترین عصب در بدن انسان است که از ریشه‌های عصبی در ناحیه کمری نخاع (معمولاً L4 تا S3) شروع می‌شود و نقش حیاتی در انتقال سیگنال‌های حسی و حرکتی به پاها ایفا می‌کند.
</p>
</div>
`;

console.log('=== TESTING FIXED DIFF DETECTION ===');

const { diffResult, stats } = getCustomDiffStats(oldContent, newContent, {
  watchedTags: ['*'],
  minSimilarityThreshold: 0.5, // Better threshold
});

console.log('Stats:', JSON.stringify(stats, null, 2));

// Let's examine the DOM elements to see what data attributes are set
console.log('\n=== EXAMINING NEW ELEMENTS ===');
diffResult.newRootElements.forEach((element, index) => {
  console.log(`New Element ${index}:`, element.tagName);
  console.log('  - innerHTML:', element.innerHTML.substring(0, 100) + '...');

  // Check if second paragraph still has element-level changes
  if (index === 0) {
    // div
    const secondP = element.children[1];
    if (secondP) {
      console.log('\n  Second P element:');
      console.log('    - data-diff-added-tag:', secondP.getAttribute('data-diff-added-tag'));
      console.log(
        '    - Has wrapper with diff-elem-changed:',
        secondP.parentElement?.classList?.contains('diff-elem-changed')
      );

      // Look for text-level changes instead
      const diffAddedSpans = secondP.querySelectorAll('.diff-added');
      const diffRemovedSpans = secondP.querySelectorAll('.diff-removed');
      console.log('    - Text-level added spans:', diffAddedSpans.length);
      console.log('    - Text-level removed spans:', diffRemovedSpans.length);

      if (diffAddedSpans.length > 0) {
        console.log('    - Added text sample:', diffAddedSpans[0].textContent?.trim());
      }
    }
  }
});

console.log('\n=== RESULT ANALYSIS ===');
const hasElementLevelChanges =
  Object.keys(stats?.addedTags || {}).includes('p') ||
  Object.keys(stats?.removedTags || {}).includes('p');

if (!hasElementLevelChanges) {
  console.log('✅ SUCCESS: No element-level paragraph changes detected');
  console.log(
    '✅ The algorithm now correctly identifies this as text modification within the same paragraph'
  );
} else {
  console.log('❌ STILL BROKEN: Element-level changes detected');
}

console.log('\n📊 Summary:');
console.log('- Total added tags:', Object.keys(stats?.addedTags || {}).length);
console.log('- Total removed tags:', Object.keys(stats?.removedTags || {}).length);
console.log(
  '- Total text changes:',
  (stats?.totalAddedWords || 0) + (stats?.totalRemovedWords || 0)
);
