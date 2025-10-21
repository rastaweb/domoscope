#!/usr/bin/env node

/**
 * Domoscope - Comprehensive Diff Examples
 *
 * This file demonstrates various types of changes that Domoscope can detect:
 * - Added and removed tags
 * - Text and word-level changes
 * - Attribute changes
 * - Complex mixed changes
 */

import {
  getCustomDiffStats,
  formatTagStatsSummary,
  getChangedTagsList,
  ConfigBuilder,
  ConfigPresets,
} from '../dist/index.js';

console.log('🔍 Domoscope - Comprehensive Diff Examples\n');
console.log('═'.repeat(60));

// Example 1: Added and Removed Tags
function example1() {
  console.log('\n📝 Example 1: Added and Removed Tags');
  console.log('─'.repeat(40));

  const oldHTML = `
<div class="content">
  <h1>Article Title</h1>
  <p>Original paragraph content.</p>
  <ul>
    <li>Item 1</li>
    <li>Item 2</li>
  </ul>
</div>
    `;

  const newHTML = `
<div class="content">
  <h1>Article Title</h1>
  <p>Modified paragraph content with more details.</p>
  <blockquote>This is a new quote that was added.</blockquote>
  <ul>
    <li>Item 1</li>
    <li>Item 2</li>
    <li>Item 3</li>
  </ul>
  <img src="diagram.png" alt="New diagram" />
</div>
    `;

  const { diffResult, stats } = getCustomDiffStats(oldHTML, newHTML, {
    addedClass: 'highlight-added',
    removedClass: 'highlight-removed',
    watchedTags: ['blockquote', 'img', 'li'],
  });

  console.log('Results:');
  console.log(`• Total added elements: ${stats.totalAddedTags}`);
  console.log(`• Total removed elements: ${stats.totalRemovedTags}`);
  console.log(`• Total changed elements: ${stats.totalChangedTags}`);

  if (stats.addedTags) {
    console.log('\nAdded elements breakdown:');
    Object.entries(stats.addedTags).forEach(([tag, count]) => {
      console.log(`  + ${count} ${tag} element(s)`);
    });
  }

  console.log('\n' + formatTagStatsSummary(stats));
}

// Example 2: Text and Word-Level Changes
function example2() {
  console.log('\n📝 Example 2: Text and Word-Level Changes');
  console.log('─'.repeat(40));

  const oldHTML = `
<article>
  <h2>Product Review</h2>
  <p>This product is good and works well for basic needs.</p>
  <p>The price is reasonable at $50.</p>
</article>
    `;

  const newHTML = `
<article>
  <h2>Product Review</h2>
  <p>This product is excellent and works perfectly for advanced needs.</p>
  <p>The price is very reasonable at $45 with discount.</p>
</article>
    `;

  const { diffResult, stats } = getCustomDiffStats(oldHTML, newHTML, {
    addedClass: 'word-added',
    removedClass: 'word-removed',
    wrapperTag: 'mark',
  });

  console.log('Word-level changes detected:');
  console.log(`• Words added: ${stats.totalAddedWords}`);
  console.log(`• Words removed: ${stats.totalRemovedWords}`);
  console.log(`• Text nodes modified: ${stats.totalChangedTags}`);

  // Show some of the actual changes
  console.log('\nChanges detected:');
  console.log('• "good" → "excellent"');
  console.log('• "well" → "perfectly"');
  console.log('• "basic" → "advanced"');
  console.log('• "$50" → "$45 with discount"');
}

// Example 3: Attribute Changes
function example3() {
  console.log('\n📝 Example 3: Attribute Changes');
  console.log('─'.repeat(40));

  const oldHTML = `
<div class="container">
  <img src="old-image.jpg" alt="Old description" width="300" />
  <a href="/old-link" title="Old title">Click here</a>
  <button type="button" disabled>Submit</button>
</div>
    `;

  const newHTML = `
<div class="container updated">
  <img src="new-image.jpg" alt="Updated description" width="400" height="300" />
  <a href="/new-link" title="Updated title" target="_blank">Click here</a>
  <button type="submit">Submit</button>
</div>
    `;

  const { diffResult, stats } = getCustomDiffStats(oldHTML, newHTML, {
    attributeChangeClass: 'attr-changed',
    elementChangeClass: 'element-modified',
    trackedTags: {
      img: ['src', 'alt', 'width', 'height'],
      a: ['href', 'title', 'target'],
      button: ['type', 'disabled'],
      div: ['class'],
    },
  });

  console.log('Attribute changes detected:');
  const changes = getChangedTagsList(stats);
  changes.forEach(({ tagName, count, changedAttributes }) => {
    console.log(`• ${tagName}: ${count} element(s) changed`);
    console.log(`  Attributes: ${changedAttributes.join(', ')}`);
  });

  console.log('\nDetailed changes:');
  console.log('• div class: "container" → "container updated"');
  console.log('• img src: "old-image.jpg" → "new-image.jpg"');
  console.log('• img alt: "Old description" → "Updated description"');
  console.log('• img width: "300" → "400"');
  console.log('• img added height: "300"');
  console.log('• a href: "/old-link" → "/new-link"');
  console.log('• a title: "Old title" → "Updated title"');
  console.log('• a added target: "_blank"');
  console.log('• button type: "button" → "submit"');
  console.log('• button removed disabled attribute');
}

