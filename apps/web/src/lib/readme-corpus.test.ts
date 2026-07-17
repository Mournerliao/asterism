// @vitest-environment happy-dom

import createDOMPurify, { type WindowLike } from 'dompurify';
import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';
import { readmeCorpus, readmeCorpusHtmlFixtures } from '../fixtures/readme-corpus/manifest';
import { sanitizeReadmeHtml } from './readme-content';
import { deriveReadmeOutline } from './readme-outline';

function processFixture(html: string) {
  const window = new Window();
  const purifier = createDOMPurify(window as unknown as WindowLike);
  const sanitized = sanitizeReadmeHtml(
    html,
    'asterism-demo',
    'corpus',
    purifier,
    window.document as unknown as Document,
  );
  return deriveReadmeOutline(sanitized);
}

describe('README fidelity corpus', () => {
  it('maintains the required fixture categories including no-README', () => {
    const ids = readmeCorpus.map((fixture) => fixture.id);
    expect(ids).toEqual([
      'ordinary-gfm',
      'deep-outline',
      'badges-centered',
      'wide-table-code',
      'multilingual-code',
      'media-relative',
      'details',
      'rich-fallback',
      'chinese-content',
      'no-readme',
    ]);
    expect(readmeCorpus.find((fixture) => fixture.id === 'no-readme')?.html).toBeNull();
  });

  it.each(
    readmeCorpusHtmlFixtures,
  )('sanitizes $id without losing required structure', (fixture) => {
    const { html, items } = processFixture(fixture.html);
    for (const token of fixture.mustRetain) {
      expect(html, `${fixture.id} should retain ${token}`).toContain(token);
    }
    for (const token of fixture.mustRemove) {
      expect(html, `${fixture.id} should remove ${token}`).not.toMatch(
        new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
      );
    }
    expect(items.length).toBeGreaterThanOrEqual(fixture.expectOutlineMinItems);
    expect(html).not.toMatch(/<script|javascript:|onerror=/i);
  });

  it('derives a deep outline with stable targets for multilevel headings', () => {
    const deep = readmeCorpusHtmlFixtures.find((fixture) => fixture.id === 'deep-outline');
    expect(deep?.html).toBeTypeOf('string');
    if (!deep?.html) {
      return;
    }
    const { items } = processFixture(deep.html);
    expect(items.length).toBeGreaterThanOrEqual(8);
    expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
    expect(items.some((item) => item.label.includes('中文'))).toBe(true);
  });

  it('rewrites relative media and directory links for the media fixture', () => {
    const media = readmeCorpusHtmlFixtures.find((fixture) => fixture.id === 'media-relative');
    expect(media?.html).toBeTypeOf('string');
    if (!media?.html) {
      return;
    }
    const { html } = processFixture(media.html);
    expect(html).toContain(
      'https://raw.githubusercontent.com/asterism-demo/corpus/HEAD/assets/hero.png',
    );
    expect(html).toContain('https://github.com/asterism-demo/corpus/blob/HEAD/docs/overview.md');
    expect(html).toContain('https://github.com/asterism-demo/corpus/tree/HEAD/examples/');
    expect(html).not.toContain('HEAD/../shared/logo.png');
  });
});
