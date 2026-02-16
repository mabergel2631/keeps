'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth';
import { certificatesApi, policiesApi, Certificate, CertificateCreate, Policy } from '../../../lib/api';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

const COUNTERPARTY_TYPES = [
  { value: 'landlord', label: 'Landlord' },
  { value: 'lender', label: 'Lender' },
  { value: 'client', label: 'Client' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'property_manager', label: 'Property Manager' },
  { value: 'other', label: 'Other' },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: '#dcfce7', text: '#166534' },
  expiring: { bg: '#fef9c3', text: '#854d0e' },
  expired: { bg: '#fee2e2', text: '#991b1b' },
  pending: { bg: '#f3f4f6', text: '#374151' },
};

const COVERAGE_TYPE_OPTIONS = ['General Liability', 'Auto', 'Workers Comp', 'Umbrella', 'Professional Liability', 'Property'];

export default function CertificatesPage() {
  const { token, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'issued' | 'received'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [form, setForm] = useState<CertificateCreate>({
    direction: 'issued',
    counterparty_name: '',
    counterparty_type: 'client',
  });

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    load();
  }, [token]);

  async function load() {
    try {
      const [certs, pols] = await Promise.all([
        certificatesApi.list(),
        policiesApi.list(),
      ]);
      setCertificates(certs);
      setPolicies(pols);
    } catch {
      toast('Failed to load certificates', 'error');
    } finally {
      setLoading(false);
    }
  }

  const filtered = tab === 'all' ? certificates : certificates.filter(c => c.direction === tab);

  function resetForm() {
    setForm({ direction: 'issued', counterparty_name: '', counterparty_type: 'client' });
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(cert: Certificate) {
    setForm({
      direction: cert.direction,
      policy_id: cert.policy_id,
      counterparty_name: cert.counterparty_name,
      counterparty_type: cert.counterparty_type,
      counterparty_email: cert.counterparty_email,
      carrier: cert.carrier,
      policy_number: cert.policy_number,
      coverage_types: cert.coverage_types,
      coverage_amount: cert.coverage_amount,
      additional_insured: cert.additional_insured,
      waiver_of_subrogation: cert.waiver_of_subrogation,
      minimum_coverage: cert.minimum_coverage,
      effective_date: cert.effective_date,
      expiration_date: cert.expiration_date,
      notes: cert.notes,
    });
    setEditingId(cert.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.counterparty_name.trim()) { toast('Counterparty name is required', 'error'); return; }
    try {
      if (editingId) {
        await certificatesApi.update(editingId, form);
        toast('Certificate updated');
      } else {
        await certificatesApi.create(form);
        toast('Certificate added');
      }
      resetForm();
      load();
    } catch {
      toast('Failed to save certificate', 'error');
    }
  }

  async function handleDelete(id: number) {
    try {
      await certificatesApi.remove(id);
      toast('Certificate deleted');
      setDeleteConfirm(null);
      load();
    } catch {
      toast('Failed to delete', 'error');
    }
  }

  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 4 };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: 14 };

  if (loading) {
    return (
      <div style={{ padding: 32, maxWidth: 960, margin: '0 auto' }}>
        <div style={{ height: 32, width: 200, backgroundColor: '#f3f4f6', borderRadius: 8, marginBottom: 24 }} />
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 100, backgroundColor: '#f3f4f6', borderRadius: 12, marginBottom: 12 }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: 32, maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Certificates of Insurance</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>Track COIs you issue and receive</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          style={{
            padding: '10px 20px', backgroundColor: 'var(--color-primary)', color: '#fff',
            border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 14, cursor: 'pointer',
          }}
        >
          + Add Certificate
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid var(--color-border)' }}>
        {(['all', 'issued', 'received'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 20px', border: 'none', borderBottom: tab === t ? '2px solid var(--color-primary)' : '2px solid transparent',
              marginBottom: -2, backgroundColor: 'transparent', fontWeight: tab === t ? 600 : 400,
              color: tab === t ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              cursor: 'pointer', fontSize: 14, textTransform: 'capitalize',
            }}
          >
            {t === 'all' ? `All (${certificates.length})` : `${t} (${certificates.filter(c => c.direction === t).length})`}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-secondary)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📜</div>
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No certificates yet</p>
          <p style={{ fontSize: 13 }}>
            {tab === 'issued' ? 'Track COIs you provide to landlords, lenders, or clients.' :
             tab === 'received' ? 'Track COIs you receive from vendors, contractors, or tenants.' :
             'Add certificates to track proof of insurance you issue or receive.'}
          </p>
        </div>
      )}

      {/* Certificate cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map(cert => {
          const sc = STATUS_COLORS[cert.status] || STATUS_COLORS.pending;
          const ctLabel = COUNTERPARTY_TYPES.find(ct => ct.value === cert.counterparty_type)?.label || cert.counterparty_type;
          return (
            <div
              key={cert.id}
              style={{
                border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
                padding: 20, backgroundColor: '#fff',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 16, fontWeight: 700 }}>{cert.counterparty_name}</span>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                      backgroundColor: cert.direction === 'issued' ? '#dbeafe' : '#fce7f3',
                      color: cert.direction === 'issued' ? '#1e40af' : '#9d174d',
                    }}>
                      {cert.direction === 'issued' ? 'Issued' : 'Received'}
                    </span>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                      backgroundColor: sc.bg, color: sc.text,
                    }}>
                      {cert.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{ctLabel}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => startEdit(cert)} style={{ padding: '4px 10px', fontSize: 12, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', backgroundColor: '#fff', cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => setDeleteConfirm(cert.id)} style={{ padding: '4px 10px', fontSize: 12, border: '1px solid #fca5a5', borderRadius: 'var(--radius-sm)', backgroundColor: '#fff', color: '#dc2626', cursor: 'pointer' }}>Delete</button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, fontSize: 13 }}>
                {cert.coverage_types && (
                  <div><span style={{ color: 'var(--color-text-secondary)' }}>Coverage: </span>{cert.coverage_types}</div>
                )}
                {cert.coverage_amount != null && (
                  <div><span style={{ color: 'var(--color-text-secondary)' }}>Amount: </span>${(cert.coverage_amount / 100).toLocaleString()}</div>
                )}
                {cert.expiration_date && (
                  <div><span style={{ color: 'var(--color-text-secondary)' }}>Expires: </span>{cert.expiration_date}</div>
                )}
                {cert.direction === 'issued' && cert.policy_carrier && (
                  <div><span style={{ color: 'var(--color-text-secondary)' }}>Policy: </span>{cert.policy_carrier} ({cert.policy_type})</div>
                )}
                {cert.direction === 'received' && cert.carrier && (
                  <div><span style={{ color: 'var(--color-text-secondary)' }}>Carrier: </span>{cert.carrier}</div>
                )}
                {cert.additional_insured && (
                  <div style={{ color: '#166534', fontWeight: 600 }}>Additional Insured</div>
                )}
                {cert.waiver_of_subrogation && (
                  <div style={{ color: '#166534', fontWeight: 600 }}>Waiver of Subrogation</div>
                )}
              </div>

              {/* Compliance check for received certificates */}
              {cert.direction === 'received' && cert.minimum_coverage != null && cert.coverage_amount != null && (
                <div style={{
                  marginTop: 10, padding: '6px 10px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600,
                  backgroundColor: cert.coverage_amount >= cert.minimum_coverage ? '#dcfce7' : '#fee2e2',
                  color: cert.coverage_amount >= cert.minimum_coverage ? '#166534' : '#991b1b',
                }}>
                  {cert.coverage_amount >= cert.minimum_coverage
                    ? `Meets requirement ($${(cert.minimum_coverage / 100).toLocaleString()} minimum)`
                    : `Below requirement: $${(cert.coverage_amount / 100).toLocaleString()} / $${(cert.minimum_coverage / 100).toLocaleString()} required`
                  }
                </div>
              )}

              {cert.notes && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>{cert.notes}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: 'var(--radius-lg)', padding: 28, maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
              {editingId ? 'Edit Certificate' : 'Add Certificate'}
            </h2>

            {/* Direction toggle */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Direction</label>
              <div style={{ display: 'flex', gap: 0, borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                {(['issued', 'received'] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setForm(f => ({ ...f, direction: d }))}
                    style={{
                      flex: 1, padding: '8px 16px', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      backgroundColor: form.direction === d ? 'var(--color-primary)' : '#fff',
                      color: form.direction === d ? '#fff' : 'var(--color-text)',
                    }}
                  >
                    {d === 'issued' ? 'I Issued (outgoing)' : 'I Received (incoming)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Counterparty */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Counterparty Name *</label>
                <input style={inputStyle} value={form.counterparty_name} onChange={e => setForm(f => ({ ...f, counterparty_name: e.target.value }))} placeholder="e.g. ABC Property Management" />
              </div>
              <div>
                <label style={labelStyle}>Counterparty Type</label>
                <select style={inputStyle} value={form.counterparty_type} onChange={e => setForm(f => ({ ...f, counterparty_type: e.target.value }))}>
                  {COUNTERPARTY_TYPES.map(ct => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Counterparty Email</label>
              <input style={inputStyle} type="email" value={form.counterparty_email || ''} onChange={e => setForm(f => ({ ...f, counterparty_email: e.target.value || null }))} placeholder="Optional - for reminders" />
            </div>

            {/* Linked policy (for issued) */}
            {form.direction === 'issued' && (
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Backed by Policy</label>
                <select style={inputStyle} value={form.policy_id ?? ''} onChange={e => setForm(f => ({ ...f, policy_id: e.target.value ? Number(e.target.value) : null }))}>
                  <option value="">None</option>
                  {policies.map(p => <option key={p.id} value={p.id}>{p.nickname || p.carrier} - {p.policy_type}</option>)}
                </select>
              </div>
            )}

            {/* Carrier + policy number (for received) */}
            {form.direction === 'received' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>Their Carrier</label>
                  <input style={inputStyle} value={form.carrier || ''} onChange={e => setForm(f => ({ ...f, carrier: e.target.value || null }))} placeholder="e.g. State Farm" />
                </div>
                <div>
                  <label style={labelStyle}>Their Policy #</label>
                  <input style={inputStyle} value={form.policy_number || ''} onChange={e => setForm(f => ({ ...f, policy_number: e.target.value || null }))} placeholder="Optional" />
                </div>
              </div>
            )}

            {/* Coverage types */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Coverage Types</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                {COVERAGE_TYPE_OPTIONS.map(ct => {
                  const current = (form.coverage_types || '').split(',').map(s => s.trim()).filter(Boolean);
                  const active = current.includes(ct);
                  return (
                    <button
                      key={ct}
                      type="button"
                      onClick={() => {
                        const updated = active ? current.filter(c => c !== ct) : [...current, ct];
                        setForm(f => ({ ...f, coverage_types: updated.join(', ') || null }));
                      }}
                      style={{
                        padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        border: active ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                        backgroundColor: active ? 'var(--color-primary)' : '#fff',
                        color: active ? '#fff' : 'var(--color-text)',
                      }}
                    >
                      {ct}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Coverage amount + dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Coverage Amount ($)</label>
                <input style={inputStyle} type="number" value={form.coverage_amount != null ? form.coverage_amount / 100 : ''} onChange={e => setForm(f => ({ ...f, coverage_amount: e.target.value ? Math.round(Number(e.target.value) * 100) : null }))} placeholder="1,000,000" />
              </div>
              <div>
                <label style={labelStyle}>Effective Date</label>
                <input style={inputStyle} type="date" value={form.effective_date || ''} onChange={e => setForm(f => ({ ...f, effective_date: e.target.value || null }))} />
              </div>
              <div>
                <label style={labelStyle}>Expiration Date</label>
                <input style={inputStyle} type="date" value={form.expiration_date || ''} onChange={e => setForm(f => ({ ...f, expiration_date: e.target.value || null }))} />
              </div>
            </div>

            {/* Minimum coverage for received */}
            {form.direction === 'received' && (
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Minimum Required Coverage ($)</label>
                <input style={inputStyle} type="number" value={form.minimum_coverage != null ? form.minimum_coverage / 100 : ''} onChange={e => setForm(f => ({ ...f, minimum_coverage: e.target.value ? Math.round(Number(e.target.value) * 100) : null }))} placeholder="What coverage do you require from them?" />
              </div>
            )}

            {/* Compliance checkboxes */}
            <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.additional_insured || false} onChange={e => setForm(f => ({ ...f, additional_insured: e.target.checked }))} />
                Additional Insured
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.waiver_of_subrogation || false} onChange={e => setForm(f => ({ ...f, waiver_of_subrogation: e.target.checked }))} />
                Waiver of Subrogation
              </label>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Notes</label>
              <textarea style={{ ...inputStyle, minHeight: 60 }} value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value || null }))} placeholder="Optional notes..." />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={resetForm} style={{ padding: '8px 20px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', backgroundColor: '#fff', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: '8px 20px', backgroundColor: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                {editingId ? 'Save Changes' : 'Add Certificate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm != null && (
        <ConfirmDialog
          open={true}
          title="Delete Certificate"
          message="Are you sure you want to delete this certificate? This cannot be undone."
          confirmLabel="Delete"
          danger
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}
