import React from 'react';

export const useRender = (
  elements: Array<Element>,
  containerRef: React.RefObject<HTMLElement | null>
) => {
  React.useEffect(() => {
    if (containerRef.current) {
      elements.forEach((el) => {
        const clonedElement = el.cloneNode(true) as Element;
        containerRef.current!.appendChild(clonedElement);
      });
    }
  }, [elements, containerRef]);
};
