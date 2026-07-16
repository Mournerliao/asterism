import type { ReactNode } from 'react';

const readmeCanvasClassName =
  'mx-auto my-6 w-[calc(100%-2rem)] max-w-[60rem] rounded-lg border bg-card px-5 py-7 text-card-foreground sm:w-[calc(100%-3rem)] sm:px-10 sm:py-9';

export function ReadmeDocument({ sanitizedHtml, label }: { sanitizedHtml: string; label: string }) {
  return (
    <article
      aria-label={label}
      className={`markdown-body readme-document-enter ${readmeCanvasClassName}`}
      data-readme-canvas="content"
      data-readme-style-version="1"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: The prop name makes the caller's sanitization responsibility explicit.
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}

export function ReadmeDocumentSkeleton({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={readmeCanvasClassName}
      data-readme-canvas="skeleton"
      data-readme-style-version="1"
    >
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
