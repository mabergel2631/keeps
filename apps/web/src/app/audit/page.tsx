'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth';
import { deltasApi, PolicyDelta, DeltaListResponse } from '../../../lib/api';

const severityConfig: Record<string, { bg: string; fg: string; label: string; icon: string }> = {
  critical: { bg: '#fee2e2', fg: '#991b1b', label: 'Critical', icon: '🚨' },
  warning: { bg: '#fef3c7', fg: '#92400e', label: 'Warning', icon: '⚠️' },
  info: { bg: '#dbeafe', fg: '#1e40af', label: 'Info', icon: 'ℹ️' },
};

const deltaTypeLabels: Record<string, string> = {
  increased: 'increased',
  decreased: 'decreased',
  added: 'added',
  removed: 'removed',
  changed: 'changed',
};

const fieldLabels: Record<string, string> = {
  premium_amount: 'Premium',
  coverage_amount: 'Coverage',
  deductible: 'Deductible',
  carrier: 'Carrier',
  policy_number: 'Policy Number',
  policy_type: 'Policy Type',
  renewal_date: 'Renewal Date',
  scope: 'Scope',
};

function formatValue(key: string, value: string | null | undefined): string {
  if (!value) return 'N/A';
  if (['premium_amount', 'coverage_amount', 'deductible'].includes(key)) {
    const num = parseInt(value, 10);
    if (!isNaN(num)) return `$${num.toLocaleString()}`;
  }
  return value;
}

export default function AlertsPage() {
  const { token, logout } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DeltaListResponse | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'unacknowledged'>('unacknowledged');
  const [explaining, setExplaining] = useState<number | null>(null);
  const [explanations, setExplanations] = useState<Record<number, { explanation: string; reasons: string[] }>>({});

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    load();
  }, [token, filter]);

  const load = async () => {
    try {
      const params = filter === 'unacknowledged' ? { acknowledged: false } : {};
      setData(await deltasApi.list(params));
    } catch (err: any) {
      if (err.status === 401) { logout(); router.replace('/login'); return; }
      setError(err.message);
    }
  };

  const handleAcknowledge = async (deltaId: number) => {
    try {
      await deltasApi.acknowledge(deltaId);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAcknowledgeAll = async () => {
    try {
      await deltasApi.acknowledgeAll();
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleExplain = async (delta: PolicyDelta) => {
    if (explanations[delta.id]) return;
    setExplaining(delta.id);
    try {
      const result = await deltasApi.explain(delta.id);
      setExplanations(prev => ({
        ...prev,
        [delta.id]: { explanation: result.explanation, reasons: result.possible_reasons },
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExplaining(null);
    }
  };

  if (!token) return null;

  const unacknowledgedCount = data?.unacknowledged_count || 0;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <nav style={{ marginBottom: 16, fontSize: 13, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={() => router.push('/policies')} style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: 13, padding: 0 }}>Policies</button>
        <span>/</span>
        <span style={{ color: 'var(--color-text)' }}>Alerts</span>
      </nav>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 22 }}>Policy Alerts</h1>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-muted)' }}>
            Changes detected in your policies
          </p>
        </div>
        {unacknowledgedCount > 0 && (
          <button
            onClick={handleAcknowledgeAll}
            className="btn btn-outline"
            style={{ padding: '8px 16px', fontSize: 13 }}
          >
            Mark All as Read
          </button>
        )}
      </div>

      {error && <div style={{ padding: 12, marginBottom: 16, backgroundColor: '#fee', color: '#c00', borderRadius: 4 }}>{error}</div>}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => setFilter('unacknowledged')}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            backgroundColor: filter === 'unacknowledged' ? 'var(--color-primary)' : '#f3f4f6',
            color: filter === 'unacknowledged' ? '#fff' : 'var(--color-text)',
          }}
        >
          Unread {unacknowledgedCount > 0 && `(${unacknowledgedCount})`}
        </button>
        <button
          onClick={() => setFilter('all')}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            backgroundColor: filter === 'all' ? 'var(--color-primary)' : '#f3f4f6',
            color: filter === 'all' ? '#fff' : 'var(--color-text)',
          }}
        >
          All
        </button>
      </div>

      {!data ? (
        <p>Loading...</p>
      ) : data.items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600 }}>
            {filter === 'unacknowledged' ? 'All caught up!' : 'No policy changes detected yet'}
          </h3>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0 }}>
            {filter === 'unacknowledged'
              ? 'You have no unread policy change alerts.'
              : 'Changes to your policies will appear here when detected.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data.items.map((delta: PolicyDelta) => {
            const config = severityConfig[delta.severity] || severityConfig.info;
            const explanation = explanations[delta.id] || (delta.explanation ? { explanation: delta.explanation, reasons: [] } : null);

            return (
              <div
                key={delta.id}
                style={{
                  padding: 0,
                  backgroundColor: '#fff',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${delta.is_acknowledged ? '#e5e7eb' : config.bg}`,
                  overflow: 'hidden',
                  opacity: delta.is_acknowledged ? 0.7 : 1,
                }}
              >
                {/* Header */}
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: config.bg,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{config.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: config.fg, textTransform: 'uppercase' }}>
                      {config.label}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--color-text)' }}>
                      {delta.policy_carrier || 'Policy'} - {delta.policy_type}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {new Date(delta.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Content */}
                <div style={{ padding: 16 }}>
                  <div style={{ marginBottom: 12 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>
                      {fieldLabels[delta.field_key] || delta.field_key} {deltaTypeLabels[delta.delta_type] || delta.delta_type}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{ padding: '8px 12px', backgroundColor: '#f3f4f6', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Before</div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>
                        {formatValue(delta.field_key, delta.old_value)}
                      </div>
                    </div>
                    <span style={{ fontSize: 20, color: 'var(--color-text-muted)' }}>→</span>
                    <div style={{ padding: '8px 12px', backgroundColor: config.bg, borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>After</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: config.fg }}>
                        {formatValue(delta.field_key, delta.new_value)}
                      </div>
                    </div>
                  </div>

                  {/* Explanation */}
                  {explanation && (
                    <div style={{
                      padding: 12,
                      backgroundColor: '#f9fafb',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: 12,
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                        AI Explanation
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--color-text)', margin: '0 0 8px', lineHeight: 1.5 }}>
                        {explanation.explanation}
                      </p>
                      {explanation.reasons.length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                            Possible reasons:
                          </div>
                          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                            {explanation.reasons.map((reason, i) => (
                              <li key={i}>{reason}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {!explanation && (
                      <button
                        onClick={() => handleExplain(delta)}
                        disabled={explaining === delta.id}
                        className="btn btn-outline"
                        style={{ padding: '6px 12px', fontSize: 12 }}
                      >
                        {explaining === delta.id ? 'Analyzing...' : '🤖 Ask AI Why'}
                      </button>
                    )}
                    {!delta.is_acknowledged && (
                      <button
                        onClick={() => handleAcknowledge(delta.id)}
                        className="btn btn-outline"
                        style={{ padding: '6px 12px', fontSize: 12 }}
                      >
                        Mark as Read
                      </button>
                    )}
                    <button
                      onClick={() => router.push(`/policies/${delta.policy_id}`)}
                      className="btn btn-outline"
                      style={{ padding: '6px 12px', fontSize: 12 }}
                    >
                      View Policy
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
