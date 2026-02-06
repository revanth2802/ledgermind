import { useNavigate } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { api, AgentStats } from '../api/client'
import { formatConfidence, getInitials } from '../utils/format'

const COLORS = ['#FF6600', '#3B82F6', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']

const Agents = () => {
  const navigate = useNavigate()
  const { data: agents, loading } = useApi<AgentStats[]>(
    () => api.getAgentStats(),
    []
  )

  const sortedAgents = agents?.slice().sort((a, b) => b.total_decisions - a.total_decisions) || []
  
  const totalDecisions = agents?.reduce((sum, a) => sum + a.total_decisions, 0) || 0
  const totalOverrides = agents?.reduce((sum, a) => sum + a.override_count, 0) || 0
  const avgConfidence = agents && agents.length > 0
    ? agents.reduce((sum, a) => sum + a.avg_confidence, 0) / agents.length
    : 0
  const accuracyRate = totalDecisions > 0 
    ? Math.round(((totalDecisions - totalOverrides) / totalDecisions) * 100) 
    : 100

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
        <h1 className="page-title">Actors</h1>
        <p className="page-subtitle">
          Select an actor to view decisions, apply overrides, and manage policies
        </p>
      </div>

      {/* Summary Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Active Actors</div>
          <div className="stat-value">{agents?.length || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Decisions</div>
          <div className="stat-value">{totalDecisions}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Accuracy Rate</div>
          <div className="stat-value" style={{ color: accuracyRate >= 90 ? '#22C55E' : '#F59E0B' }}>
            {accuracyRate}%
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Confidence</div>
          <div className="stat-value">{formatConfidence(avgConfidence)}</div>
        </div>
      </div>

      {/* Agent List */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">All Agents</h3>
          <span style={{ fontSize: '13px', color: '#666' }}>
            Click to manage agent
          </span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {sortedAgents.length > 0 ? (
            <div>
              {sortedAgents.map((agent, index) => {
                const agentAccuracy = agent.total_decisions > 0
                  ? Math.round(((agent.total_decisions - agent.override_count) / agent.total_decisions) * 100)
                  : 100
                
                return (
                  <div
                    key={agent.agent_name}
                    onClick={() => navigate(`/agents/${encodeURIComponent(agent.agent_name)}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '16px 24px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #F0F0F0',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#FAFAFA'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        background: COLORS[index % COLORS.length],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '14px',
                        marginRight: '16px',
                      }}
                    >
                      {getInitials(agent.agent_name)}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '15px', color: '#111', marginBottom: '2px' }}>
                        {agent.agent_name}
                      </div>
                      <div style={{ fontSize: '13px', color: '#666' }}>
                        {agent.total_decisions} decisions · {formatConfidence(agent.avg_confidence)} confidence
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ 
                          fontSize: '16px', 
                          fontWeight: 600,
                          color: agentAccuracy >= 90 ? '#22C55E' : '#F59E0B',
                        }}>
                          {agentAccuracy}%
                        </div>
                        <div style={{ fontSize: '11px', color: '#999' }}>accuracy</div>
                      </div>

                      {agent.override_count > 0 && (
                        <div style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: 'rgba(245, 158, 11, 0.1)',
                          color: '#F59E0B',
                          fontSize: '12px',
                          fontWeight: 500,
                        }}>
                          {agent.override_count} overrides
                        </div>
                      )}

                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '48px 24px' }}>
              <div className="empty-state-title">No agents tracked yet</div>
              <div className="empty-state-description">
                Use the SDK to start recording agent decisions
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Agents
