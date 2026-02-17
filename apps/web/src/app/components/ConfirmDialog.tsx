'use client';

import { useEffect, useRef, useCallback } from 'react';

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger, onConfirm, onCancel }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCancelRef = useRef(onCancel);
  const hasOpened = useRef(false);
  onCancelRef.current = onCancel;

  useEffect(() => {
    if (!open) {
      hasOpened.current = false;
      return;
    }
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancelRef.current();
    };
    window.addEventListener('keydown', handler);
    // Focus only on initial open, not on every re-render
    if (!hasOpened.current) {
      hasOpened.current = true;
      dialogRef.current?.focus();
    }
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        tabIndex={-1}
        className="card"
        style={{
          width: '100%', maxWidth: 400, padding: 24,
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <h3 id="confirm-dialog-title" style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: 'var(--color-text)' }}>{title}</h3>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} className="btn btn-outline" style={{ padding: '8px 16px' }}>Cancel</button>
          <button
            onClick={onConfirm}
            className="btn"
            style={{
              padding: '8px 16px',
              backgroundColor: danger ? 'var(--color-danger)' : 'var(--color-primary)',
              color: '#fff',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
