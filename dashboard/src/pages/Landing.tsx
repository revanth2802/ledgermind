import { useState } from 'react'
import { Link } from 'react-router-dom'

// Professional SVG Icons Component
const Icon = ({ name, size = 24, color = 'currentColor' }: { name: string; size?: number; color?: string }) => {
  const icons: Record<string, JSX.Element> = {
    brain: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/>
        <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>
        <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/>
        <path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/>
        <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/>
        <path d="M3.477 10.896a4 4 0 0 1 .585-.396"/>
        <path d="M19.938 10.5a4 4 0 0 1 .585.396"/>
        <path d="M6 18a4 4 0 0 1-1.967-.516"/>
        <path d="M19.967 17.484A4 4 0 0 1 18 18"/>
      </svg>
    ),
    scale: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
        <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
        <path d="M7 21h10"/>
        <path d="M12 3v18"/>
        <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>
      </svg>
    ),
    refresh: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
        <path d="M21 3v5h-5"/>
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
        <path d="M8 16H3v5"/>
      </svg>
    ),
    gauge: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 14 4-4"/>
        <path d="M3.34 19a10 10 0 1 1 17.32 0"/>
      </svg>
    ),
    gitBranch: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="6" x2="6" y1="3" y2="15"/>
        <circle cx="18" cy="6" r="3"/>
        <circle cx="6" cy="18" r="3"/>
        <path d="M18 9a9 9 0 0 1-9 9"/>
      </svg>
    ),
    search: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.3-4.3"/>
      </svg>
    ),
    ban: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="m4.9 4.9 14.2 14.2"/>
      </svg>
    ),
    trendingDown: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/>
        <polyline points="16 17 22 17 22 11"/>
      </svg>
    ),
    shuffle: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/>
        <path d="m18 2 4 4-4 4"/>
        <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/>
        <path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/>
        <path d="m18 14 4 4-4 4"/>
      </svg>
    ),
    building: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/>
        <path d="M9 22v-4h6v4"/>
        <path d="M8 6h.01"/>
        <path d="M16 6h.01"/>
        <path d="M12 6h.01"/>
        <path d="M12 10h.01"/>
        <path d="M12 14h.01"/>
        <path d="M16 10h.01"/>
        <path d="M16 14h.01"/>
        <path d="M8 10h.01"/>
        <path d="M8 14h.01"/>
      </svg>
    ),
    shoppingCart: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="21" r="1"/>
        <circle cx="19" cy="21" r="1"/>
        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
      </svg>
    ),
    heartPulse: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
        <path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>
      </svg>
    ),
    users: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    gavel: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m14.5 12.5-8 8a2.119 2.119 0 1 1-3-3l8-8"/>
        <path d="m16 16 6-6"/>
        <path d="m8 8 6-6"/>
        <path d="m9 7 8 8"/>
        <path d="m21 11-8-8"/>
      </svg>
    ),
    headphones: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>
      </svg>
    ),
    arrowRight: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14"/>
        <path d="m12 5 7 7-7 7"/>
      </svg>
    ),
    github: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
      </svg>
    ),
    database: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3"/>
        <path d="M3 5V19A9 3 0 0 0 21 19V5"/>
        <path d="M3 12A9 3 0 0 0 21 12"/>
      </svg>
    ),
    cpu: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect width="16" height="16" x="4" y="4" rx="2"/>
        <rect width="6" height="6" x="9" y="9" rx="1"/>
        <path d="M15 2v2"/>
        <path d="M15 20v2"/>
        <path d="M2 15h2"/>
        <path d="M2 9h2"/>
        <path d="M20 15h2"/>
        <path d="M20 9h2"/>
        <path d="M9 2v2"/>
        <path d="M9 20v2"/>
      </svg>
    ),
    check: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
  }
  
  return icons[name] || null
}

