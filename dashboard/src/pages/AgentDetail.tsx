import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { api, AgentStats, Event, Override, Policy } from '../api/client'
import { formatConfidence, formatDateTime, getInitials } from '../utils/format'

const COLORS = ['#FF6600', '#3B82F6', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']

type TabType = 'decisions' | 'overrides' | 'policies' | 'audit'

const AgentDetail = () => {
  const { agentName } = useParams<{ agentName: string }>()
  const navigate = useNavigate()
  const decodedAgentName = decodeURIComponent(agentName || '')
  
  const [activeTab, setActiveTab] = useState<TabType>('decisions')
  const [showOverrideModal, setShowOverrideModal] = useState(false)
  const [showExplainModal, setShowExplainModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [explanation, setExplanation] = useState<string>('')
  const [loadingExplanation, setLoadingExplanation] = useState(false)
  const [overrideForm, setOverrideForm] = useState({
    new_outcome: '',
    reason: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const { data: agents } = useApi<AgentStats[]>(() => api.getAgentStats(), [])
  const { data: allEvents, refetch: refetchEvents } = useApi<Event[]>(
    () => api.getEvents(undefined, 100),
    []
  )
  const { data: allOverrides, refetch: refetchOverrides } = useApi<Override[]>(
    () => api.getOverrides(100),
    []
  )
  const { data: policies } = useApi<Policy[]>(() => api.getPolicies(), [])

  const agent = agents?.find(a => a.agent_name === decodedAgentName)
  const agentIndex = agents?.findIndex(a => a.agent_name === decodedAgentName) || 0
  const agentEvents = allEvents?.filter(e => e.actor_name === decodedAgentName) || []
  const agentOverrides = allOverrides?.filter(o => {
    const originalEvent = allEvents?.find(e => e.event_id === o.original_event_id)
    return originalEvent?.actor_name === decodedAgentName
  }) || []

  const accuracy = agent && agent.total_decisions > 0
    ? Math.round(((agent.total_decisions - agent.override_count) / agent.total_decisions) * 100)
    : 100

  const handleOverride = async () => {
    if (!selectedEvent || !overrideForm.new_outcome || !overrideForm.reason) return
    
    setSubmitting(true)
    try {
      await api.createOverride({
        original_event_id: selectedEvent.event_id,
        trace_id: selectedEvent.trace_id,
        original_outcome: selectedEvent.outcome || 'unknown',
        new_outcome: overrideForm.new_outcome,
        reason: overrideForm.reason,
        actor_name: 'Dashboard_User',
      })
      setShowOverrideModal(false)
      setSelectedEvent(null)
      setOverrideForm({ new_outcome: '', reason: '' })
      refetchEvents()
      refetchOverrides()
    } catch (err) {
      console.error('Override failed:', err)
      alert('Failed to create override')
    } finally {
      setSubmitting(false)
    }
  }

  const handleExplain = async (event: Event) => {
    setSelectedEvent(event)
    setShowExplainModal(true)
    setLoadingExplanation(true)
    setExplanation('')
    
    try {
      const response = await fetch('/api/ai/generate-reasoning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer demo-key',
          'x-tenant-id': 'demo-tenant',
        },
        body: JSON.stringify({
          agentName: event.actor_name,
          input: event.input_context || {},
          output: { outcome: event.outcome },
        }),
      })
      const data = await response.json()
      setExplanation(data.reasoning || 'No explanation available')
    } catch (err) {
      console.error('Explanation failed:', err)
      setExplanation('Failed to generate explanation')
    } finally {
      setLoadingExplanation(false)
    }
  }

  if (!agent) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div>
      {/* Back Button + Header */}
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={() => navigate('/agents')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            color: '#666',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '8px 0',
            marginBottom: '16px',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back to Agents
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: COLORS[agentIndex % COLORS.length],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 700,
              fontSize: '22px',
            }}
          >
            {getInitials(decodedAgentName)}
          </div>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0, color: '#111' }}>
              {decodedAgentName}
            </h1>
            <p style={{ fontSize: '14px', color: '#666', margin: '4px 0 0 0' }}>
              AI Decision Agent · {agent.total_decisions} total decisions
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-label">Total Decisions</div>
          <div className="stat-value">{agent.total_decisions}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Accuracy</div>
          <div className="stat-value" style={{ color: accuracy >= 90 ? '#22C55E' : '#F59E0B' }}>
            {accuracy}%
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Confidence</div>
          <div className="stat-value">{formatConfidence(agent.avg_confidence)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Human Overrides</div>
          <div className="stat-value" style={{ color: agent.override_count > 0 ? '#F59E0B' : '#22C55E' }}>
            {agent.override_count}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '24px',
        background: '#F5F5F5',
        padding: '4px',
        borderRadius: '10px',
        width: 'fit-content',
      }}>
        {[
          { id: 'decisions', label: 'Decisions', count: agentEvents.length },
          { id: 'overrides', label: 'Overrides', count: agentOverrides.length },
          { id: 'policies', label: 'Policies', count: policies?.length || 0 },
          { id: 'audit', label: 'Audit Log' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === tab.id ? '#fff' : 'transparent',
              color: activeTab === tab.id ? '#111' : '#666',
              fontWeight: activeTab === tab.id ? 600 : 400,
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span style={{
                background: activeTab === tab.id ? '#F5F5F5' : '#E5E5E5',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '12px',
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'decisions' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Decisions</h3>
            <span style={{ fontSize: '13px', color: '#666' }}>
              Click any decision to override it
            </span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {agentEvents.length > 0 ? (
              <div>
                {agentEvents.map((event) => {
                  const wasOverridden = allOverrides?.some(o => o.original_event_id === event.event_id)
                  
                  return (
                    <div
                      key={event.event_id}
                      style={{
                        padding: '16px 24px',
                        borderBottom: '1px solid #F0F0F0',
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        setSelectedEvent(event)
                        setShowOverrideModal(true)
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#FAFAFA'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                        <div style={{
                          padding: '6px 12px',
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
                        </div>
                        
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', color: '#333', marginBottom: '4px' }}>
                            {event.reasoning || 'No reasoning provided'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#999' }}>
                            {formatDateTime(event.timestamp)} · Confidence: {formatConfidence(event.confidence || 0)}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {wasOverridden && (
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              background: 'rgba(245, 158, 11, 0.1)',
                              color: '#F59E0B',
                              fontSize: '11px',
                              fontWeight: 600,
                            }}>
                              OVERRIDDEN
                            </span>
                          )}
                          <button
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid #E5E5E5',
                              background: '#fff',
                              color: '#666',
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleExplain(event)
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#F8F9FA'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                          >
                            Explain
                          </button>
                          <button
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid #E5E5E5',
                              background: '#fff',
                              color: '#666',
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedEvent(event)
                              setShowOverrideModal(true)
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#F8F9FA'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                          >
                            Override
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '48px 24px' }}>
                <div className="empty-state-title">No decisions recorded</div>
                <div className="empty-state-description">
                  This agent hasn't made any decisions yet
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'overrides' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Override History</h3>
            <span style={{ fontSize: '13px', color: '#666' }}>
              Human corrections to this agent's decisions
            </span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {agentOverrides.length > 0 ? (
              <div>
                {agentOverrides.map((override) => (
                  <div
                    key={override.override_id}
                    style={{
                      padding: '16px 24px',
                      borderBottom: '1px solid #F0F0F0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#EF4444',
                        fontSize: '12px',
                        fontWeight: 500,
                        textDecoration: 'line-through',
                      }}>
                        {override.original_outcome}
                      </span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                        <polyline points="12 5 19 12 12 19"/>
                      </svg>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        background: 'rgba(34, 197, 94, 0.1)',
                        color: '#22C55E',
                        fontSize: '12px',
                        fontWeight: 500,
                      }}>
                        {override.new_outcome}
                      </span>
                      <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#999' }}>
                        by {override.actor_name}
                      </span>
                    </div>
                    <div style={{ fontSize: '14px', color: '#333', marginBottom: '4px' }}>
                      {override.reason}
                    </div>
                    <div style={{ fontSize: '12px', color: '#999' }}>
                      {formatDateTime(override.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '48px 24px' }}>
                <div className="empty-state-title">No overrides</div>
                <div className="empty-state-description">
                  No human corrections have been made to this agent's decisions
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'policies' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Active Policies</h3>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/policies')}
              style={{ fontSize: '13px', padding: '8px 16px' }}
            >
              Manage Policies
            </button>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {policies && policies.length > 0 ? (
              <div>
                {policies.map((policy) => (
                  <div
                    key={policy.policy_version_id}
                    style={{
                      padding: '16px 24px',
                      borderBottom: '1px solid #F0F0F0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 600, fontSize: '15px', color: '#111' }}>
                        {policy.policy_name}
                      </span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: '#F5F5F5',
                        fontSize: '12px',
                        color: '#666',
                      }}>
                        v{policy.version}
                      </span>
                      {!policy.deprecated_at && (
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'rgba(34, 197, 94, 0.1)',
                          color: '#22C55E',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}>
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '13px', color: '#666' }}>
                      Created {formatDateTime(policy.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '48px 24px' }}>
                <div className="empty-state-title">No policies defined</div>
                <div className="empty-state-description">
                  Create policies to guide this agent's decisions
                </div>
                <button 
                  className="btn btn-primary" 
                  onClick={() => navigate('/policies')}
                  style={{ marginTop: '16px' }}
                >
                  Create Policy
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Audit Log</h3>
            <span style={{ fontSize: '13px', color: '#666' }}>
              Complete history of all actions
            </span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {agentEvents.length > 0 || agentOverrides.length > 0 ? (
              <div>
                {/* Combine and sort events + overrides by timestamp */}
                {[
                  ...agentEvents.map(e => ({ type: 'decision' as const, data: e, timestamp: e.timestamp })),
                  ...agentOverrides.map(o => ({ type: 'override' as const, data: o, timestamp: o.timestamp })),
                ]
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 24px',
                        borderBottom: '1px solid #F0F0F0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: item.type === 'decision' ? '#3B82F6' : '#F59E0B',
                      }} />
                      <div style={{ flex: 1 }}>
                        {item.type === 'decision' ? (
                          <span style={{ fontSize: '13px', color: '#333' }}>
                            Decision: <strong>{(item.data as Event).outcome}</strong>
                            {(item.data as Event).reasoning && ` — ${(item.data as Event).reasoning?.slice(0, 60)}...`}
                          </span>
                        ) : (
                          <span style={{ fontSize: '13px', color: '#333' }}>
                            Override by <strong>{(item.data as Override).actor_name}</strong>: {(item.data as Override).original_outcome} → {(item.data as Override).new_outcome}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '12px', color: '#999' }}>
                        {formatDateTime(item.timestamp)}
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '48px 24px' }}>
                <div className="empty-state-title">No audit history</div>
                <div className="empty-state-description">
                  Activity will appear here as the agent makes decisions
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Override Modal */}
      {showOverrideModal && selectedEvent && (
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
          onClick={() => setShowOverrideModal(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '24px',
              width: '480px',
              maxWidth: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
              Override Decision
            </h2>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
              Correct this agent's decision. Your correction becomes part of the decision memory.
            </p>

            <div style={{
              padding: '12px',
              background: '#F8F9FA',
              borderRadius: '8px',
              marginBottom: '20px',
            }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                Original Decision
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
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
                  fontSize: '13px',
                  fontWeight: 600,
                }}>
                  {selectedEvent.outcome}
                </span>
                <span style={{ fontSize: '13px', color: '#666' }}>
                  with {formatConfidence(selectedEvent.confidence || 0)} confidence
                </span>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
                New Outcome
              </label>
              <select
                value={overrideForm.new_outcome}
                onChange={(e) => setOverrideForm({ ...overrideForm, new_outcome: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #E5E5E5',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              >
                <option value="">Select new outcome...</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="escalated">Escalated</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
                Reason for Override
              </label>
              <textarea
                value={overrideForm.reason}
                onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                placeholder="Explain why you're overriding this decision..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #E5E5E5',
                  borderRadius: '8px',
                  fontSize: '14px',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowOverrideModal(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleOverride}
                disabled={submitting || !overrideForm.new_outcome || !overrideForm.reason}
              >
                {submitting ? 'Submitting...' : 'Submit Override'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Explain Modal */}
      {showExplainModal && selectedEvent && (
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
          onClick={() => setShowExplainModal(false)}
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
                AI Explanation
              </h2>
              <button
                onClick={() => setShowExplainModal(false)}
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
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>Decision</div>
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
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>AI Explanation</div>
              {loadingExplanation ? (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <div className="spinner" style={{ margin: '0 auto' }} />
                </div>
              ) : (
                <div style={{
                  padding: '16px',
                  background: '#F8F9FA',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#333',
                  lineHeight: 1.7,
                }}>
                  {explanation}
                </div>
              )}
            </div>

            {selectedEvent.reasoning && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>Original Reasoning</div>
                <div style={{ fontSize: '14px', color: '#666', lineHeight: 1.6 }}>
                  {selectedEvent.reasoning}
                </div>
              </div>
            )}

            <div style={{ fontSize: '13px', color: '#999' }}>
              {formatDateTime(selectedEvent.timestamp)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AgentDetail
