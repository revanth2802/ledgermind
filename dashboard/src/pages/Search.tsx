import { useState } from 'react'
import { Event } from '../api/client'
import { formatDateTime, formatConfidence } from '../utils/format'

const Search = () => {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<Array<{ event: Event; similarity: number }>>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

  const handleSearch = async () => {
    if (!query.trim()) return
    
    setSearching(true)
    try {
      const response = await fetch('/api/ai/similar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer demo-key',
          'x-tenant-id': 'demo-tenant',
        },
        body: JSON.stringify({ query, limit: 10 }),
      })
      const data = await response.json()
      setResults(data.similar_cases || [])
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      setSearching(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Find Similar Decisions</h1>
        <p className="page-subtitle">
          Use AI-powered vector search to find past decisions similar to your case
        </p>
      </div>

      {/* Search Input */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-body">
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
              Describe your case or decision context
            </label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., Customer requesting refund for $500 order placed 15 days ago, claims product was defective..."
              rows={4}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #E5E5E5',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'vertical',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleSearch()
                }
              }}
            />
            <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
              Press Cmd+Enter to search
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleSearch}
            disabled={searching || !query.trim()}
            style={{ width: '200px' }}
          >
            {searching ? 'Searching...' : 'Find Similar Cases'}
          </button>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Similar Past Decisions</h3>
            <span style={{ fontSize: '13px', color: '#666' }}>
              {results.length} matches found
            </span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {results.map(({ event, similarity }) => (
              <div
                key={event.event_id}
                style={{
                  padding: '16px 24px',
                  borderBottom: '1px solid #F0F0F0',
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedEvent(event)}
                onMouseEnter={(e) => e.currentTarget.style.background = '#FAFAFA'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '8px' }}>
                  {/* Similarity Score */}
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: similarity > 0.8 
                      ? 'rgba(34, 197, 94, 0.1)' 
                      : similarity > 0.6 
                        ? 'rgba(59, 130, 246, 0.1)'
                        : 'rgba(245, 158, 11, 0.1)',
                    textAlign: 'center',
                    minWidth: '70px',
                  }}>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: similarity > 0.8 ? '#22C55E' : similarity > 0.6 ? '#3B82F6' : '#F59E0B',
                    }}>
                      {Math.round(similarity * 100)}%
                    </div>
                    <div style={{ fontSize: '10px', color: '#666' }}>match</div>
                  </div>

                  {/* Decision Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        background: event.outcome === 'approved' 
                          ? 'rgba(34, 197, 94, 0.1)'
                          : event.outcome === 'rejected'
                            ? 'rgba(239, 68, 68, 0.1)'
                            : 'rgba(59, 130, 246, 0.1)',
                        color: event.outcome === 'approved'
                          ? '#22C55E'
                          : event.outcome === 'rejected'
                            ? '#EF4444'
                            : '#3B82F6',
                      }}>
                        {event.outcome || 'pending'}
                      </span>
                      <span style={{ fontSize: '13px', color: '#666' }}>
                        by {event.actor_name}
                      </span>
                      <span style={{ fontSize: '13px', color: '#666' }}>
                        · {formatConfidence(event.confidence || 0)} confidence
                      </span>
                    </div>
                    <div style={{ fontSize: '14px', color: '#333', marginBottom: '4px' }}>
                      {event.reasoning || 'No reasoning provided'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#999' }}>
                      {formatDateTime(event.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {!searching && query && results.length === 0 && (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <div className="empty-state-title">No similar decisions found</div>
              <div className="empty-state-description">
                Try rephrasing your query or make your first decision to build precedent history
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decision Detail Modal */}
      {selectedEvent && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setSelectedEvent(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '24px',
              width: '600px',
              maxWidth: '95%',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>
                Decision Details
              </h2>
              <button
                onClick={() => setSelectedEvent(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#999',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>Agent</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#111' }}>{selectedEvent.actor_name}</div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>Outcome</div>
              <span style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                textTransform: 'uppercase',
                background: selectedEvent.outcome === 'approved' 
                  ? 'rgba(34, 197, 94, 0.1)'
                  : selectedEvent.outcome === 'rejected'
                    ? 'rgba(239, 68, 68, 0.1)'
                    : 'rgba(59, 130, 246, 0.1)',
                color: selectedEvent.outcome === 'approved'
                  ? '#22C55E'
                  : selectedEvent.outcome === 'rejected'
                    ? '#EF4444'
                    : '#3B82F6',
              }}>
                {selectedEvent.outcome || 'pending'}
              </span>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>Confidence</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#111' }}>
                {formatConfidence(selectedEvent.confidence || 0)}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>Reasoning</div>
              <div style={{ fontSize: '14px', color: '#333', lineHeight: 1.6 }}>
                {selectedEvent.reasoning || 'No reasoning provided'}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>Timestamp</div>
              <div style={{ fontSize: '14px', color: '#333' }}>
                {formatDateTime(selectedEvent.timestamp)}
              </div>
            </div>

            {selectedEvent.input_context && Object.keys(selectedEvent.input_context).length > 0 && (
              <div>
                <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>Context</div>
                <pre style={{
                  background: '#F8F9FA',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  overflow: 'auto',
                  maxHeight: '200px',
                }}>
                  {JSON.stringify(selectedEvent.input_context, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Search
