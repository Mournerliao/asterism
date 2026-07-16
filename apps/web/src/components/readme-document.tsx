import { ReadmeDocument as ReadmeDocumentSurface } from '@asterism/ui';
import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { sanitizeReadmeHtml } from '../lib/readme-content';

export function ReadmeDocument({
  html,
  owner,
  name,
  label,
}: {
  html: string;
  owner: string;
  name: string;
  label: string;
}) {
  const navigate = useNavigate();
  const documentRef = useRef<HTMLDivElement>(null);
  const sanitizedHtml = useMemo(() => sanitizeReadmeHtml(html, owner, name), [html, owner, name]);
  useEffect(() => {
    const container = documentRef.current;
    if (!container) {
      return;
    }
    const navigateFragment = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const anchor = target.closest<HTMLAnchorElement>('a[href^="#"]');
      const href = anchor?.getAttribute('href');
      if (!href) {
        return;
      }
      let fragmentId: string;
      try {
        fragmentId = decodeURIComponent(href.slice(1));
      } catch {
        fragmentId = href.slice(1);
      }
      const fragmentTarget = Array.from(container.querySelectorAll<HTMLElement>('[id]')).find(
        (element) => element.id === fragmentId,
      );
      event.preventDefault();
      void navigate({ hash: href });
      if (fragmentTarget) {
        if (!fragmentTarget.hasAttribute('tabindex')) {
          fragmentTarget.setAttribute('tabindex', '-1');
        }
        fragmentTarget.focus({ preventScroll: true });
        fragmentTarget.scrollIntoView({ block: 'start' });
      }
    };
    container.addEventListener('click', navigateFragment);
    return () => container.removeEventListener('click', navigateFragment);
  }, [navigate]);

  return (
    <div ref={documentRef}>
      <ReadmeDocumentSurface sanitizedHtml={sanitizedHtml} label={label} />
    </div>
  );
}
