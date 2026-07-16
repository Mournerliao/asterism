import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';
import { deriveReadmeOutline } from './readme-outline';

function derive(html: string) {
  const window = new Window();
  return deriveReadmeOutline(html, window.document as unknown as Document);
}

describe('deriveReadmeOutline', () => {
  it('excludes a leading document title and keeps the shallowest useful level plus its children', () => {
    const result = derive(`
      <h1 id="codex">Codex</h1>
      <p>Developer agent.</p>
      <h2 id="install">Install</h2>
      <h3 id="requirements">Requirements</h3>
      <h4 id="linux">Linux details</h4>
      <h2 id="usage">Usage</h2>
    `);

    expect(result.items).toEqual([
      { id: 'install', label: 'Install', level: 2, parentId: null },
      { id: 'requirements', label: 'Requirements', level: 3, parentId: 'install' },
      { id: 'usage', label: 'Usage', level: 2, parentId: null },
    ]);
  });

  it('keeps meaningful h1 sections and creates stable targets for skipped levels and Unicode headings', () => {
    const result = derive(`
      <h1>概览</h1>
      <h4><a id="user-content-details" href="#user-content-details">Details</a></h4>
      <h1>概览</h1>
    `);

    expect(result.items).toEqual([
      { id: '概览', label: '概览', level: 1, parentId: null },
      { id: 'user-content-details', label: 'Details', level: 4, parentId: '概览' },
      { id: '概览-1', label: '概览', level: 1, parentId: null },
    ]);
    expect(result.html).toContain('<h1 id="概览">概览</h1>');
    expect(result.html).toContain('<h1 id="概览-1">概览</h1>');
  });
});
