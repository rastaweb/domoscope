import React from 'react';
import { getCustomDiffStats, type DiffStats } from 'domoscope';

interface StatsDisplayProps {
  stats: DiffStats;
}

const StatsDisplay: React.FC<StatsDisplayProps> = ({ stats }) => {
  return (
    <div className="bg-slate-100 p-4 rounded-lg">
      <h2 className="text-xl font-bold mb-4 text-slate-800">Diff Statistics</h2>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-3 rounded shadow">
          <div className="text-sm text-slate-600">Changed Tags</div>
          <div className="text-2xl font-bold text-blue-600">{stats.totalChangedTags}</div>
        </div>
        <div className="bg-white p-3 rounded shadow">
          <div className="text-sm text-slate-600">Added Tags</div>
          <div className="text-2xl font-bold text-green-600">{stats.totalAddedTags}</div>
        </div>
        <div className="bg-white p-3 rounded shadow">
          <div className="text-sm text-slate-600">Removed Tags</div>
          <div className="text-2xl font-bold text-red-600">{stats.totalRemovedTags}</div>
        </div>
        <div className="bg-white p-3 rounded shadow">
          <div className="text-sm text-slate-600">Text Changes</div>
          <div className="text-xs text-slate-500">
            <span className="text-green-600">+{stats.totalAddedTexts}</span> /
            <span className="text-red-600 ml-1">-{stats.totalRemovedTexts}</span>
          </div>
        </div>
      </div>

      {/* Word Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-3 rounded shadow">
          <div className="text-sm text-slate-600">Words Added</div>
          <div className="text-lg font-bold text-green-600">{stats.totalAddedWords}</div>
        </div>
        <div className="bg-white p-3 rounded shadow">
          <div className="text-sm text-slate-600">Words Removed</div>
          <div className="text-lg font-bold text-red-600">{stats.totalRemovedWords}</div>
        </div>
      </div>

      {/* Detailed Tag Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Added Tags */}
        {stats.addedTags && Object.keys(stats.addedTags).length > 0 && (
          <div className="bg-white p-3 rounded shadow">
            <h3 className="font-semibold text-green-700 mb-2">Added Tags</h3>
            <div className="space-y-1">
              {Object.entries(stats.addedTags).map(([tag, count]) => (
                <div key={tag} className="flex justify-between text-sm">
                  <span className="font-mono text-green-600">&lt;{tag}&gt;</span>
                  <span className="font-bold">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Removed Tags */}
        {stats.removedTags && Object.keys(stats.removedTags).length > 0 && (
          <div className="bg-white p-3 rounded shadow">
            <h3 className="font-semibold text-red-700 mb-2">Removed Tags</h3>
            <div className="space-y-1">
              {Object.entries(stats.removedTags).map(([tag, count]) => (
                <div key={tag} className="flex justify-between text-sm">
                  <span className="font-mono text-red-600">&lt;{tag}&gt;</span>
                  <span className="font-bold">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Changed Tags */}
        {stats.changedTags && Object.keys(stats.changedTags).length > 0 && (
          <div className="bg-white p-3 rounded shadow">
            <h3 className="font-semibold text-blue-700 mb-2">Changed Tags</h3>
            <div className="space-y-2">
              {Object.entries(stats.changedTags).map(([tag, info]) => (
                <div key={tag} className="text-sm">
                  <div className="flex justify-between">
                    <span className="font-mono text-blue-600">&lt;{tag}&gt;</span>
                    <span className="font-bold">{info.count}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {info.changedAttributes.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const App = () => {
  const [oldContent, setOldContent] = React.useState(
    `<h1>man title hastam</h1>
<p>lorem ipsum oblador amet dide.</p>
<p>man paragraph 2 hastam 
  <span>manam span hastam</span>
</p>`
  );

  const [newContent, setNewContent] = React.useState(
    `<h1>man updated title hastam</h1>
<p>lorem ipsum oblador amet dide with more content.</p>
<p>man paragraph 2 hastam 
  <span class="highlight">manam span hastam</span>
</p>
<div>new added div element</div>`
  );

  const oldRenderWrapper = React.useRef<HTMLDivElement>(null);
  const newRenderWrapper = React.useRef<HTMLDivElement>(null);

  // Generate diff result
  const { diffResult, stats } = React.useMemo(() => {
    return getCustomDiffStats(oldContent, newContent, {
      trackedTags: ['*'],
      watchedTags: ['*'],
      addedClass: 'diff-added',
      removedClass: 'diff-removed',
      attributeChangeClass: 'diff-attr-changed',
      elementChangeClass: 'diff-element-changed',
      wrapperTag: 'span',
      textWrapperTag: 'span',
      ignoreWhitespaceTexts: true,
    });
  }, [oldContent, newContent]);

  console.log('Diff result:', diffResult);
  console.log('Stats:', stats);
  console.log('Old root elements count:', diffResult.oldRootElements.length);
  console.log('New root elements count:', diffResult.newRootElements.length);
  console.log('Total root elements count:', diffResult.rootElements.length);

  // Use the separated old and new root elements directly
  const { oldElements, newElements } = React.useMemo(() => {
    return {
      oldElements: diffResult.oldRootElements,
      newElements: diffResult.newRootElements,
    };
  }, [diffResult]);

  console.log('Old elements:', oldElements.length);
  console.log('New elements:', newElements.length);

  // Render the left side (old content with only removed highlights visible)
  React.useEffect(() => {
    if (oldRenderWrapper.current && oldElements.length > 0) {
      oldRenderWrapper.current.innerHTML = '';

      // Append all old elements
      oldElements.forEach((element) => {
        const clonedElement = element.cloneNode(true) as Element;
        oldRenderWrapper.current!.appendChild(clonedElement);
      });

      // Hide added content and keep only removed content highlights on left side
      const leftContainer = oldRenderWrapper.current;
      leftContainer.querySelectorAll('.diff-added').forEach((el) => {
        (el as HTMLElement).style.display = 'none';
      });

      // Remove attribute change highlights from left side
      leftContainer.querySelectorAll('.diff-attr-changed').forEach((el) => {
        el.classList.remove('diff-attr-changed');
      });
      leftContainer.querySelectorAll('.diff-element-changed').forEach((el) => {
        el.classList.remove('diff-element-changed');
      });
    }
  }, [oldElements]);

  // Render the right side (new content with only added/changed highlights visible)
  React.useEffect(() => {
    if (newRenderWrapper.current && newElements.length > 0) {
      newRenderWrapper.current.innerHTML = '';

      // Append all new elements
      newElements.forEach((element) => {
        const clonedElement = element.cloneNode(true) as Element;
        newRenderWrapper.current!.appendChild(clonedElement);
      });

      // Hide removed content on right side
      const rightContainer = newRenderWrapper.current;
      rightContainer.querySelectorAll('.diff-removed').forEach((el) => {
        (el as HTMLElement).style.display = 'none';
      });
    }
  }, [newElements]);

  return (
    <>
      <div className="flex flex-col p-2 gap-5">
        {/* STATS DISPLAY */}
        <StatsDisplay stats={stats} />

        {/* EDITOR */}
        <div className="flex gap-2">
          {/* OLD CONTENT */}
          <div className="flex flex-col w-1/2 gap-2">
            <h1 className="bg-slate-700 text-white p-3 rounded">OLD CONTENT</h1>
            <textarea
              className="border border-slate-600 rounded w-full p-2 font-mono text-sm"
              rows={15}
              value={oldContent}
              onChange={(e) => setOldContent(e.target.value)}
            />
          </div>
          {/* NEW CONTENT */}
          <div className="flex flex-col w-1/2 gap-2">
            <h1 className="bg-slate-700 text-white p-3 rounded">NEW CONTENT</h1>
            <textarea
              className="border border-slate-600 rounded w-full p-2 font-mono text-sm"
              rows={15}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
            />
          </div>
        </div>

        {/* DIFF RESULTS RENDER */}
        <div className="flex gap-2">
          {/* RENDER LEFT SIDE: OLD CONTENT WITH ONLY REMOVED HIGHLIGHTS */}
          <div className="flex flex-col w-1/2 gap-2">
            <h1 className="bg-red-600 text-white p-3 rounded flex items-center">
              <span className="mr-2">🔴</span>
              OLD CONTENT (Only Removed Highlights)
            </h1>
            <div
              ref={oldRenderWrapper}
              className="border border-slate-600 w-full rounded p-4 min-h-[200px] bg-white"
            />
          </div>
          {/* RENDER RIGHT SIDE: NEW CONTENT WITH ADDED/CHANGED HIGHLIGHTS (NO REMOVED) */}
          <div className="flex flex-col w-1/2 gap-2">
            <h1 className="bg-green-600 text-white p-3 rounded flex items-center">
              <span className="mr-2">🟢</span>
              NEW CONTENT (Added & Changed, No Removed)
            </h1>
            <div
              ref={newRenderWrapper}
              className="border border-slate-600 w-full rounded p-4 min-h-[200px] bg-white"
            />
          </div>
        </div>

        {/* LEGEND */}
        <div className="bg-white p-4 rounded-lg border border-slate-300">
          <h3 className="font-bold text-slate-800 mb-3">Diff Legend</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="diff-added px-2 py-1 text-sm">Added Content</span>
              <span className="text-sm text-slate-600">Green background, white text</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="diff-removed px-2 py-1 text-sm">Removed Content</span>
              <span className="text-sm text-slate-600">
                Red background, white text, strikethrough
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="diff-attr-changed px-2 py-1 text-sm border border-slate-300">
                Changed Attributes
              </span>
              <span className="text-sm text-slate-600">Blue outline</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="diff-element-changed px-2 py-1 text-sm">Modified Elements</span>
              <span className="text-sm text-slate-600">Orange dashed border</span>
            </div>
          </div>
        </div>

        {/* INSTRUCTIONS */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-bold text-blue-800 mb-2">Instructions</h3>
          <ul className="text-blue-700 text-sm space-y-1">
            <li>• Modify the content in the textareas above to see live diff highlighting</li>
            <li>
              • <strong>Left side:</strong> Shows OLD content with only{' '}
              <span className="diff-removed px-1">removed highlights (red)</span>
            </li>
            <li>
              • <strong>Right side:</strong> Shows NEW content with{' '}
              <span className="diff-added px-1">added content (green)</span> and{' '}
              <span className="diff-attr-changed px-1">changed attributes (blue outline)</span>
            </li>
            <li>• Removed content is hidden on the right side</li>
            <li>• The statistics panel shows detailed change metrics for both sides</li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default App;
