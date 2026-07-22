import { describe, expect, it } from 'vitest';
import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';

function flattenStrings(value: unknown, path = ''): [string, string][] {
  if (typeof value === 'string') {
    return [[path, value]];
  }
  if (!value || typeof value !== 'object') {
    return [];
  }
  return Object.entries(value).flatMap(([key, child]) =>
    flattenStrings(child, path ? `${path}.${key}` : key),
  );
}

const HAN_LATIN_BOUNDARY =
  /(?:\p{Script=Han}(?:\p{Script=Latin}|\{\{)|(?:\p{Script=Latin}|\}\})\p{Script=Han})/u;

describe('login feature copy', () => {
  it('describes the Phase 1 repository search accurately in both locales', () => {
    expect(en.login.features.search).toBe('Search repository names and descriptions');
    expect(zhCN.login.features.search).toBe('按仓库名称和描述搜索');
  });
});

describe('Simplified Chinese typography', () => {
  it('keeps a half-width space between Chinese and Latin text or interpolations', () => {
    const violations = flattenStrings(zhCN)
      .filter(([, value]) => HAN_LATIN_BOUNDARY.test(value))
      .map(([key, value]) => `${key}: ${value}`);

    expect(violations).toEqual([]);
  });

  it('uses consistent Star terminology', () => {
    const inconsistent = flattenStrings(zhCN)
      .filter(([, value]) => /\bstars?\b/.test(value))
      .map(([key, value]) => `${key}: ${value}`);

    expect(inconsistent).toEqual([]);
  });
});

describe('locale key parity', () => {
  it('defines the same keys in English and Simplified Chinese', () => {
    const enKeys = flattenStrings(en)
      .map(([key]) => key)
      .sort();
    const zhKeys = flattenStrings(zhCN)
      .map(([key]) => key)
      .sort();

    expect(zhKeys).toEqual(enKeys);
  });
});
