'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Unhandled error:', error);
  }, [error]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>Something went wrong</div>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: '0 0 24px', lineHeight: 1.5 }}>
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          style={{
            padding: '10px 24px', fontSize: 14, fontWeight: 600,
            border: 'none', borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-primary)', color: '#fff', cursor: 'pointer',
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
