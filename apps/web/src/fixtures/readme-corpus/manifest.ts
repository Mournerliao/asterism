import badgesCentered from './badges-centered.html?raw';
import chineseContent from './chinese-content.html?raw';
import deepOutline from './deep-outline.html?raw';
import details from './details.html?raw';
import mediaRelative from './media-relative.html?raw';
import multilingualCode from './multilingual-code.html?raw';
import ordinaryGfm from './ordinary-gfm.html?raw';
import richFallback from './rich-fallback.html?raw';
import wideTableCode from './wide-table-code.html?raw';

export type ReadmeCorpusCategory =
  | 'ordinary-gfm'
  | 'deep-outline'
  | 'badges-centered'
  | 'wide-table-code'
  | 'multilingual-code'
  | 'media-relative'
  | 'details'
  | 'rich-fallback'
  | 'chinese-content'
  | 'no-readme';

export type ReadmeCorpusFixture = {
  id: ReadmeCorpusCategory;
  title: string;
  description: string;
  /** GitHub-like README HTML. Null models the no-README recovery path. */
  html: string | null;
  expectOutlineMinItems: number;
  mustRetain: readonly string[];
  mustRemove: readonly string[];
};

/**
 * Fixed real-world README corpus used as the Issue #10 acceptance gate.
 * Prefer general stylesheet / sanitizer fixes over fixture-specific workarounds.
 */
export const readmeCorpus: readonly ReadmeCorpusFixture[] = [
  {
    id: 'ordinary-gfm',
    title: 'Ordinary GFM',
    description: 'Headings, lists, blockquote, hr, inline code, and fragment links.',
    html: ordinaryGfm,
    expectOutlineMinItems: 2,
    mustRetain: ['<h1', '<h2', '<ul>', '<ol>', '<blockquote>', '<hr', '<code>'],
    mustRemove: ['<script', 'onclick='],
  },
  {
    id: 'deep-outline',
    title: 'Deep outline',
    description: 'Multilevel headings, Chinese labels, and duplicate titles.',
    html: deepOutline,
    expectOutlineMinItems: 8,
    mustRetain: ['<h2', '<h3', '<h4', '<h5', '<h6', '中文小节'],
    mustRemove: [],
  },
  {
    id: 'badges-centered',
    title: 'Badges and centered HTML',
    description: 'HTML-heavy header with badge images and centered intro.',
    html: badgesCentered,
    expectOutlineMinItems: 0,
    mustRetain: ['align="center"', 'img.shields.io', '<h2'],
    mustRemove: ['style='],
  },
  {
    id: 'wide-table-code',
    title: 'Wide tables and code',
    description: 'Overflowing table and long pre/code that must scroll locally.',
    html: wideTableCode,
    expectOutlineMinItems: 2,
    mustRetain: ['<table>', '<pre>', 'language-bash'],
    mustRemove: [],
  },
  {
    id: 'multilingual-code',
    title: 'Multilingual code',
    description: 'TS / Python / Rust / Shell samples with non-Latin greetings.',
    html: multilingualCode,
    expectOutlineMinItems: 2,
    mustRetain: ['language-ts', 'language-python', 'language-rust', '你好', 'こんにちは'],
    mustRemove: [],
  },
  {
    id: 'media-relative',
    title: 'Media and relative paths',
    description: 'Large and relative-path images plus file/directory links.',
    html: mediaRelative,
    expectOutlineMinItems: 0,
    mustRetain: ['assets/hero.png', 'docs/overview.md', 'examples/'],
    mustRemove: ['../outside.md', 'HEAD/../shared/logo.png'],
  },
  {
    id: 'details',
    title: 'Details disclosures',
    description: 'Open and closed details, including Chinese summary text.',
    html: details,
    expectOutlineMinItems: 0,
    mustRetain: ['<details', '<summary>', '故障排查'],
    mustRemove: [],
  },
  {
    id: 'rich-fallback',
    title: 'Rich-content fallbacks',
    description: 'Unsupported embeds and handlers must be stripped safely.',
    html: richFallback,
    expectOutlineMinItems: 0,
    mustRetain: ['<h1', '<h2', '<ul>'],
    mustRemove: ['<video', '<iframe', '<object', '<embed', '<form', '<input', 'onclick='],
  },
  {
    id: 'chinese-content',
    title: 'Chinese content',
    description: 'Chinese headings, lists, links, and details.',
    html: chineseContent,
    expectOutlineMinItems: 2,
    mustRetain: ['中文文档示例', '安装', '配置说明', '常见问题'],
    mustRemove: [],
  },
  {
    id: 'no-readme',
    title: 'No README',
    description: 'Models the typed not_found recovery path rather than HTML.',
    html: null,
    expectOutlineMinItems: 0,
    mustRetain: [],
    mustRemove: [],
  },
] as const;

export const readmeCorpusHtmlFixtures = readmeCorpus.filter(
  (fixture): fixture is ReadmeCorpusFixture & { html: string } => fixture.html != null,
);
