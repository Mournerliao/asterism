import { describe, expect, it } from 'vitest';
import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';

describe('login feature copy', () => {
  it('describes the Phase 1 repository search accurately in both locales', () => {
    expect(en.login.features.search).toBe('Search repository names and descriptions');
    expect(zhCN.login.features.search).toBe('按仓库名称和描述搜索');
  });
});
