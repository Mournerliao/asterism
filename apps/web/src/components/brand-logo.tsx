import type { SVGProps } from 'react';

export function BrandLogo({ title, ...props }: SVGProps<SVGSVGElement> & { title?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" role="img" aria-label={title} {...props}>
      <defs>
        <linearGradient id="brand-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--brand-from)" />
          <stop offset="100%" stopColor="var(--brand-to)" />
        </linearGradient>
      </defs>
      <g stroke="url(#brand-gradient)" strokeWidth="1" strokeOpacity="0.5" strokeLinecap="round">
        <line x1="5" y1="6" x2="12" y2="4" />
        <line x1="12" y1="4" x2="19" y2="9" />
        <line x1="5" y1="6" x2="9" y2="14" />
        <line x1="9" y1="14" x2="16" y2="18" />
        <line x1="19" y1="9" x2="16" y2="18" />
      </g>
      <g fill="url(#brand-gradient)">
        <circle cx="5" cy="6" r="1.4" />
        <circle cx="12" cy="4" r="2" />
        <circle cx="19" cy="9" r="1.4" />
        <circle cx="9" cy="14" r="1.4" />
        <circle cx="16" cy="18" r="2" />
      </g>
    </svg>
  );
}
