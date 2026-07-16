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
      <h1 onclick="alert(1)">Safe title</h1>
      <script>alert(1)</script>
      <form><input value="secret"></form>
      <iframe src="https://evil.example"></iframe>
      <a href="javascript:alert(1)">unsafe</a>
      <img src="data:text/html;base64,PHNjcmlwdD4=" onerror="alert(1)">
    `);

    expect(html).toContain('<h1>Safe title</h1>');
    expect(html).not.toMatch(/script|onclick|onerror|form|input|iframe|javascript:|data:/i);
  });

  it('keeps fragment links inside Asterism and resolves repository-relative links to GitHub', () => {
    const html = sanitize(`
      <a href="#install">Install</a>
      <a href="docs/guide.md">Guide</a>
      <a href="https://example.com">External</a>
      <img src="images/logo.png" alt="Logo">
      <details><summary>More</summary><p>Details body</p></details>
    `);

    expect(html).toContain('href="#install"');
    expect(html).toContain('href="https://github.com/openai/codex/blob/HEAD/docs/guide.md"');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noreferrer noopener"');
    expect(html).toContain(
      'src="https://raw.githubusercontent.com/openai/codex/HEAD/images/logo.png"',
    );
    expect(html).toContain('<details>');
  });
});
