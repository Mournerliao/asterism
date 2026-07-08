import type { RefObject } from 'react';
import { useEffect, useLayoutEffect, useState } from 'react';

export function measureScrollMargin(element: HTMLElement, scrollElement: HTMLElement): number {
  const elementRect = element.getBoundingClientRect();
  const scrollRect = scrollElement.getBoundingClientRect();
  return elementRect.top - scrollRect.top + scrollElement.scrollTop;
}

export function findScrollParent(element: HTMLElement | null): HTMLElement | null {
  if (!element) {
    return null;
  }
  let parent = element.parentElement;
  while (parent) {
    const style = getComputedStyle(parent);
    if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}

export function useScrollMargin(
  elementRef: RefObject<HTMLElement | null>,
  scrollElement: HTMLElement | null | undefined,
): number {
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element || !scrollElement) {
      return;
    }
    setScrollMargin(measureScrollMargin(element, scrollElement));
  });

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !scrollElement) {
      return;
    }
    const update = () => setScrollMargin(measureScrollMargin(element, scrollElement));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    observer.observe(scrollElement);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [elementRef, scrollElement]);

  return scrollMargin;
}
