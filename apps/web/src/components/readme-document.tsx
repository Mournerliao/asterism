import { ReadmeDocument as ReadmeDocumentSurface } from '@asterism/ui';
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

  return <ReadmeDocumentSurface sanitizedHtml={sanitizedHtml} label={label} />;
}
