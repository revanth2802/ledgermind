import { useApi } from '../hooks/useApi'
import { api, AnalyticsOverview, AgentStats, Event } from '../api/client'
import { formatConfidence, formatRelative, getOutcomeColor, getInitials } from '../utils/format'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const COLORS = ['#22C55E', '#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6']

const Dashboard = () => {
  const { data: overview, loading: overviewLoading } = useApi<AnalyticsOverview>(
    () => api.getAnalyticsOverview(),
    []
  )

  const { data: agents, loading: agentsLoading } = useApi<AgentStats[]>(
    () => api.getAgentStats(),
    []
  )

  const { data: recentEvents, loading: eventsLoading } = useApi<Event[]>(
    () => api.getEvents(undefined, 10),
    []
  )

  const outcomeData = overview?.outcome_distribution
    ? Object.entries(overview.outcome_distribution).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }))
    : []

  // Mock trend data - in production, fetch from API
  const trendData = [
    { date: 'Mon', decisions: 12, overrides: 1 },
    { date: 'Tue', decisions: 19, overrides: 2 },
    { date: 'Wed', decisions: 15, overrides: 0 },
    { date: 'Thu', decisions: 25, overrides: 3 },
    { date: 'Fri', decisions: 22, overrides: 1 },
    { date: 'Sat', decisions: 8, overrides: 0 },
    { date: 'Sun', decisions: 5, overrides: 0 },
  ]

  if (overviewLoading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Decision Memory Overview</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6600" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
            Total Traces
          </div>
          <div className="stat-value">{overview?.total_traces || 0}</div>
          <div className="stat-change positive">↑ 12% from last week</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            Total Decisions
          </div>
          <div className="stat-value">{overview?.total_events || 0}</div>
          <div className="stat-change positive">↑ 8% from last week</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            Avg Confidence
          </div>
          <div className="stat-value">{formatConfidence(overview?.avg_confidence || 0)}</div>
          <div className="stat-change positive">↑ 2% from last week</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Total Overrides
          </div>
          <div className="stat-value">{overview?.total_overrides || 0}</div>
          <div className="stat-change negative">↓ 5% from last week</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Decision Trend</h3>
            <button className="btn btn-ghost">Last 7 days</button>
          </div>
          <div className="card-body">
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                  <XAxis dataKey="date" stroke="#999" fontSize={12} />
                  <YAxis stroke="#999" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #E5E5E5',
                      borderRadius: '8px',
                      fontSize: '13px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="decisions"
                    stroke="#FF6600"
                    fill="rgba(255, 102, 0, 0.1)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="overrides"
                    stroke="#F59E0B"
                    fill="rgba(245, 158, 11, 0.1)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Outcome Distribution</h3>
          </div>
          <div className="card-body">
            <div className="chart-container" style={{ display: 'flex', alignItems: 'center' }}>
              <ResponsiveContainer width="50%" height="100%">
                <PieChart>
                  <Pie
                    data={outcomeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {outcomeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1, paddingLeft: '24px' }}>
                {outcomeData.map((item, index) => (
                  <div
                    key={item.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '3px',
                        background: COLORS[index % COLORS.length],
                      }}
                    />
                    <span style={{ fontSize: '14px', color: '#666' }}>{item.name}</span>
                    <span style={{ fontSize: '14px', fontWeight: 600, marginLeft: 'auto' }}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid-2">
        {/* Actor Performance */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Actor Performance</h3>
            <button className="btn btn-ghost">View all</button>
          </div>
          <div className="card-body">
            {agentsLoading ? (
              <div className="loading">
                <div className="spinner" />
              </div>
            ) : agents && agents.length > 0 ? (
              agents.slice(0, 5).map((agent) => (
                <div key={agent.agent_name} className="agent-card">
                  <div
                    className="agent-avatar"
                    style={{
                      background: `hsl(${agent.agent_name.charCodeAt(0) * 10}, 60%, 50%)`,
                    }}
                  >
                    {getInitials(agent.agent_name)}
                  </div>
                  <div className="agent-info">
                    <div className="agent-name">{agent.agent_name}</div>
                    <div className="agent-stats">
                      {agent.total_decisions} decisions · {agent.override_count} overrides
                    </div>
                  </div>
                  <div className="agent-confidence">
                    <div className="agent-confidence-value">
                      {formatConfidence(agent.avg_confidence)}
                    </div>
                    <div className="agent-confidence-label">confidence</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <div className="empty-state-title">No actors yet</div>
                <div className="empty-state-description">
                  Start recording decisions to see actor performance
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Activity</h3>
            <button className="btn btn-ghost">View all</button>
          </div>
          <div className="card-body">
            {eventsLoading ? (
              <div className="loading">
                <div className="spinner" />
              </div>
            ) : recentEvents && recentEvents.length > 0 ? (
              <div className="timeline">
                {recentEvents.slice(0, 5).map((event) => (
                  <div key={event.event_id} className="timeline-item">
                    <div className={`timeline-dot ${getOutcomeColor(event.outcome)}`}>
                      <div className="timeline-dot-inner" />
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span className="timeline-title">
                          {event.event_type.replace(/_/g, ' ')}
                        </span>
                        <span className="timeline-time">
                          {formatRelative(event.timestamp)}
                        </span>
                      </div>
                      <div className="timeline-agent">{event.actor_name}</div>
                      {event.outcome && (
                        <span className={`badge ${getOutcomeColor(event.outcome)}`}>
                          {event.outcome}
                        </span>
                      )}
                      {event.confidence && (
                        <div className="timeline-confidence">
                          <div className="confidence-bar">
                            <div
                              className="confidence-fill"
                              style={{ width: `${event.confidence * 100}%` }}
                            />
                          </div>
                          {formatConfidence(event.confidence)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-title">No activity yet</div>
                <div className="empty-state-description">
                  Decision events will appear here
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