// Example 4: Complex Mixed Changes
function example4() {
  console.log('\n📝 Example 4: Complex Mixed Changes');
  console.log('─'.repeat(40));

  const oldHTML = `
<section class="blog-post">
  <header>
    <h1>How to Use APIs</h1>
    <p class="meta">Published on 2024-01-15</p>
  </header>
  <main>
    <p>APIs are powerful tools for developers.</p>
    <code>fetch('/api/data')</code>
    <p>They allow seamless data exchange.</p>
  </main>
</section>
    `;

  const newHTML = `
<section class="blog-post featured">
  <header>
    <h1>How to Use REST APIs</h1>
    <p class="meta updated">Published on 2024-01-15, Updated on 2024-10-21</p>
    <div class="tags">
      <span class="tag">API</span>
      <span class="tag">Tutorial</span>
    </div>
  </header>
  <main>
    <p>REST APIs are powerful tools for modern developers.</p>
    <pre><code>fetch('/api/v2/data')</code></pre>
    <p>They allow seamless and efficient data exchange.</p>
    <p>Here's an example of error handling:</p>
    <code>try { ... } catch (error) { ... }</code>
  </main>
</section>
    `;

  const config = new ConfigBuilder()
    .withStyles({
      addedClass: 'diff-added',
      removedClass: 'diff-removed',
      elementChangeClass: 'diff-changed',
      attributeChangeClass: 'diff-attr-changed',
    })
    .trackTags(['section', 'h1', 'p', 'code', 'pre', 'div', 'span'])
    .trackAttributes('class')
    .watchTags('div', 'span', 'pre')
    .build();

  const { diffResult, stats } = getCustomDiffStats(oldHTML, newHTML, config);

  console.log('=== COMPREHENSIVE CHANGE ANALYSIS ===');
  console.log(`Total elements changed: ${stats.totalChangedTags}`);
  console.log(`Elements added: ${stats.totalAddedTags}`);
  console.log(`Words added: ${stats.totalAddedWords}`);
  console.log(`Words removed: ${stats.totalRemovedWords}`);

  if (stats.addedTags) {
    console.log('\n=== ADDED ELEMENTS ===');
    Object.entries(stats.addedTags).forEach(([tag, count]) => {
      console.log(`+${count} ${tag} element(s)`);
    });
  }

  if (stats.changedTags) {
    console.log('\n=== CHANGED ELEMENTS ===');
    Object.entries(stats.changedTags).forEach(([tag, data]) => {
      console.log(`~${data.count} ${tag} element(s) modified`);
      if (data.changedAttributes.length > 0) {
        console.log(`  Attributes: ${data.changedAttributes.join(', ')}`);
      }
    });
  }

  console.log('\n' + formatTagStatsSummary(stats));
}

// Example 5: Performance Comparison
function example5() {
  console.log('\n📝 Example 5: Performance Configuration Comparison');
  console.log('─'.repeat(40));

  const oldHTML = '<div>'.repeat(100) + 'content' + '</div>'.repeat(100);
  const newHTML = '<div>'.repeat(100) + 'modified content' + '</div>'.repeat(100);

  // Test with default config
  console.time('Default Config');
  const defaultResult = getCustomDiffStats(oldHTML, newHTML);
  console.timeEnd('Default Config');

  // Test with performance config
  console.time('Performance Config');
  const perfResult = getCustomDiffStats(oldHTML, newHTML, ConfigPresets.performance());
  console.timeEnd('Performance Config');

  console.log('\nPerformance comparison completed');
  console.log(`Default: ${defaultResult.stats.totalChangedTags} changes detected`);
  console.log(`Performance: ${perfResult.stats.totalChangedTags} changes detected`);
}

// Run all examples
async function runAllExamples() {
  try {
    example1();
    example2();
    example3();
    example4();
    example5();

    console.log('\n═'.repeat(60));
    console.log('✅ All examples completed successfully!');
    console.log('\nTo see the visual diff results, open:');
    console.log('  examples/comprehensive-diff-examples.html');
  } catch (error) {
    console.error('\n❌ Error running examples:', error.message);
    console.log('\nMake sure to build the project first:');
    console.log('  npm run build');
  }
}

runAllExamples();
