export function ReadmeDocument({ sanitizedHtml, label }: { sanitizedHtml: string; label: string }) {
  return (
    <article
      aria-label={label}
      className="markdown-body mx-auto my-6 w-[calc(100%-2rem)] max-w-[60rem] rounded-lg border bg-card px-5 py-7 text-card-foreground sm:w-[calc(100%-3rem)] sm:px-10 sm:py-9"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: The prop name makes the caller's sanitization responsibility explicit.
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
