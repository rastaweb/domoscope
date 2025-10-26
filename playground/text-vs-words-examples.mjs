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

console.log('📊 Text vs Words Statistics Examples\n');

// Example 1: Single paragraph with multiple words
console.log('=== Example 1: Add Single Paragraph ===');
const old1 = '<div><p>Original content.</p></div>';
const new1 = '<div><p>Original content.</p><p>Added new paragraph with five words.</p></div>';

const result1 = getCustomDiffStats(old1, new1);
console.log('Old:', old1);
console.log('New:', new1);
console.log(
  `Results: ${result1.stats.totalAddedTexts} added texts, ${result1.stats.totalAddedWords} added words`
);
console.log('Explanation: 1 paragraph = 1 text node, but contains 5 words\n');

// Example 2: Multiple separate text elements
console.log('=== Example 2: Add Multiple Elements ===');
const old2 = '<div><span>Hello</span></div>';
const new2 = '<div><span>Hello</span><span>beautiful</span><span>world</span></div>';

const result2 = getCustomDiffStats(old2, new2);
console.log('Old:', old2);
console.log('New:', new2);
console.log(
  `Results: ${result2.stats.totalAddedTexts} added texts, ${result2.stats.totalAddedWords} added words`
);
console.log('Explanation: 2 separate spans = 2 text nodes, each with 1 word = 2 words\n');

// Example 3: List with multiple items
console.log('=== Example 3: Add List Items ===');
const old3 = '<ul><li>First item</li></ul>';
const new3 = '<ul><li>First item</li><li>Second item here</li><li>Third item example</li></ul>';

const result3 = getCustomDiffStats(old3, new3);
console.log('Old:', old3);
console.log('New:', new3);
console.log(
  `Results: ${result3.stats.totalAddedTexts} added texts, ${result3.stats.totalAddedWords} added words`
);
console.log('Explanation: 2 list items = 2 text nodes, containing 3+3=6 words total\n');

// Example 4: Complex nested structure
console.log('=== Example 4: Complex Nested Content ===');
const old4 = '<article><h1>Title</h1></article>';
const new4 = `<article>
  <h1>Title</h1>
  <p>This paragraph has many words to demonstrate counting.</p>
  <div>
    <span>Short span.</span>
    <em>Emphasized text with multiple words here.</em>
  </div>
</article>`;

const result4 = getCustomDiffStats(old4, new4);
console.log('Old:', old4);
console.log('New:', new4);
console.log(
  `Results: ${result4.stats.totalAddedTexts} added texts, ${result4.stats.totalAddedWords} added words`
);
console.log('Explanation: 3 text elements (p, span, em) = 3 texts, but many words total\n');

// Example 5: Whitespace handling
console.log('=== Example 5: Whitespace Handling ===');
const old5 = '<div>Content</div>';
const new5 = '<div>Content</div><div>   </div><div>Real content here</div>';

const result5 = getCustomDiffStats(old5, new5, { ignoreWhitespaceTexts: false });
const result5Filtered = getCustomDiffStats(old5, new5, { ignoreWhitespaceTexts: true });

console.log('Old:', old5);
console.log('New:', new5);
console.log(
  `Without filtering: ${result5.stats.totalAddedTexts} texts, ${result5.stats.totalAddedWords} words`
);
console.log(
  `With whitespace filtering: ${result5Filtered.stats.totalAddedTexts} texts, ${result5Filtered.stats.totalAddedWords} words`
);
console.log('Explanation: Whitespace-only text nodes can be filtered out\n');

// Summary table
console.log('=== 📋 Summary Table ===');
console.log('┌─────────────────────────────────┬───────┬───────┬──────────────────────┐');
console.log('│ Scenario                        │ Texts │ Words │ Explanation          │');
console.log('├─────────────────────────────────┼───────┼───────┼──────────────────────┤');
console.log('│ Single paragraph (5 words)      │   1   │   5   │ 1 element, 5 words   │');
console.log('│ Two separate spans (1 word each)│   2   │   2   │ 2 elements, 1 each   │');
console.log('│ Two list items (3 words each)   │   2   │   6   │ 2 elements, 3 each   │');
console.log('│ Complex nested (3 elements)     │   3   │  15+  │ Multiple structures  │');
console.log('└─────────────────────────────────┴───────┴───────┴──────────────────────┘');

console.log('\n💡 Key Takeaways:');
console.log('• totalAddedTexts = number of DOM text-containing elements added');
console.log('• totalAddedWords = sum of all words across all added text elements');
console.log('• One text element can contain multiple words');
console.log('• Multiple text elements each contribute to both counts');
console.log('• Whitespace-only text nodes can optionally be ignored');