const Landing = () => {
  const [email, setEmail] = useState('')

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#FAFAFA',
      width: '100%',
      maxWidth: '100vw',
      overflowX: 'hidden',
    }}>
      {/* Navigation */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '64px',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #E5E5E5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 24px',
        zIndex: 100,
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '1200px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <svg width="32" height="32" viewBox="0 0 100 100" fill="none">
              <rect x="10" y="10" width="80" height="80" rx="8" fill="#FF6600"/>
              <path d="M30 50 L45 65 L70 35" stroke="white" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: '20px', fontWeight: 700 }}>LedgerMind</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <a href="#features" className="nav-link" style={{ color: '#666', textDecoration: 'none', fontSize: '14px', fontWeight: 500, padding: '8px 12px' }}>Features</a>
            <a href="#how-it-works" className="nav-link" style={{ color: '#666', textDecoration: 'none', fontSize: '14px', fontWeight: 500, padding: '8px 12px' }}>How It Works</a>
            <a href="#use-cases" className="nav-link" style={{ color: '#666', textDecoration: 'none', fontSize: '14px', fontWeight: 500, padding: '8px 12px' }}>Use Cases</a>
            <a href="https://github.com/ledgermind" target="_blank" rel="noopener noreferrer" className="nav-link" style={{ color: '#666', textDecoration: 'none', fontSize: '14px', fontWeight: 500, padding: '8px 12px' }}>GitHub</a>
            <Link to="/dashboard" style={{
              background: '#FF6600',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              marginLeft: '8px',
            }}>
              Dashboard
              <Icon name="arrowRight" size={16} color="white" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        paddingTop: '140px',
        paddingBottom: '100px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '140px 24px 100px',
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(255, 102, 0, 0.1)',
          padding: '8px 16px',
          borderRadius: '24px',
          marginBottom: '28px',
        }}>
          <span style={{ width: '8px', height: '8px', background: '#FF6600', borderRadius: '50%' }} />
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#FF6600' }}>
            Decision Intelligence for AI Systems
          </span>
        </div>

        <h1 style={{
          fontSize: 'clamp(36px, 8vw, 72px)',
          fontWeight: 800,
          lineHeight: 1.1,
          marginBottom: '28px',
          color: '#1A1A1A',
          letterSpacing: '-2px',
          maxWidth: '900px',
          padding: '0 16px',
        }}>
          make AI decisions<br />
          <span style={{ color: '#FF6600' }}> auditable</span>
        </h1>

        <p style={{
          fontSize: 'clamp(16px, 2vw, 20px)',
          color: '#666',
          lineHeight: 1.7,
          maxWidth: '620px',
          marginBottom: '40px',
          padding: '0 16px',
        }}>
          LedgerMind logs every AI decision with full context, tracks human overrides, 
          and provides analytics to understand how your AI is performing over time.
        </p>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '48px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href="https://github.com/ledgermind" target="_blank" rel="noopener noreferrer" style={{
            background: '#FF6600',
            color: 'white',
            padding: '14px 28px',
            borderRadius: '12px',
            textDecoration: 'none',
            fontSize: '15px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(255, 102, 0, 0.4)',
            whiteSpace: 'nowrap',
          }}>
            <Icon name="github" size={20} color="white" />
            View on GitHub
          </a>
        </div>

        {/* Code Preview */}
        <div style={{
          background: '#1A1A1A',
          borderRadius: '16px',
          padding: 'clamp(16px, 3vw, 28px)',
          textAlign: 'left',
          width: '100%',
          maxWidth: '720px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#EF4444' }} />
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#F59E0B' }} />
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#22C55E' }} />
          </div>
          <pre style={{
            color: '#E5E5E5',
            fontSize: 'clamp(11px, 1.5vw, 14px)',
            lineHeight: 1.6,
            fontFamily: "'SF Mono', 'Fira Code', Menlo, monospace",
            margin: 0,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
<span style={{ color: '#FF6600' }}>const</span> agent = <span style={{ color: '#22C55E' }}>wrapAgent</span>(myAgent, ledgermind);{'\n'}
{'\n'}
<span style={{ color: '#6B7280' }}>// Automatically recalls similar past decisions</span>{'\n'}
<span style={{ color: '#FF6600' }}>const</span> result = <span style={{ color: '#FF6600' }}>await</span> agent.<span style={{ color: '#3B82F6' }}>execute</span>(request);{'\n'}
{'\n'}
<span style={{ color: '#6B7280' }}>// Returns decision + precedent context</span>{'\n'}
console.<span style={{ color: '#3B82F6' }}>log</span>(result.precedent); <span style={{ color: '#6B7280' }}>// Similar case from 3 months ago</span>{'\n'}
console.<span style={{ color: '#3B82F6' }}>log</span>(result.confidence); <span style={{ color: '#6B7280' }}>// 0.94 - high confidence</span>
          </pre>
        </div>
      </section>

      {/* Social Proof */}
      <section style={{
        padding: '60px 24px',
        background: 'white',
        borderTop: '1px solid #E5E5E5',
        borderBottom: '1px solid #E5E5E5',
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#999', marginBottom: '28px', fontWeight: 600, letterSpacing: '1px' }}>
            BUILT FOR MODERN AI INFRASTRUCTURE
          </p>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '64px', 
            alignItems: 'center',
            flexWrap: 'wrap',
            opacity: 0.4,
          }}>
            <span style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A1A' }}>OpenAI</span>
            <span style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A1A' }}>LangChain</span>
            <span style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A1A' }}>CrewAI</span>
            <span style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A1A' }}>AutoGen</span>
            <span style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A1A' }}>Custom</span>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section style={{ padding: 'clamp(60px, 10vw, 120px) 16px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#FF6600', marginBottom: '16px', letterSpacing: '1px' }}>
              THE PROBLEM
            </p>
            <h2 style={{ fontSize: 'clamp(24px, 5vw, 44px)', fontWeight: 700, color: '#1A1A1A', lineHeight: 1.2 }}>
              AI is stateless.<br />Every decision starts from zero.
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            {[
              {
                icon: 'ban',
                title: 'No Memory',
                description: 'Each request is processed in isolation. The same edge case gets re-decided differently every time.',
                color: '#EF4444',
              },
              {
                icon: 'trendingDown',
                title: 'No Learning',
                description: 'Human overrides and corrections vanish into logs. AI never learns from mistakes.',
                color: '#F59E0B',
              },
              {
                icon: 'shuffle',
                title: 'Inconsistent',
                description: 'Similar situations get wildly different outcomes. Users lose trust in AI decisions.',
                color: '#8B5CF6',
              },
            ].map((item) => (
              <div key={item.title} style={{
                padding: '36px',
                background: 'white',
                borderRadius: '16px',
                border: '1px solid #E5E5E5',
                textAlign: 'center',
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  background: `${item.color}12`,
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                }}>
                  <Icon name={item.icon} size={28} color={item.color} />
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px', color: '#1A1A1A' }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: '15px', color: '#666', lineHeight: 1.7 }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Solution - Features */}
      <section id="features" style={{ padding: 'clamp(60px, 10vw, 120px) 16px', background: 'white' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#FF6600', marginBottom: '16px', letterSpacing: '1px' }}>
              THE SOLUTION
            </p>
            <h2 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 700, color: '#1A1A1A', lineHeight: 1.2, marginBottom: '20px' }}>
              Decision Intelligence Platform
            </h2>
            <p style={{ fontSize: '18px', color: '#666', maxWidth: '600px', margin: '0 auto', lineHeight: 1.7 }}>
              Capture every decision. Track every override. Analyze patterns. 
              Understand how your AI is actually performing in production.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {[
              {
                icon: 'database',
                title: 'Decision Capture',
                description: 'Log every AI decision with full input context, output, reasoning, and confidence scores.',
                color: '#FF6600',
              },
              {
                icon: 'chart',
                title: 'Analytics Dashboard',
                description: 'Visualize decision patterns, override rates, confidence trends, and actor performance over time.',
                color: '#3B82F6',
              },
              {
                icon: 'refresh',
                title: 'Override Tracking',
                description: 'When humans correct AI decisions, capture the correction with reasoning for accountability.',
                color: '#22C55E',
              },
              {
                icon: 'brain',
                title: 'Semantic Search',
                description: 'Find similar past decisions by meaning, not keywords. Query by context to find relevant precedents.',
                color: '#8B5CF6',
              },
              {
                icon: 'gitBranch',
                title: 'Policy Versioning',
                description: 'Track which policy version governed each decision. Compare outcomes across policy changes.',
                color: '#F59E0B',
              },
              {
                icon: 'search',
                title: 'Full Audit Trail',
                description: 'Complete timeline of every decision, every override, every outcome. Export for compliance.',
                color: '#EC4899',
              },
            ].map((feature) => (
              <div key={feature.title} style={{
                padding: '32px',
                background: '#FAFAFA',
                borderRadius: '16px',
                border: '1px solid #E5E5E5',
                display: 'flex',
                gap: '20px',
                alignItems: 'flex-start',
              }}>
                <div style={{
                  width: '52px',
                  height: '52px',
                  background: `${feature.color}12`,
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon name={feature.icon} size={24} color={feature.color} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: '#1A1A1A' }}>
                    {feature.title}
                  </h3>
                  <p style={{ fontSize: '15px', color: '#666', lineHeight: 1.7, margin: 0 }}>
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" style={{ padding: 'clamp(60px, 10vw, 120px) 16px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#FF6600', marginBottom: '16px', letterSpacing: '1px' }}>
              HOW IT WORKS
            </p>
            <h2 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 700, color: '#1A1A1A' }}>
              Three lines to get started
            </h2>
          </div>

          <div>
            {[
              {
                step: '01',
                title: 'Connect your AI',
                description: 'Works with any AI framework. LangChain, CrewAI, AutoGen, or custom systems.',
                code: `import { wrapAgent, LedgerMindClient } from '@ledgermind/sdk';

const client = new LedgerMindClient({ apiUrl: 'http://localhost:3000' });
const memoryAgent = wrapAgent(myAgent, client);`,
              },
              {
                step: '02',
                title: 'Execute with context',
                description: 'AI automatically queries precedents and logs decisions.',
                code: `const result = await memoryAgent.execute({
  type: 'refund_request',
  amount: 150,
  reason: 'Product damaged',
  customer_history: 'loyal_5_years'
});`,
              },
              {
                step: '03',
                title: 'Use precedent intelligence',
                description: 'Decisions come with similar past cases and confidence scores.',
                code: `console.log(result.output);      // 'APPROVE'
console.log(result.confidence);  // 0.94
console.log(result.precedent);   // { similarity: 0.91, outcome: 'APPROVE', ... }`,
              },
            ].map((item, index) => (
              <div key={item.step} style={{
                display: 'flex',
                gap: '24px',
                marginBottom: index < 2 ? '48px' : 0,
                alignItems: 'flex-start',
                flexWrap: 'wrap',
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  background: '#FF6600',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '20px',
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {item.step}
                </div>
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', color: '#1A1A1A' }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: '15px', color: '#666', marginBottom: '16px' }}>
                    {item.description}
                  </p>
                  <div style={{
                    background: '#1A1A1A',
                    borderRadius: '12px',
                    padding: '16px',
                    maxWidth: '100%',
                    overflow: 'hidden',
                  }}>
                    <pre style={{
                      color: '#E5E5E5',
                      fontSize: '12px',
                      lineHeight: 1.6,
                      fontFamily: "'SF Mono', 'Fira Code', Menlo, monospace",
                      margin: 0,
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}>
                      {item.code}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI-Powered Intelligence */}
      <section style={{ padding: 'clamp(60px, 10vw, 120px) 16px', background: 'linear-gradient(180deg, #FFF5EB 0%, white 100%)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#FF6600', marginBottom: '16px', letterSpacing: '1px' }}>
              AI-POWERED INTELLIGENCE
            </p>
            <h2 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 700, color: '#1A1A1A', lineHeight: 1.2, marginBottom: '20px' }}>
              Built-in AI that understands your decisions
            </h2>
            <p style={{ fontSize: '18px', color: '#666', maxWidth: '650px', margin: '0 auto', lineHeight: 1.7 }}>
              Beyond logging — LedgerMind uses AI to analyze patterns, detect anomalies, 
              generate compliance reports, and answer questions in natural language.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {[
              {
                icon: 'gauge',
                title: 'Pattern Detection',
                description: 'AI analyzes your decision history to detect anomalies, trends, and potential bias. Get alerts before issues escalate.',
                command: 'ledgermind patterns',
                color: '#FF6600',
              },
              {
                icon: 'scale',
                title: 'Compliance Audit',
                description: 'Generate comprehensive audit reports with findings, concerns, and recommendations. Export-ready for regulators.',
                command: 'ledgermind audit',
                color: '#3B82F6',
              },
              {
                icon: 'search',
                title: 'Natural Language Queries',
                description: 'Ask questions like "show approved loans this month" and get instant answers. No SQL required.',
                command: 'ledgermind ask "show approved loans"',
                color: '#22C55E',
              },
              {
                icon: 'brain',
                title: 'Smart Recommendations',
                description: 'Before finalizing decisions, get AI recommendations based on similar past cases and their outcomes.',
                command: 'ledgermind recommend',
                color: '#8B5CF6',
              },
              {
                icon: 'cpu',
                title: 'Auto Reasoning',
                description: 'AI generates human-readable explanations for every decision, perfect for audit trails and debugging.',
                command: 'SDK: client.generateReasoning()',
                color: '#F59E0B',
              },
              {
                icon: 'database',
                title: 'Similarity Search',
                description: 'Vector embeddings power semantic search across all decisions. Find precedents even with different wording.',
                command: 'ledgermind similar "refund damaged item"',
                color: '#EC4899',
              },
            ].map((feature) => (
              <div key={feature.title} style={{
                padding: '28px',
                background: 'white',
                borderRadius: '16px',
                border: '1px solid #E5E5E5',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: `${feature.color}15`,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}>
                  <Icon name={feature.icon} size={24} color={feature.color} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '10px', color: '#1A1A1A' }}>
                  {feature.title}
                </h3>
                <p style={{ fontSize: '15px', color: '#666', lineHeight: 1.7 }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>


        </div>
      </section>

      {/* Use Cases */}
      <section id="use-cases" style={{ padding: 'clamp(60px, 10vw, 120px) 16px', background: 'white' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#FF6600', marginBottom: '16px', letterSpacing: '1px' }}>
              USE CASES
            </p>
            <h2 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 700, color: '#1A1A1A' }}>
              Built for enterprise decisions
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {[
              {
                icon: 'building',
                industry: 'Finance',
                title: 'Loan Underwriting',
                description: 'Approve loans with precedent context. When similar applicants were approved/denied before, what happened?',
                metrics: '40% faster decisions',
                color: '#3B82F6',
              },
              {
                icon: 'shoppingCart',
                industry: 'E-Commerce',
                title: 'Refund Decisions',
                description: 'Consistent refund policies. Learn from past exceptions. Remember loyal customers.',
                metrics: '90% consistency rate',
                color: '#22C55E',
              },
              {
                icon: 'heartPulse',
                industry: 'Healthcare',
                title: 'Prior Authorization',
                description: 'Approve treatments based on clinical precedent. Track outcomes for similar cases.',
                metrics: '60% reduced appeals',
                color: '#EF4444',
              },
              {
                icon: 'users',
                industry: 'HR',
                title: 'Expense Approval',
                description: 'Approve expenses with policy awareness. Flag unusual patterns based on history.',
                metrics: '75% auto-approved',
                color: '#8B5CF6',
              },
              {
                icon: 'gavel',
                industry: 'Legal',
                title: 'Contract Review',
                description: 'Flag risky clauses based on past negotiations. Learn from successful deals.',
                metrics: '3x faster review',
                color: '#F59E0B',
              },
              {
                icon: 'headphones',
                industry: 'Support',
                title: 'Ticket Escalation',
                description: 'Route tickets based on resolution history. Predict which need human attention.',
                metrics: '50% fewer escalations',
                color: '#EC4899',
              },
            ].map((useCase) => (
              <div key={useCase.title} style={{
                padding: '28px',
                background: '#FAFAFA',
                borderRadius: '16px',
                border: '1px solid #E5E5E5',
                textAlign: 'center',
              }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  background: `${useCase.color}12`,
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <Icon name={useCase.icon} size={26} color={useCase.color} />
                </div>
                <p style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: useCase.color,
                  marginBottom: '8px',
                  letterSpacing: '0.5px',
                }}>
                  {useCase.industry.toUpperCase()}
                </p>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '10px', color: '#1A1A1A' }}>
                  {useCase.title}
                </h3>
                <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.6, marginBottom: '16px' }}>
                  {useCase.description}
                </p>
                <div style={{
                  display: 'inline-block',
                  padding: '8px 14px',
                  background: 'rgba(34, 197, 94, 0.1)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#22C55E',
                }}>
                  {useCase.metrics}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section style={{ padding: 'clamp(60px, 10vw, 120px) 16px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#FF6600', marginBottom: '16px', letterSpacing: '1px' }}>
              ARCHITECTURE
            </p>
            <h2 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 700, color: '#1A1A1A', marginBottom: '16px' }}>
              Orchestrator-agnostic by design
            </h2>
            <p style={{ fontSize: '18px', color: '#666' }}>
              LedgerMind sits alongside your AI stack, not inside it.
            </p>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '24px',
            padding: 'clamp(24px, 4vw, 48px)',
            border: '1px solid #E5E5E5',
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'clamp(16px, 3vw, 32px)',
              flexWrap: 'wrap',
            }}>
              {/* Your AI */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  background: '#F5F5F5',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}>
                  <Icon name="cpu" size={36} color="#666" />
                </div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#1A1A1A' }}>Your AI</div>
                <div style={{ fontSize: '13px', color: '#666' }}>Any framework</div>
              </div>

              {/* Arrow */}
              <svg width="48" height="24" viewBox="0 0 48 24" fill="none">
                <path d="M0 12h44M38 6l6 6-6 6" stroke="#CCC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>

              {/* LedgerMind */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  background: 'linear-gradient(135deg, #FF6600, #FF8533)',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                  boxShadow: '0 8px 24px rgba(255, 102, 0, 0.3)',
                }}>
                  <svg width="40" height="40" viewBox="0 0 100 100" fill="none">
                    <path d="M30 50 L45 65 L70 35" stroke="white" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#FF6600' }}>LedgerMind</div>
                <div style={{ fontSize: '13px', color: '#666' }}>Decision Memory</div>
              </div>

              {/* Arrow */}
              <svg width="48" height="24" viewBox="0 0 48 24" fill="none">
                <path d="M0 12h44M38 6l6 6-6 6" stroke="#CCC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>

              {/* PostgreSQL */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  background: '#336791',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}>
                  <Icon name="database" size={36} color="white" />
                </div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#1A1A1A' }}>PostgreSQL</div>
                <div style={{ fontSize: '13px', color: '#666' }}>+ pgvector</div>
              </div>
            </div>

            {/* Features below */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '16px',
              marginTop: '48px',
              paddingTop: '32px',
              borderTop: '1px solid #E5E5E5',
            }}>
              {[
                { label: 'REST API', value: 'Simple HTTP' },
                { label: 'SDK', value: 'TS / Python' },
                { label: 'Embeddings', value: 'Pluggable' },
                { label: 'Storage', value: 'PostgreSQL' },
              ].map((item) => (
                <div key={item.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', color: '#999', marginBottom: '4px' }}>{item.label}</div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#1A1A1A' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Composability */}
      <section style={{ padding: 'clamp(60px, 10vw, 120px) 16px', background: '#FAFAFA' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#FF6600', marginBottom: '16px', letterSpacing: '1px' }}>
              COMPOSABLE
            </p>
            <h2 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 700, color: '#1A1A1A', marginBottom: '16px' }}>
              Use it your way
            </h2>
            <p style={{ fontSize: '18px', color: '#666' }}>
              SDK optional. Bring your own embeddings. Import existing data.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            {[
              {
                title: 'REST API First',
                description: 'Full functionality via HTTP. No SDK required. Works with any language or framework.',
                code: `curl -X POST /api/events \\
  -d '{"actor_name": "agent", ...}'`,
              },
              {
                title: 'Pluggable Embeddings',
                description: 'OpenAI, Cohere, or bring your own model. Switch providers with one env variable.',
                code: `EMBEDDING_PROVIDER=cohere
# or custom endpoint
EMBEDDING_PROVIDER=custom
EMBEDDING_ENDPOINT=https://...`,
              },
              {
                title: 'Batch Import',
                description: 'Import historical decisions. Migrate from existing systems. Pre-compute embeddings.',
                code: `POST /api/decisions/batch
{ "decisions": [...],
  "generate_embeddings": true }`,
              },
            ].map((item) => (
              <div key={item.title} style={{
                padding: '28px',
                background: 'white',
                borderRadius: '16px',
                border: '1px solid #E5E5E5',
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '10px', color: '#1A1A1A' }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: '15px', color: '#666', lineHeight: 1.7, marginBottom: '16px' }}>
                  {item.description}
                </p>
                <div style={{
                  background: '#1A1A1A',
                  borderRadius: '8px',
                  padding: '12px',
                }}>
                  <pre style={{
                    color: '#E5E5E5',
                    fontSize: '11px',
                    lineHeight: 1.5,
                    fontFamily: "'SF Mono', 'Fira Code', Menlo, monospace",
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {item.code}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: 'clamp(60px, 10vw, 120px) 24px', background: '#1A1A1A' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(32px, 6vw, 52px)', fontWeight: 700, color: 'white', marginBottom: '24px', lineHeight: 1.15, letterSpacing: '-1px' }}>
            Understand your AI<br />
            <span style={{ color: '#FF6600' }}>decisions at scale</span>
          </h2>
          <p style={{ fontSize: 'clamp(16px, 2vw, 18px)', color: '#999', marginBottom: '40px', lineHeight: 1.7 }}>
            Start capturing and analyzing every AI decision.<br />
            Open source. Self-hosted. Enterprise-ready.
          </p>

          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            justifyContent: 'center',
            maxWidth: '420px',
            margin: '0 auto',
            flexWrap: 'wrap',
          }}>
            <input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                flex: 1,
                minWidth: '200px',
                padding: '16px 20px',
                borderRadius: '12px',
                border: 'none',
                fontSize: '16px',
                background: 'white',
              }}
            />
            <button style={{
              background: '#FF6600',
              color: 'white',
              padding: '16px 28px',
              borderRadius: '12px',
              border: 'none',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}>
              Get Updates
            </button>
          </div>

          <p style={{ fontSize: '13px', color: '#555', marginTop: '16px' }}>
            No spam. Just major releases and updates.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ 
        padding: '48px 24px', 
        background: '#111',
        borderTop: '1px solid #222',
      }}>
        <div style={{ 
          maxWidth: '1100px', 
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <svg width="24" height="24" viewBox="0 0 100 100" fill="none">
              <rect x="10" y="10" width="80" height="80" rx="8" fill="#FF6600"/>
              <path d="M30 50 L45 65 L70 35" stroke="white" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: '16px', fontWeight: 600, color: 'white' }}>LedgerMind</span>
          </div>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <a href="https://github.com/ledgermind" style={{ color: '#666', textDecoration: 'none', fontSize: '14px' }}>GitHub</a>
            <a href="#" style={{ color: '#666', textDecoration: 'none', fontSize: '14px' }}>Documentation</a>
            <a href="#" style={{ color: '#666', textDecoration: 'none', fontSize: '14px' }}>Discord</a>
          </div>
          <div style={{ color: '#555', fontSize: '13px' }}>
            © 2026 LedgerMind. MIT License.
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
