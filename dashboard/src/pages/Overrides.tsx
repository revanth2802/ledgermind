import { useApi } from '../hooks/useApi'
import { api, Override } from '../api/client'
import { formatDateTime, formatRelative } from '../utils/format'

const Overrides = () => {
  const { data: overrides, loading } = useApi<Override[]>(
    () => api.getOverrides(100),
    []
  )

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Human Overrides</h1>
        <p className="page-subtitle">Track when humans correct agent decisions</p>
      </div>

      {/* Summary Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-label">Total Overrides</div>
          <div className="stat-value">{overrides?.length || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Unique Overriders</div>
          <div className="stat-value">
            {new Set(overrides?.map(o => o.actor_name)).size || 0}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">This Week</div>
          <div className="stat-value">
            {overrides?.filter(o => {
              const date = new Date(o.timestamp)
              const weekAgo = new Date()
              weekAgo.setDate(weekAgo.getDate() - 7)
              return date > weekAgo
            }).length || 0}
          </div>
        </div>
      </div>

      {/* Overrides List */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Override History</h3>
          <span style={{ fontSize: '13px', color: '#999' }}>
            Showing most recent overrides
          </span>
        </div>
        <div className="card-body">
          {overrides && overrides.length > 0 ? (
            <div className="timeline">
              {overrides.map((override) => (
                <div key={override.override_id} className="timeline-item">
                  <div className="timeline-dot override">
                    <div className="timeline-dot-inner" />
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <span className="timeline-title">
                        Decision Override
                      </span>
                      <span className="timeline-time">
                        {formatRelative(override.timestamp)}
                      </span>
                    </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px',
                      margin: '12px 0',
                    }}>
                      {/* Original Outcome */}
                      <div style={{
                        padding: '8px 16px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        borderRadius: '6px',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                      }}>
                        <div style={{ 
                          fontSize: '10px', 
                          fontWeight: 600, 
                          color: '#999',
                          textTransform: 'uppercase',
                          marginBottom: '2px',
                        }}>
                          Original
                        </div>
                        <div style={{ 
                          fontSize: '14px', 
                          fontWeight: 600, 
                          color: '#EF4444' 
                        }}>
                          {override.original_outcome}
                        </div>
                      </div>

                      {/* Arrow */}
                      <svg 
                        width="24" 
                        height="24" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="#999" 
                        strokeWidth="2"
                      >
                        <line x1="5" y1="12" x2="19" y2="12"/>
                        <polyline points="12 5 19 12 12 19"/>
                      </svg>

                      {/* New Outcome */}
                      <div style={{
                        padding: '8px 16px',
                        background: 'rgba(34, 197, 94, 0.1)',
                        borderRadius: '6px',
                        border: '1px solid rgba(34, 197, 94, 0.2)',
                      }}>
                        <div style={{ 
                          fontSize: '10px', 
                          fontWeight: 600, 
                          color: '#999',
                          textTransform: 'uppercase',
                          marginBottom: '2px',
                        }}>
                          Corrected
                        </div>
                        <div style={{ 
                          fontSize: '14px', 
                          fontWeight: 600, 
                          color: '#22C55E' 
                        }}>
                          {override.new_outcome}
                        </div>
                      </div>
                    </div>

                    {/* Reason */}
                    <div style={{
                      padding: '12px',
                      background: 'rgba(255, 102, 0, 0.05)',
                      borderRadius: '6px',
                      borderLeft: '3px solid #FF6600',
                      marginBottom: '12px',
                    }}>
                      <div style={{ 
                        fontSize: '11px', 
                        fontWeight: 600, 
                        color: '#FF6600',
                        marginBottom: '4px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Reason
                      </div>
                      <div style={{ fontSize: '13px', color: '#333' }}>
                        {override.reason}
                      </div>
                    </div>

                    {/* Footer */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '12px',
                      color: '#666',
                    }}>
                      <div>
                        <strong>Overridden by:</strong> {override.actor_name}
                      </div>
                      <div>
                        {formatDateTime(override.timestamp)}
                      </div>
                    </div>

                    {/* Event Link */}
                    <div style={{ 
                      marginTop: '8px',
                      paddingTop: '8px',
                      borderTop: '1px solid #E5E5E5',
                    }}>
                      <span style={{ 
                        fontSize: '11px', 
                        color: '#999',
                        fontFamily: 'monospace',
                      }}>
                        Event: {override.original_event_id.slice(0, 20)}...
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <svg 
                className="empty-state-icon" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1.5"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
              <div className="empty-state-title">No overrides recorded</div>
              <div className="empty-state-description">
                When humans correct agent decisions, they'll appear here.
                <br />
                Low override count = high agent accuracy! 🎉
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Learning Insights */}
      {overrides && overrides.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Learning Insights</h3>
          </div>
          <div className="card-body">
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '16px' 
            }}>
              <div style={{
                padding: '16px',
                background: '#F5F5F5',
                borderRadius: '8px',
              }}>
                <div style={{ 
                  fontSize: '13px', 
                  fontWeight: 600, 
                  marginBottom: '8px' 
                }}>
                  Most Common Original Outcomes
                </div>
                <div style={{ fontSize: '13px', color: '#666' }}>
                  {(() => {
                    const counts: Record<string, number> = {}
                    overrides.forEach(o => {
                      counts[o.original_outcome] = (counts[o.original_outcome] || 0) + 1
                    })
                    return Object.entries(counts)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 3)
                      .map(([outcome, count]) => (
                        <div key={outcome} style={{ marginBottom: '4px' }}>
                          {outcome}: <strong>{count}</strong>
                        </div>
                      ))
                  })()}
                </div>
              </div>

              <div style={{
                padding: '16px',
                background: '#F5F5F5',
                borderRadius: '8px',
              }}>
                <div style={{ 
                  fontSize: '13px', 
                  fontWeight: 600, 
                  marginBottom: '8px' 
                }}>
                  Top Overriders
                </div>
                <div style={{ fontSize: '13px', color: '#666' }}>
                  {(() => {
                    const counts: Record<string, number> = {}
                    overrides.forEach(o => {
                      counts[o.actor_name] = (counts[o.actor_name] || 0) + 1
                    })
                    return Object.entries(counts)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 3)
                      .map(([person, count]) => (
                        <div key={person} style={{ marginBottom: '4px' }}>
                          {person}: <strong>{count}</strong>
                        </div>
                      ))
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Overrides
