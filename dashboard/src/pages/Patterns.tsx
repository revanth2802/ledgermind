import { useState } from 'react'

interface Pattern {
  type: 'anomaly' | 'trend' | 'bias'
  description: string
  severity: 'high' | 'medium' | 'low'
  affectedAgent: string | null
}

interface PatternReport {
  patterns: Pattern[]
  insights: string[]
  alerts: string[]
}

const Patterns = () => {
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<PatternReport | null>(null)

  const analyzePatterns = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ai/patterns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer demo-key',
          'x-tenant-id': 'demo-tenant',
        },
      })
      const data = await response.json()
      setReport(data)
    } catch (err) {
      console.error('Pattern detection failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#EF4444'
      case 'medium': return '#F59E0B'
      case 'low': return '#3B82F6'
      default: return '#6B7280'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'anomaly':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        )
      case 'trend':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        )
      case 'bias':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4"/>
            <path d="M12 8h.01"/>
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Pattern Detection</h1>
        <p className="page-subtitle">
          AI-powered analysis to detect anomalies, trends, and bias in decision-making
        </p>
      </div>

      {/* Analysis Button */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
                Analyze Decision Patterns
              </h3>
              <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
                Run AI analysis to identify patterns, anomalies, and potential issues
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={analyzePatterns}
              disabled={loading}
              style={{ minWidth: '150px' }}
            >
              {loading ? 'Analyzing...' : 'Run Analysis'}
            </button>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {report && report.alerts && report.alerts.length > 0 && (
        <div className="card" style={{ marginBottom: '24px', borderLeft: '4px solid #EF4444' }}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <h3 className="card-title" style={{ color: '#EF4444' }}>Critical Alerts</h3>
            </div>
          </div>
          <div className="card-body">
            {report.alerts.map((alert, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px 16px',
                  background: 'rgba(239, 68, 68, 0.05)',
                  borderRadius: '8px',
                  marginBottom: idx < report.alerts.length - 1 ? '12px' : 0,
                }}
              >
                <div style={{ fontSize: '14px', color: '#991B1B', lineHeight: 1.6 }}>
                  {alert}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Patterns */}
      {report && report.patterns && report.patterns.length > 0 && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">Detected Patterns</h3>
            <span style={{ fontSize: '13px', color: '#666' }}>
              {report.patterns.length} patterns found
            </span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {report.patterns.map((pattern, idx) => (
              <div
                key={idx}
                style={{
                  padding: '16px 24px',
                  borderBottom: idx < report.patterns.length - 1 ? '1px solid #F0F0F0' : 'none',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                }}
              >
                {/* Icon */}
                <div style={{
                  padding: '10px',
                  borderRadius: '8px',
                  background: `${getSeverityColor(pattern.severity)}15`,
                  color: getSeverityColor(pattern.severity),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {getTypeIcon(pattern.type)}
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      background: `${getSeverityColor(pattern.severity)}15`,
                      color: getSeverityColor(pattern.severity),
                    }}>
                      {pattern.type}
                    </span>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      background: pattern.severity === 'high' 
                        ? '#FEE2E2' 
                        : pattern.severity === 'medium' 
                          ? '#FEF3C7' 
                          : '#DBEAFE',
                      color: pattern.severity === 'high'
                        ? '#991B1B'
                        : pattern.severity === 'medium'
                          ? '#92400E'
                          : '#1E40AF',
                    }}>
                      {pattern.severity} severity
                    </span>
                    {pattern.affectedAgent && (
                      <span style={{ fontSize: '13px', color: '#666' }}>
                        Agent: {pattern.affectedAgent}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '14px', color: '#333', lineHeight: 1.6 }}>
                    {pattern.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {report && report.insights && report.insights.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Key Insights</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {report.insights.map((insight, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 16px',
                    background: '#F8F9FA',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{
                    minWidth: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#FF6600',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}>
                    {idx + 1}
                  </div>
                  <div style={{ fontSize: '14px', color: '#333', lineHeight: 1.6, flex: 1 }}>
                    {insight}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !report && (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <div className="empty-state-title">No analysis yet</div>
              <div className="empty-state-description">
                Click "Run Analysis" to detect patterns, anomalies, and trends in your decision history
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Patterns
