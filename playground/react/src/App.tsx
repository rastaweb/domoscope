import { useRef } from 'react';
import './App.css';

import { oldContent as _oldContent } from './constants/oldContent';
import { newContent as _newContent } from './constants/newContent';
import { useDiff } from './hooks/useDiff';
import { useRender } from './hooks/useRender';
import { Stats } from './components/Stats';

function App() {
  const { diffResult, stats } = useDiff(_oldContent, _newContent);
  console.log(stats);

  const oldContentRef = useRef<HTMLElement>(null);
  const newContentRef = useRef<HTMLElement>(null);
  useRender(diffResult.oldRootElements, oldContentRef);
  useRender(diffResult.newRootElements, newContentRef);

  return (
    <>
      <Stats stats={stats} />
      <div className="grid grid-cols-2 gap-3 divide-x-2 divide-amber-700">
        <div className="p-3">
          <div className="p-2 bg-zinc-300 rounded-lg mb-4">
            <h1 className="text-2xl font-black">محتوای جدید</h1>
          </div>
          <pre className="whitespace-pre-wrap **:font-semibold text-lg">
            <bdi ref={newContentRef}></bdi>
          </pre>
        </div>
        <div className="p-3">
          <div className="p-2 bg-zinc-300 rounded-lg mb-4">
            <h1 className="text-2xl font-black">محتوای قبلی</h1>
          </div>
          <pre className="whitespace-pre-wrap **:font-semibold text-lg">
            <bdi ref={oldContentRef}></bdi>
          </pre>
        </div>
      </div>
    </>
  );
}

export default App;
