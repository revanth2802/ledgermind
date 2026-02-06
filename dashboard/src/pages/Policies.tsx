import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { api, Policy } from '../api/client'
import { formatDateTime } from '../utils/format'

const Policies = () => {
  const { data: policies, loading, refetch } = useApi<Policy[]>(
    () => api.getPolicies(),
    []
  )

  const [showCreate, setShowCreate] = useState(false)
  const [newPolicy, setNewPolicy] = useState({
    policy_name: '',
    version: '1',
    content: '{}',
  })
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    try {
      setCreating(true)
      await api.createPolicy({
        policy_name: newPolicy.policy_name,
        version: newPolicy.version,
        content: JSON.parse(newPolicy.content),
      })
      setShowCreate(false)
      setNewPolicy({ policy_name: '', version: '1', content: '{}' })
      refetch()
    } catch (err) {
      console.error('Failed to create policy:', err)
      alert('Failed to create policy. Check console for details.')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Decision Policies</h1>
          <p className="page-subtitle">Manage versioned policies that guide agent decisions</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Policy
        </button>
      </div>

      {/* Create Policy Modal */}
      {showCreate && (
        <div style={{
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
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '24px',
            width: '500px',
            maxWidth: '90%',
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>
              Create New Policy
            </h2>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
                Policy Name *
              </label>
              <input
                type="text"
                value={newPolicy.policy_name}
                onChange={(e) => setNewPolicy({ ...newPolicy, policy_name: e.target.value })}
                placeholder="e.g., REFUND_POLICY"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #E5E5E5',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
                Version *
              </label>
              <input
                type="text"
                value={newPolicy.version}
                onChange={(e) => setNewPolicy({ ...newPolicy, version: e.target.value })}
                placeholder="e.g., 1"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #E5E5E5',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
                Content (JSON) *
              </label>
              <textarea
                value={newPolicy.content}
                onChange={(e) => setNewPolicy({ ...newPolicy, content: e.target.value })}
                placeholder='{"max_amount": 500, "require_approval": true}'
                rows={6}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #E5E5E5',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowCreate(false)}
                disabled={creating}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleCreate}
                disabled={creating || !newPolicy.policy_name || !newPolicy.version}
              >
                {creating ? 'Creating...' : 'Create Policy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Policies List */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">All Policies</h3>
          <span style={{ fontSize: '13px', color: '#999' }}>
            {policies?.length || 0} policies
          </span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {policies && policies.length > 0 ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Policy</th>
                    <th>Version</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Content</th>
                  </tr>
                </thead>
                <tbody>
                  {policies.map((policy) => (
                    <tr key={policy.policy_version_id}>
                      <td>
                        <div>
                          <div style={{ fontWeight: 600 }}>{policy.policy_name}</div>
                          <div style={{ fontSize: '12px', color: '#666', marginTop: '2px', fontFamily: 'monospace' }}>
                            {policy.policy_version_id}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          padding: '4px 8px',
                          background: '#F5F5F5',
                          borderRadius: '4px',
                          fontSize: '13px',
                          fontFamily: 'monospace',
                        }}>
                          v{policy.version}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 600,
                          background: !policy.deprecated_at 
                            ? 'rgba(34, 197, 94, 0.1)' 
                            : 'rgba(153, 153, 153, 0.1)',
                          color: !policy.deprecated_at ? '#22C55E' : '#999',
                        }}>
                          {!policy.deprecated_at ? 'Active' : 'Deprecated'}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px', color: '#666' }}>
                        {formatDateTime(policy.created_at)}
                      </td>
                      <td>
                        <details>
                          <summary style={{ 
                            cursor: 'pointer', 
                            fontSize: '13px', 
                            color: '#FF6600' 
                          }}>
                            View Content
                          </summary>
                          <pre style={{
                            marginTop: '8px',
                            padding: '12px',
                            background: '#F5F5F5',
                            borderRadius: '6px',
                            fontSize: '12px',
                            overflow: 'auto',
                            maxWidth: '300px',
                          }}>
                            {typeof policy.content === 'string' 
                              ? policy.content 
                              : JSON.stringify(policy.content, null, 2)}
                          </pre>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <div className="empty-state-title">No policies yet</div>
              <div className="empty-state-description">
                Create a policy to define decision rules for your agents
              </div>
              <button 
                className="btn btn-primary" 
                onClick={() => setShowCreate(true)}
                style={{ marginTop: '16px' }}
              >
                Create First Policy
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Policies
