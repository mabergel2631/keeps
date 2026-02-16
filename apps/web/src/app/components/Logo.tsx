'use client';

import { APP_NAME } from '../config';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
  showText?: boolean;
}

const SIZES = { sm: 24, md: 32, lg: 44 };
const FONT_SIZES = { sm: 16, md: 20, lg: 28 };

export default function Logo({ size = 'md', variant = 'dark', showText = true }: LogoProps) {
  const px = SIZES[size];
  const fontSize = FONT_SIZES[size];
  const textColor = variant === 'light' ? '#fff' : '#0B1220';

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/covrabl-mark.svg"
        alt=""
        aria-hidden="true"
        width={px}
        height={px}
        style={{ display: 'block' }}
      />
      {showText && (
        <span style={{
          fontSize,
          fontWeight: 700,
          color: textColor,
          letterSpacing: 'var(--letter-spacing-tight)',
          fontFamily: 'var(--font-heading)',
        }}>
          {APP_NAME}
        </span>
      )}
    </span>
  );
}
