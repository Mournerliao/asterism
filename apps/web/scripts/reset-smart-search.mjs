#!/usr/bin/env node
/**
 * 在默认浏览器打开带 `?reset-smart-search` 的本地地址，触发 dev-only 重置钩子
 * （见 src/dev/reset-smart-search.ts）。前提：dev server 已运行、浏览器已登录。
 */
import { spawn } from 'node:child_process';

const base = process.env.ASTERISM_WEB_URL ?? 'http://localhost:5173/';
const target = new URL(base);
target.search = 'reset-smart-search';

const url = target.href;
const commands = {
  win32: ['cmd', ['/c', 'start', '', url]],
  darwin: ['open', [url]],
};
const [command, args] = commands[process.platform] ?? ['xdg-open', [url]];

spawn(command, args, { stdio: 'ignore', detached: true }).unref();
console.log(`Opened ${url}`);
console.log('Requires a running dev server and a signed-in browser session.');
