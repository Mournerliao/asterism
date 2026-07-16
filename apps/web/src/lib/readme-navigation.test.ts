import { describe, expect, it } from 'vitest';
import i18n from '../i18n';
import {
  createReadmeDestination,
  type ReadmeRouteState,
  resolveReadmeReturn,
} from './readme-navigation';

describe('README workspace routes', () => {
  it('carries Browse entry back to Browse', () => {
    const destination = createReadmeDestination('openai', 'codex', 'repo-1', '/');

    expect(destination.to).toBe('/repos/openai/codex/readme');
    expect(resolveReadmeReturn(destination.state, 'openai', 'codex')).toEqual({
      to: '/',
      source: 'browse',
    });
  });

  it('carries Collection entry back to its collection route', () => {
    const destination = createReadmeDestination(
      'openai',
      'codex',
      'repo-1',
      '/collections/collection-7',
      'AI tools',
    );

    expect(resolveReadmeReturn(destination.state, 'openai', 'codex')).toEqual({
      to: '/collections/collection-7',
      source: 'collection',
      collectionName: 'AI tools',
    });
  });

  it('falls back to Browse for direct links, invalid sources, or a different repository', () => {
    const invalid = { source: { kind: 'collection', id: '../settings' } } as ReadmeRouteState;
    const otherRepo = createReadmeDestination('openai', 'codex', 'repo-1', '/').state;

    expect(resolveReadmeReturn(undefined, 'openai', 'codex').to).toBe('/');
    expect(resolveReadmeReturn(invalid, 'openai', 'codex').to).toBe('/');
    expect(resolveReadmeReturn(otherRepo, 'openai', 'other-repo').to).toBe('/');
  });

  it.each([
    ['en', 'Read README', 'Back to Browse'],
    ['zh-CN', '阅读 README', '返回浏览'],
  ])('provides the navigation path in %s', async (locale, readLabel, returnLabel) => {
    await i18n.changeLanguage(locale);

    expect(i18n.t('drawer.readReadme')).toBe(readLabel);
    expect(i18n.t('readme.backToBrowse')).toBe(returnLabel);
  });
});
