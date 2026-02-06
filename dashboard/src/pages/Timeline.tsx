import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { api, Event, Trace } from '../api/client'
import { formatDateTime, formatConfidence, getOutcomeColor } from '../utils/format'

const Timeline = () => {
  const [selectedTrace, setSelectedTrace] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  const { data: traces, loading: tracesLoading } = useApi<Trace[]>(
    () => api.getTraces(50),
    []
  )

  const { data: events, loading: eventsLoading } = useApi<Event[]>(
    () => selectedTrace ? api.getEvents(selectedTrace) : api.getEvents(undefined, 50),
    [selectedTrace]
  )

  const filteredEvents = events?.filter((event) => {
    if (filter === 'all') return true
    if (filter === 'decisions') return event.event_type === 'step_result'
    if (filter === 'starts') return event.event_type === 'step_start'
    return true
  })

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Decision Timeline</h1>
        <p className="page-subtitle">Complete history of agent decisions and precedents</p>
      </div>

      {/* Trace Selector */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-body" style={{ padding: '16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '14px', fontWeight: 500, color: '#666' }}>
              Filter by Trace:
            </label>
            <select
              value={selectedTrace || ''}
              onChange={(e) => setSelectedTrace(e.target.value || null)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: selectedTrace ? '2px solid #FF6600' : '1px solid #E5E5E5',
                fontSize: '14px',
                minWidth: '300px',
                background: selectedTrace ? '#FFF8F3' : '#fff',
              }}
            >
              <option value="">All Traces</option>
              {traces?.map((trace) => (
                <option key={trace.trace_id} value={trace.trace_id}>
                  {trace.workflow_name} - {trace.trace_id.slice(0, 8)}...
                </option>
              ))}
            </select>

            {selectedTrace && (
              <button
                onClick={() => setSelectedTrace(null)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #E5E5E5',
                  background: '#fff',
                  color: '#666',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Clear Filter
              </button>
            )}

            <div style={{ marginLeft: 'auto' }}>
              <span style={{ fontSize: '13px', color: '#999' }}>
                {filteredEvents?.length || 0} events
                {selectedTrace && <span style={{ color: '#FF6600', fontWeight: 600 }}> (filtered)</span>}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Events
        </button>
        <button
          className={`filter-btn ${filter === 'decisions' ? 'active' : ''}`}
          onClick={() => setFilter('decisions')}
        >
          Decisions Only
        </button>
        <button
          className={`filter-btn ${filter === 'starts' ? 'active' : ''}`}
          onClick={() => setFilter('starts')}
        >
          Step Starts
        </button>
      </div>

      {/* Timeline */}
      <div className="card">
        <div className="card-body">
          {tracesLoading || eventsLoading ? (
            <div className="loading">
              <div className="spinner" />
            </div>
          ) : filteredEvents && filteredEvents.length > 0 ? (
            <div className="timeline">
              {filteredEvents.map((event) => (
                <div key={event.event_id} className="timeline-item">
                  <div className={`timeline-dot ${getOutcomeColor(event.outcome)}`}>
                    <div className="timeline-dot-inner" />
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <span className="timeline-title">
                        
                        {event.event_type.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <span className="timeline-time">
                        {formatDateTime(event.timestamp)}
                      </span>
                    </div>
                    
                    <div className="timeline-agent">
                      <strong>{event.actor_name}</strong>
                      <span style={{ color: '#999', marginLeft: '8px' }}>
                        Step: {event.step_id.slice(0, 8)}...
                      </span>
                    </div>

                    {/* Input Context */}
                    {event.input_context && Object.keys(event.input_context).length > 0 && (
                      <details style={{ marginTop: '8px' }}>
                        <summary style={{ 
                          cursor: 'pointer', 
                          fontSize: '12px', 
                          color: '#666',
                          fontWeight: 500 
                        }}>
                          Input Context
                        </summary>
                        <pre style={{
                          marginTop: '8px',
                          padding: '12px',
                          background: '#fff',
                          borderRadius: '6px',
                          fontSize: '12px',
                          overflow: 'auto',
                          maxHeight: '200px',
                        }}>
                          {JSON.stringify(event.input_context, null, 2)}
                        </pre>
                      </details>
                    )}

                    {/* Outcome & Confidence */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      marginTop: '12px' 
                    }}>
                      {event.outcome && (
                        <span className={`badge ${getOutcomeColor(event.outcome)}`}>
                          {event.outcome}
                        </span>
                      )}
                      {event.confidence !== null && (
                        <div className="timeline-confidence">
                          <div className="confidence-bar">
                            <div
                              className="confidence-fill"
                              style={{ width: `${event.confidence * 100}%` }}
                            />
                          </div>
                          {formatConfidence(event.confidence)} confidence
                        </div>
                      )}
                    </div>

                    {/* Reasoning */}
                    {event.reasoning && (
                      <div style={{
                        marginTop: '12px',
                        padding: '12px',
                        background: 'rgba(255, 102, 0, 0.05)',
                        borderRadius: '6px',
                        borderLeft: '3px solid #FF6600',
                      }}>
                        <div style={{ 
                          fontSize: '11px', 
                          fontWeight: 600, 
                          color: '#FF6600',
                          marginBottom: '4px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Reasoning
                        </div>
                        <div style={{ fontSize: '13px', color: '#333' }}>
                          {event.reasoning}
                        </div>
                      </div>
                    )}

                    {/* Trace Link */}
                    <div style={{ marginTop: '12px' }}>
                      <button
                        onClick={() => {
                          setSelectedTrace(event.trace_id)
                          // Scroll to top to see the filter change
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                        style={{
                          fontSize: '12px',
                          color: '#FF6600',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          textDecoration: 'underline',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#CC5200'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#FF6600'}
                      >
                        View full trace →
                      </button>
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
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <div className="empty-state-title">No events found</div>
              <div className="empty-state-description">
                {selectedTrace
                  ? 'No events for this trace'
                  : 'Start recording decisions to see timeline'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Timeline
