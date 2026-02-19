'use client';

import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 64, fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '-0.04em', marginBottom: 8 }}>404</div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text)', margin: '0 0 8px' }}>Page not found</h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: '0 0 24px', lineHeight: 1.5 }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={() => router.back()}
            style={{
              padding: '10px 20px', fontSize: 14, fontWeight: 500,
              border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
              backgroundColor: '#fff', color: 'var(--color-text)', cursor: 'pointer',
            }}
          >
            Go Back
          </button>
          <button
            onClick={() => router.push('/policies')}
            style={{
              padding: '10px 20px', fontSize: 14, fontWeight: 600,
              border: 'none', borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-primary)', color: '#fff', cursor: 'pointer',
            }}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
