import createDOMPurify, { type WindowLike } from 'dompurify';
import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';
import { sanitizeReadmeHtml } from './readme-content';

function sanitize(html: string) {
  const window = new Window();
  const purifier = createDOMPurify(window as unknown as WindowLike);
  return sanitizeReadmeHtml(
    html,
    'openai',
    'codex',
    purifier,
    window.document as unknown as Document,
  );
}

describe('sanitizeReadmeHtml', () => {
  it('removes executable markup, event handlers, forms, and unsafe URLs', () => {
    const html = sanitize(`
      <h1 class="fixed inset-0 z-50" onclick="alert(1)">Safe title</h1>
      <script>alert(1)</script>
      <form><input value="secret"></form>
      <iframe src="https://evil.example"></iframe>
      <object data="https://evil.example/plugin"></object>
      <embed src="https://evil.example/plugin">
      <svg><a href="javascript:alert(1)">vector link</a></svg>
      <a href="javascript:alert(1)">unsafe</a>
      <a href="vbscript:msgbox(1)">also unsafe</a>
      <a href="file:///etc/passwd">local file</a>
      <img src="data:text/html;base64,PHNjcmlwdD4=" onerror="alert(1)">
    `);

    expect(html).toContain('<h1>Safe title</h1>');
    expect(html).not.toMatch(
      /<script|onclick|onerror|<form|<input|<iframe|<object|<embed|<svg|javascript:|vbscript:|file:|data:/i,
    );
  });

  it('keeps representative GitHub README structure while stripping presentation injection', () => {
    const html = sanitize(`
      <h1 id="readme">Codex</h1>
      <p align="center" style="position:fixed">Centered <strong>intro</strong></p>
      <blockquote><p>Quote</p></blockquote>
      <ul><li>One</li></ul><ol><li>Two</li></ol>
      <table><thead><tr><th>Feature</th></tr></thead><tbody><tr><td>Safe</td></tr></tbody></table>
      <pre><code class="language-ts">const safe = true</code></pre>
      <a href="https://example.com/build"><img src="https://img.shields.io/badge/build-passing.svg" alt="Build"></a>
      <details open><summary>More</summary><p>Details body</p></details>
      <video autoplay src="https://evil.example/video.mp4"></video>
    `);

    expect(html).toContain('<h1 id="readme">Codex</h1>');
    expect(html).toContain('<p align="center">Centered <strong>intro</strong></p>');
    expect(html).toContain('<blockquote>');
    expect(html).toContain('<table>');
    expect(html).toContain('<pre><code class="language-ts">');
    expect(html).toContain('src="https://img.shields.io/badge/build-passing.svg"');
    expect(html).toContain('<details open=""><summary>More</summary>');
    expect(html).not.toContain('style=');
    expect(html).not.toContain('<video');
  });

  it('classifies workspace, repository, root-relative, and external link destinations', () => {
    const html = sanitize(`
      <a href="#install" target="_blank" rel="opener">Install</a>
      <a href="docs/guide.md">Guide</a>
      <a href="examples/">Examples</a>
      <a href="./LICENSE">License</a>
      <a href="/openai/codex/tree/HEAD/crates">Root path</a>
      <a href="https://example.com">External</a>
      <a href="//docs.example.com/guide">Protocol relative</a>
      <a href="mailto:hello@example.com">Email</a>
      <a href="https://[invalid">Malformed</a>
      <img src="images/logo.png" alt="Logo">
      <img src="//cdn.example.com/logo.png" alt="CDN logo">
      <img src="//[invalid" alt="Malformed image">
      <img src="/root-relative.png" alt="Unsupported root image">
    `);
    const output = new Window().document;
    output.body.innerHTML = html;
    const links = Object.fromEntries(
      Array.from(output.querySelectorAll('a'), (anchor) => [anchor.textContent, anchor]),
    );

    expect(links.Install?.getAttribute('href')).toBe('#install');
    expect(links.Install?.hasAttribute('target')).toBe(false);
    expect(links.Install?.hasAttribute('rel')).toBe(false);
    expect(links.Guide?.getAttribute('href')).toBe(
      'https://github.com/openai/codex/blob/HEAD/docs/guide.md',
    );
    expect(links.Examples?.getAttribute('href')).toBe(
      'https://github.com/openai/codex/tree/HEAD/examples/',
    );
    expect(links.License?.getAttribute('href')).toBe(
      'https://github.com/openai/codex/blob/HEAD/LICENSE',
    );
    expect(links['Root path']?.getAttribute('href')).toBe(
      'https://github.com/openai/codex/tree/HEAD/crates',
    );
    expect(links.External?.getAttribute('href')).toBe('https://example.com');
    expect(links['Protocol relative']?.getAttribute('href')).toBe('https://docs.example.com/guide');
    expect(links.Email?.getAttribute('href')).toBe('mailto:hello@example.com');
    expect(links.Malformed?.hasAttribute('href')).toBe(false);
    for (const label of [
      'Guide',
      'Examples',
      'License',
      'Root path',
      'External',
      'Protocol relative',
      'Email',
    ]) {
      expect(links[label]?.getAttribute('target')).toBe('_blank');
      expect(links[label]?.getAttribute('rel')).toBe('noreferrer noopener');
    }
    expect(html).toContain(
      'src="https://raw.githubusercontent.com/openai/codex/HEAD/images/logo.png"',
    );
    expect(html).toContain('src="https://cdn.example.com/logo.png"');
    expect(html).toContain('<img alt="Malformed image">');
    expect(html).toContain('<img alt="Unsupported root image">');
  });

  it('normalizes parent-relative image paths and drops escapes above the repo root', () => {
    const html = sanitize(`
      <img src="../shared/logo.png" alt="Parent">
      <img src="docs/../assets/hero.png" alt="Normalized">
      <a href="../outside.md">Escape</a>
      <a href="docs/../guide.md">Normalized link</a>
    `);
    expect(html).toContain(
      'src="https://raw.githubusercontent.com/openai/codex/HEAD/assets/hero.png"',
    );
    expect(html).toContain('<img alt="Parent">');
    expect(html).not.toContain('../shared/logo.png');
    expect(html).toContain('href="https://github.com/openai/codex/blob/HEAD/guide.md"');
    expect(html).toContain('>Escape</a>');
    expect(html).not.toContain('../outside.md');
  });
});
