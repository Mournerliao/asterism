import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
  if (n >= 1000) {
    return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  }
  return String(n);
}

/** Relative "time ago" formatter, locale-aware between zh-CN and en. */
export function timeAgo(iso: string, locale: 'zh-CN' | 'en'): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const day = 86_400_000;
  const units: Array<[number, string, string]> = [
    [365 * day, '年', 'y'],
    [30 * day, '个月', 'mo'],
    [7 * day, '周', 'w'],
    [day, '天', 'd'],
    [3_600_000, '小时', 'h'],
    [60_000, '分钟', 'm'],
  ];
  for (const [ms, zh, en] of units) {
    const v = Math.floor(diff / ms);
    if (v >= 1) {
      return locale === 'zh-CN' ? `${v}${zh}前` : `${v}${en} ago`;
    }
  }
  return locale === 'zh-CN' ? '刚刚' : 'just now';
}
