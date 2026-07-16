import DOMPurify, { type DOMPurify as DOMPurifyInstance } from 'dompurify';

const ALLOWED_TAGS = [
  'a',
  'article',
  'blockquote',
  'br',
  'code',
  'del',
  'details',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'kbd',
  'li',
  'ol',
  'p',
  'pre',
  's',
  'span',
  'strong',
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'ul',
] as const;

const ALLOWED_ATTR = [
  'align',
  'alt',
  'aria-hidden',
  'aria-label',
  'class',
  'colspan',
  'data-canonical-src',
  'dir',
  'height',
  'href',
  'id',
  'open',
  'rel',
  'role',
  'rowspan',
  'src',
  'title',
  'width',
] as const;

const allowedTagSet = new Set<string>(ALLOWED_TAGS);
const allowedAttributeSet = new Set<string>(ALLOWED_ATTR);
const forbiddenTagSet = new Set([
  'form',
  'iframe',
  'input',
  'object',
  'script',
  'style',
  'textarea',
]);

function isHttpUrl(value: string): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function externalLink(href: string, owner: string, name: string): string | null {
  if (href.startsWith('#')) {
    return href;
  }
  if (href.startsWith('//')) {
    return `https:${href}`;
  }
  if (href.startsWith('/')) {
    return `https://github.com${href}`;
  }
  if (isHttpUrl(href) || href.startsWith('mailto:')) {
    return href;
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(href)) {
    return null;
  }
  return `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/blob/HEAD/${href.replace(/^\.\//, '')}`;
}

function imageSource(src: string, owner: string, name: string): string | null {
  if (src.startsWith('//')) {
    return `https:${src}`;
  }
  if (isHttpUrl(src)) {
    return src;
  }
  if (src.startsWith('/') || /^[a-z][a-z\d+.-]*:/i.test(src)) {
    return null;
  }
  return `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/HEAD/${src.replace(/^\.\//, '')}`;
}

export function sanitizeReadmeHtml(
  html: string,
  owner: string,
  name: string,
  purifier: DOMPurifyInstance = DOMPurify,
  documentRoot: Document = document,
): string {
  const sanitized = purifier.sanitize(html, {
    ALLOWED_TAGS: [...ALLOWED_TAGS],
    ALLOWED_ATTR: [...ALLOWED_ATTR],
    ALLOW_ARIA_ATTR: true,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['form', 'iframe', 'input', 'object', 'script', 'style', 'textarea'],
  });
  const container = documentRoot.createElement('div');
  container.innerHTML = String(sanitized);

  for (const element of Array.from(container.querySelectorAll('*'))) {
    const tagName = element.tagName.toLowerCase();
    if (forbiddenTagSet.has(tagName)) {
      element.remove();
      continue;
    }
    if (!allowedTagSet.has(tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      continue;
    }
    for (const attribute of Array.from(element.attributes)) {
      if (!allowedAttributeSet.has(attribute.name.toLowerCase())) {
        element.removeAttribute(attribute.name);
      }
    }
  }

  for (const anchor of container.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    const href = externalLink(anchor.getAttribute('href') ?? '', owner, name);
    if (!href) {
      anchor.removeAttribute('href');
      continue;
    }
    anchor.setAttribute('href', href);
    if (!href.startsWith('#')) {
      anchor.setAttribute('target', '_blank');
      anchor.setAttribute('rel', 'noreferrer noopener');
    }
  }

  for (const image of container.querySelectorAll<HTMLImageElement>('img[src]')) {
    const src = imageSource(image.getAttribute('src') ?? '', owner, name);
    if (src) {
      image.setAttribute('src', src);
      image.setAttribute('loading', 'lazy');
    } else {
      image.removeAttribute('src');
    }
  }

  return container.innerHTML;
}
