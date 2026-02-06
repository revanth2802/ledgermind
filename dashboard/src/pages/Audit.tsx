import { useState } from 'react'

interface AuditReport {
  executiveSummary: string
  findings: string[]
  concerns: string[]
  recommendations: string[]
  complianceStatus: 'compliant' | 'needs_review' | 'non_compliant'
}

const Audit = () => {
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<AuditReport | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const generateReport = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ai/audit-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer demo-key',
          'x-tenant-id': 'demo-tenant',
        },
        body: JSON.stringify({
          period_start: startDate || undefined,
          period_end: endDate || undefined,
        }),
      })
      const data = await response.json()
      setReport(data)
    } catch (err) {
      console.error('Audit report failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return { bg: '#D1FAE5', color: '#065F46', label: 'Compliant' }
      case 'needs_review': return { bg: '#FEF3C7', color: '#92400E', label: 'Needs Review' }
      case 'non_compliant': return { bg: '#FEE2E2', color: '#991B1B', label: 'Non-Compliant' }
      default: return { bg: '#F3F4F6', color: '#374151', label: 'Unknown' }
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Compliance Audit</h1>
        <p className="page-subtitle">
          Generate AI-powered compliance reports for your decision-making systems
        </p>
      </div>

      {/* Report Generation */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">Generate Audit Report</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                Start Date (Optional)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #E5E5E5',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                End Date (Optional)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #E5E5E5',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={generateReport}
            disabled={loading}
            style={{ width: '200px' }}
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {/* Compliance Status */}
      {report && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-body">
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
                Compliance Status
              </div>
              <div style={{
                display: 'inline-block',
                padding: '12px 32px',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                background: getStatusColor(report.complianceStatus).bg,
                color: getStatusColor(report.complianceStatus).color,
              }}>
                {getStatusColor(report.complianceStatus).label}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Executive Summary */}
      {report && report.executiveSummary && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">Executive Summary</h3>
          </div>
          <div className="card-body">
            <div style={{ fontSize: '15px', color: '#333', lineHeight: 1.8 }}>
              {report.executiveSummary}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Findings */}
        {report && report.findings && report.findings.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2">
                  <path d="M9 11l3 3L22 4"/>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
                <h3 className="card-title">Findings</h3>
              </div>
            </div>
            <div className="card-body">
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {report.findings.map((finding, idx) => (
                  <li key={idx} style={{ fontSize: '14px', color: '#333', lineHeight: 1.7, marginBottom: '8px' }}>
                    {finding}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Concerns */}
        {report && report.concerns && report.concerns.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <h3 className="card-title">Concerns</h3>
              </div>
            </div>
            <div className="card-body">
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {report.concerns.map((concern, idx) => (
                  <li key={idx} style={{ fontSize: '14px', color: '#333', lineHeight: 1.7, marginBottom: '8px' }}>
                    {concern}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {report && report.recommendations && report.recommendations.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2">
                <path d="M12 2v20M2 12h20"/>
              </svg>
              <h3 className="card-title">Recommendations</h3>
            </div>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {report.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 16px',
                    background: '#F0FDF4',
                    borderRadius: '8px',
                    borderLeft: '3px solid #22C55E',
                  }}
                >
                  <div style={{
                    minWidth: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#22C55E',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}>
                    {idx + 1}
                  </div>
                  <div style={{ fontSize: '14px', color: '#166534', lineHeight: 1.6, flex: 1 }}>
                    {rec}
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
              <div className="empty-state-title">No audit report generated</div>
              <div className="empty-state-description">
                Generate a compliance audit report to review decision-making patterns, identify concerns, and get recommendations
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Audit
