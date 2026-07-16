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
  const sanitizedHtml = sanitizeReadmeHtml(html, owner, name);

  return (
    <article
      aria-label={label}
      className="markdown-body mx-auto my-6 w-[calc(100%-2rem)] max-w-[60rem] rounded-lg border bg-card px-5 py-7 text-card-foreground sm:w-[calc(100%-3rem)] sm:px-10 sm:py-9"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: DOMPurify plus a second explicit allowlist pass run before React receives this HTML.
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
