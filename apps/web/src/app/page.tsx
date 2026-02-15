'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { APP_NAME, APP_TAGLINE } from './config';

export default function Home() {
  const { token } = useAuth();
  const router = useRouter();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      {/* Navigation Header */}
      <header className="landing-header" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid var(--color-border)',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-primary)', cursor: 'pointer' }}
        >
          {APP_NAME}
        </div>
        <nav className="landing-nav-links">
          <span onClick={() => scrollTo('how-it-works')} style={{ fontSize: 14, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>How it works</span>
          <span onClick={() => scrollTo('features')} style={{ fontSize: 14, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>Features</span>
          <span onClick={() => scrollTo('security')} style={{ fontSize: 14, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>Security</span>
          <button
            onClick={() => router.push(token ? '/policies' : '/login')}
            style={{
              padding: '8px 20px',
              fontSize: 14,
              fontWeight: 600,
              backgroundColor: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
            }}
          >
            {token ? 'My Coverage' : 'Sign in'}
          </button>
        </nav>
      </header>

      {/* 1. HERO SECTION */}
      <section style={{
        paddingTop: 120,
        paddingBottom: 60,
        paddingLeft: 24,
        paddingRight: 24,
        background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 50%, var(--color-primary-light) 100%)',
        color: '#fff',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: 44, fontWeight: 700, margin: '0 0 20px', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
            Your AI insurance analyst — always watching, always ready.
          </h1>
          <p style={{ fontSize: 18, opacity: 0.95, margin: '0 0 8px', lineHeight: 1.7, maxWidth: 700, marginLeft: 'auto', marginRight: 'auto', fontWeight: 600 }}>
            Intelligent insurance that actually works for you.
          </p>
          <p style={{ fontSize: 17, opacity: 0.9, margin: '0 0 32px', lineHeight: 1.7, maxWidth: 700, marginLeft: 'auto', marginRight: 'auto' }}>
            {APP_NAME} analyzes every policy you own — scoring your protection, detecting coverage gaps, tracking renewal deadlines, and explaining what changed. So you always know exactly where you stand.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 32 }}>
            <button
              onClick={() => router.push(token ? '/policies' : '/login')}
              style={{
                padding: '14px 32px',
                fontSize: 16,
                fontWeight: 600,
                backgroundColor: 'var(--color-accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
              }}
            >
              {token ? 'View My Coverage' : 'Get Started'}
            </button>
            <button
              onClick={() => scrollTo('how-it-works')}
              style={{
                padding: '14px 32px',
                fontSize: 16,
                fontWeight: 600,
                backgroundColor: 'rgba(255,255,255,0.15)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
              }}
            >
              See how it works
            </button>
          </div>
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap', fontSize: 13, opacity: 0.8 }}>
            <span>AI-powered analysis</span>
            <span>Encrypted &amp; private</span>
            <span>Real-time monitoring</span>
          </div>
        </div>
      </section>

      {/* 2. PROBLEM SECTION */}
      <section style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 24px', color: 'var(--color-text)' }}>
            Most people have no idea if their coverage actually protects them.
          </h2>
          <p style={{ fontSize: 16, color: 'var(--color-text-secondary)', lineHeight: 1.8, margin: '0 0 32px' }}>
            Policies are scattered across carriers, emails, portals, and PDFs. Without an analyst watching everything, the important questions go unanswered:
          </p>
          <div style={{ textAlign: 'left', maxWidth: 420, margin: '0 auto 32px', fontSize: 16, color: 'var(--color-text-secondary)', lineHeight: 2.2 }}>
            <div>&bull; Where are the gaps in my coverage?</div>
            <div>&bull; How strong is my overall protection?</div>
            <div>&bull; When do my policies renew — and am I ready?</div>
            <div>&bull; What changed since last year?</div>
            <div>&bull; What should I do next?</div>
          </div>
          <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-primary)', margin: 0 }}>
            {APP_NAME} watches everything and tells you exactly what needs attention.
          </p>
        </div>
      </section>

      {/* 3. HOW IT WORKS */}
      <section id="how-it-works" style={{ padding: '80px 24px', background: 'var(--color-surface)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 48px', textAlign: 'center', color: 'var(--color-text)' }}>
            How it works
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 32 }}>
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>1</div>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 12px', color: 'var(--color-text)' }}>Add your policies</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                Upload PDFs, scans, or photos. {APP_NAME}&apos;s AI extracts every key detail automatically — carrier, limits, deductibles, renewal dates, and more.
              </p>
            </div>
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>2</div>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 12px', color: 'var(--color-text)' }}>{APP_NAME} analyzes everything</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                Your coverage is scored, gaps are identified, renewals are tracked, and policy changes are detected and explained — all automatically.
              </p>
            </div>
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>3</div>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 12px', color: 'var(--color-text)' }}>Stay protected effortlessly</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                Get proactive alerts before renewals, when gaps appear, and when something changes. {APP_NAME} keeps watching so you don&apos;t have to.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CORE VALUE — Five ways Covrabl thinks about your insurance */}
      <section style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 16px', color: 'var(--color-text)' }}>
            Five ways {APP_NAME} thinks about your insurance
          </h2>
          <p style={{ fontSize: 16, color: 'var(--color-text-secondary)', margin: '0 0 40px', lineHeight: 1.7 }}>
            {APP_NAME} doesn&apos;t just store your policies — it continuously analyzes them to keep you protected.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24, textAlign: 'left' }}>
            <div style={{ padding: 20, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px', color: 'var(--color-text)' }}>Coverage Scoring</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                A 0&ndash;100 Protection Score that tells you how strong your coverage is at a glance.
              </p>
            </div>
            <div style={{ padding: 20, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px', color: 'var(--color-text)' }}>Gap Detection</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                Identifies missing coverage types and inadequate limits before they become problems.
              </p>
            </div>
            <div style={{ padding: 20, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px', color: 'var(--color-text)' }}>Renewal Tracking</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                Automatic alerts before deadlines so you never miss a renewal or lapse in coverage.
              </p>
            </div>
            <div style={{ padding: 20, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px', color: 'var(--color-text)' }}>Change Detection</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                Spots and explains policy changes between terms so nothing slips by unnoticed.
              </p>
            </div>
            <div style={{ padding: 20, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px', color: 'var(--color-text)' }}>Smart Alerts</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                Surfaces what needs your attention — so you focus on what matters, not on monitoring.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FEATURES */}
      <section id="features" style={{ padding: '80px 24px', background: 'var(--color-surface)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 48px', textAlign: 'center', color: 'var(--color-text)' }}>
            What {APP_NAME} does
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {[
              { title: 'AI-powered extraction', desc: `Upload a document and ${APP_NAME} reads it — extracting carrier, limits, deductibles, renewal dates, and more automatically.` },
              { title: 'Protection Score', desc: 'A clear 0–100 score across your entire portfolio so you know how protected you really are.' },
              { title: 'Gap analysis', desc: 'Identifies missing coverage types, inadequate limits, and areas where you may be exposed.' },
              { title: 'Renewal awareness', desc: 'Tracks every renewal date and alerts you before deadlines — so nothing lapses.' },
              { title: 'Policy change tracking', desc: 'When a policy renews or updates, Covrabl detects what changed and explains it in plain language.' },
              { title: 'Emergency-ready sharing', desc: 'Secure, permissioned access for loved ones, caregivers, or attorneys — so critical information is available when it matters most.' },
            ].map(f => (
              <div key={f.title} className="card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px', color: 'var(--color-text)' }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. COMPARISON */}
      <section style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 48px', textAlign: 'center', color: 'var(--color-text)' }}>
            Without {APP_NAME} vs. with {APP_NAME}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
            <div className="card" style={{ padding: 32 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px', color: 'var(--color-text-muted)' }}>Without {APP_NAME}</h3>
              <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--color-text-secondary)', lineHeight: 2 }}>
                <li>Coverage gaps invisible until a claim is denied</li>
                <li>No idea how strong your protection is</li>
                <li>Renewals missed or noticed too late</li>
                <li>Policy changes go unnoticed</li>
                <li>No safe emergency access</li>
              </ul>
            </div>
            <div className="card" style={{ padding: 32, borderColor: 'var(--color-primary)', borderWidth: 2 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px', color: 'var(--color-primary)' }}>With {APP_NAME}</h3>
              <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--color-text)', lineHeight: 2 }}>
                <li>Gaps detected and flagged automatically</li>
                <li>Protection Score shows your strength at a glance</li>
                <li>Renewal alerts before every deadline</li>
                <li>Changes spotted and explained in plain language</li>
                <li>Secure emergency-ready sharing</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 7. SECURITY */}
      <section id="security" style={{ padding: '80px 24px', background: 'var(--color-surface)' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 16px', color: 'var(--color-text)' }}>
            Security built for sensitive documents
          </h2>
          <p style={{ fontSize: 16, color: 'var(--color-text-secondary)', margin: '0 0 40px', lineHeight: 1.7 }}>
            AI analysis of your insurance requires trust. {APP_NAME} treats your data accordingly.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, textAlign: 'left' }}>
            {[
              { title: 'Encryption', desc: 'Data encrypted in transit and at rest.' },
              { title: 'Permissioned sharing', desc: 'Control exactly who sees what.' },
              { title: 'Data ownership', desc: 'Your data stays yours.' },
              { title: 'Privacy-first design', desc: 'Built with privacy as a core principle.' },
            ].map(s => (
              <div key={s.title} style={{ padding: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px', color: 'var(--color-text)' }}>{s.title}</h4>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. AUDIENCE */}
      <section style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 48px', textAlign: 'center', color: 'var(--color-text)' }}>
            Built for people who want to know — not guess
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 32 }}>
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>&#x1F468;&#x200D;&#x1F469;&#x200D;&#x1F467;&#x200D;&#x1F466;</div>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px', color: 'var(--color-text)' }}>Families</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                Know your family is fully protected — with AI watching for gaps, upcoming renewals, and changes you need to act on.
              </p>
            </div>
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>&#x1F4BC;</div>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px', color: 'var(--color-text)' }}>Professionals</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                Protection Score and gap analysis across personal and business policies — so nothing falls through the cracks.
              </p>
            </div>
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>&#x1F4CB;</div>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px', color: 'var(--color-text)' }}>Multi-policy holders</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                The more policies you have, the harder it is to stay on top. {APP_NAME} handles the complexity — you just stay protected.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. FINAL CTA */}
      <section style={{
        padding: '80px 24px',
        background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)',
        color: '#fff',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 16px' }}>
            Let AI handle the complexity.
          </h2>
          <p style={{ fontSize: 18, opacity: 0.9, margin: '0 0 32px' }}>
            You just stay protected.
          </p>
          <button
            onClick={() => router.push(token ? '/policies' : '/login')}
            style={{
              padding: '16px 40px',
              fontSize: 18,
              fontWeight: 600,
              backgroundColor: 'var(--color-accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
            }}
          >
            {token ? 'View My Coverage' : 'Get Started'}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '24px', textAlign: 'center', borderTop: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: 13 }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 12 }}>
          <span onClick={() => router.push('/privacy')} style={{ cursor: 'pointer' }}>Privacy</span>
          <span onClick={() => router.push('/terms')} style={{ cursor: 'pointer' }}>Terms</span>
        </div>
        {APP_NAME} — {APP_TAGLINE}
      </footer>
    </div>
  );
}
