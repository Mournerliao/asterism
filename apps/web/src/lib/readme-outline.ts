export interface ReadmeOutlineItem {
  id: string;
  label: string;
  level: number;
  parentId: string | null;
}

export interface ReadmeOutlineResult {
  html: string;
  items: ReadmeOutlineItem[];
}

interface HeadingCandidate {
  element: HTMLHeadingElement;
  label: string;
  level: number;
}

function headingLevel(element: HTMLHeadingElement): number {
  return Number(element.tagName.slice(1));
}

function isLeadingDocumentTitle(headings: HeadingCandidate[]): boolean {
  if (headings.length < 2 || headings[0]?.level !== 1) {
    return false;
  }

  return !headings.slice(1).some((heading) => heading.level === 1);
}

function stableSlug(label: string): string {
  const slug = label
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .trim()
    .replace(/[\s-]+/g, '-');
  return slug || 'section';
}

function resolveHeadingId(
  heading: HTMLHeadingElement,
  label: string,
  usedIds: Set<string>,
): string {
  const nestedId = heading.querySelector<HTMLElement>('[id]')?.id;
  const anchorFragment = heading
    .querySelector<HTMLAnchorElement>('a[href^="#"]')
    ?.getAttribute('href')
    ?.slice(1);
  if (nestedId) {
    return nestedId;
  }
  if (anchorFragment && usedIds.has(anchorFragment)) {
    return anchorFragment;
  }
  const suppliedId = heading.id || anchorFragment;
  const baseId = suppliedId || stableSlug(label);
  let id = baseId;
  let duplicateIndex = 1;
  while (usedIds.has(id)) {
    id = `${baseId}-${duplicateIndex}`;
    duplicateIndex += 1;
  }
  usedIds.add(id);
  heading.id = id;
  return id;
}

export function deriveReadmeOutline(
  sanitizedHtml: string,
  documentRoot: Document = document,
): ReadmeOutlineResult {
  const container = documentRoot.createElement('div');
  container.innerHTML = sanitizedHtml;
  const headings = Array.from(
    container.querySelectorAll<HTMLHeadingElement>('h1, h2, h3, h4, h5, h6'),
    (element): HeadingCandidate => ({
      element,
      label: element.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      level: headingLevel(element),
    }),
  ).filter((heading) => heading.label.length > 0);
  const usefulHeadings = isLeadingDocumentTitle(headings) ? headings.slice(1) : headings;

  if (usefulHeadings.length < 2) {
    return { html: container.innerHTML, items: [] };
  }

  const topLevel = Math.min(...usefulHeadings.map((heading) => heading.level));
  const childLevel = usefulHeadings
    .map((heading) => heading.level)
    .filter((level) => level > topLevel)
    .sort((left, right) => left - right)[0];
  const selected = usefulHeadings.filter(
    (heading) => heading.level === topLevel || heading.level === childLevel,
  );
  const usedIds = new Set(
    Array.from(container.querySelectorAll<HTMLElement>('[id]'), (element) => element.id),
  );
  for (const heading of selected) {
    if (heading.element.id) {
      usedIds.delete(heading.element.id);
    }
  }
  let parentId: string | null = null;
  const items = selected.map((heading): ReadmeOutlineItem => {
    const id = resolveHeadingId(heading.element, heading.label, usedIds);
    if (heading.level === topLevel) {
      parentId = id;
      return { id, label: heading.label, level: heading.level, parentId: null };
    }
    return { id, label: heading.label, level: heading.level, parentId };
  });

  return { html: container.innerHTML, items };
}
