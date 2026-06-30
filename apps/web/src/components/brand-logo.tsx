import type { SVGProps } from 'react';

/**
 * Asterism 星座 logo：几个连成「星群」的星点，使用 currentColor 上色，
 * 由调用方通过 text-* 类决定颜色（品牌蓝 / 渐变）。
 */
export function BrandLogo({ title, ...props }: SVGProps<SVGSVGElement> & { title?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" role="img" aria-label={title} {...props}>
      <g stroke="currentColor" strokeWidth="1" strokeOpacity="0.5" strokeLinecap="round">
        <line x1="5" y1="6" x2="12" y2="4" />
        <line x1="12" y1="4" x2="19" y2="9" />
        <line x1="5" y1="6" x2="9" y2="14" />
        <line x1="9" y1="14" x2="16" y2="18" />
        <line x1="19" y1="9" x2="16" y2="18" />
      </g>
      <g fill="currentColor">
        <circle cx="5" cy="6" r="1.4" />
        <circle cx="12" cy="4" r="2" />
        <circle cx="19" cy="9" r="1.4" />
        <circle cx="9" cy="14" r="1.4" />
        <circle cx="16" cy="18" r="2" />
      </g>
    </svg>
  );
}
