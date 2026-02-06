import { useState, useEffect } from 'react'

interface Settings {
  apiUrl: string
  openaiApiKey: string
  embeddingModel: string
  confidenceThreshold: number
  autoLogEnabled: boolean
  retentionDays: number
}

interface SystemStatus {
  status: string
  version: string
  embedding_provider: string
  database: string
  timestamp: string
}

const Settings = () => {
  const [settings, setSettings] = useState<Settings>({
    apiUrl: 'http://localhost:3000',
    openaiApiKey: '••••••••••••••••',
    embeddingModel: 'openai',
    confidenceThreshold: 0.7,
    autoLogEnabled: true,
    retentionDays: 90,
  })
  const [saved, setSaved] = useState(false)
  const [apiHealth, setApiHealth] = useState<'checking' | 'healthy' | 'error'>('checking')
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)

  useEffect(() => {
    checkApiHealth()
    fetchSystemStatus()
  }, [settings.apiUrl])

  const fetchSystemStatus = async () => {
    try {
      const response = await fetch(`${settings.apiUrl}/api/status`)
      if (response.ok) {
        const data = await response.json()
        setSystemStatus(data)
      }
    } catch {
      setSystemStatus(null)
    }
  }

  const checkApiHealth = async () => {
    setApiHealth('checking')
    try {
      const response = await fetch(`${settings.apiUrl}/health`)
      if (response.ok) {
        setApiHealth('healthy')
      } else {
        setApiHealth('error')
      }
    } catch {
      setApiHealth('error')
    }
  }

  const handleSave = () => {
    // In production, save to localStorage or API
    localStorage.setItem('ledgermind_settings', JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure LedgerMind for your environment</p>
      </div>

      {/* API Connection */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">API Connection</h3>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: apiHealth === 'healthy' ? '#22C55E' : apiHealth === 'error' ? '#EF4444' : '#F59E0B',
            }} />
            <span style={{ 
              fontSize: '13px', 
              color: apiHealth === 'healthy' ? '#22C55E' : apiHealth === 'error' ? '#EF4444' : '#F59E0B',
              fontWeight: 500,
            }}>
              {apiHealth === 'healthy' ? 'Connected' : apiHealth === 'error' ? 'Disconnected' : 'Checking...'}
            </span>
          </div>
        </div>
        <div className="card-body">
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: 500, 
              marginBottom: '8px',
              color: '#333',
            }}>
              API URL
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                value={settings.apiUrl}
                onChange={(e) => setSettings({ ...settings, apiUrl: e.target.value })}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: '1px solid #E5E5E5',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                }}
              />
              <button 
                className="btn btn-secondary"
                onClick={checkApiHealth}
              >
                Test Connection
              </button>
            </div>
            <p style={{ fontSize: '13px', color: '#666', marginTop: '8px' }}>
              The URL where your LedgerMind API server is running
            </p>
          </div>

          {/* System Status */}
          {systemStatus && (
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '16px',
              padding: '16px',
              background: '#F9FAFB',
              borderRadius: '8px',
            }}>
              <div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Version</div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>{systemStatus.version}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Embedding Provider</div>
                <div style={{ fontSize: '14px', fontWeight: 500, textTransform: 'capitalize' }}>{systemStatus.embedding_provider}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Database</div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: systemStatus.database === 'connected' ? '#22C55E' : '#EF4444' }}>
                  {systemStatus.database === 'connected' ? 'Connected' : 'Disconnected'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Embedding Provider */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Embedding Provider</h3>
        </div>
        <div className="card-body">
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: 500, 
              marginBottom: '8px',
              color: '#333',
            }}>
              Provider
            </label>
            <select
              value={settings.embeddingModel}
              onChange={(e) => setSettings({ ...settings, embeddingModel: e.target.value })}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #E5E5E5',
                borderRadius: '8px',
                fontSize: '14px',
                background: 'white',
              }}
            >
              <option value="openai">OpenAI (text-embedding-ada-002)</option>
              <option value="cohere">Cohere (embed-english-v3.0)</option>
              <option value="custom">Custom Endpoint</option>
              <option value="none">None (Testing only)</option>
            </select>
            <p style={{ fontSize: '13px', color: '#666', marginTop: '8px' }}>
              Configure via EMBEDDING_PROVIDER environment variable on the API server
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: 500, 
              marginBottom: '8px',
              color: '#333',
            }}>
              API Key
            </label>
            <input
              type="password"
              value={settings.openaiApiKey}
              onChange={(e) => setSettings({ ...settings, openaiApiKey: e.target.value })}
              placeholder="sk-... or your provider's key"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #E5E5E5',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'monospace',
              }}
            />
            <p style={{ fontSize: '13px', color: '#666', marginTop: '8px' }}>
              Set via OPENAI_API_KEY, COHERE_API_KEY, or custom auth header in the API server's .env file
            </p>
          </div>

          <div style={{ 
            padding: '16px',
            background: '#F5F5F5',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#666',
          }}>
            <strong style={{ color: '#333' }}>Environment Variables:</strong>
            <pre style={{ margin: '8px 0 0', fontFamily: 'monospace', fontSize: '12px' }}>
{`EMBEDDING_PROVIDER=openai|cohere|custom|none
OPENAI_API_KEY=sk-...
COHERE_API_KEY=...
EMBEDDING_ENDPOINT=https://... (for custom)`}
            </pre>
          </div>
        </div>
      </div>

      {/* Decision Settings */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Decision Settings</h3>
        </div>
        <div className="card-body">
          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: 500, 
              marginBottom: '8px',
              color: '#333',
            }}>
              Confidence Threshold
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.confidenceThreshold}
                onChange={(e) => setSettings({ ...settings, confidenceThreshold: parseFloat(e.target.value) })}
                style={{
                  flex: 1,
                  accentColor: '#FF6600',
                }}
              />
              <span style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#FF6600',
                minWidth: '60px',
                textAlign: 'right',
              }}>
                {(settings.confidenceThreshold * 100).toFixed(0)}%
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#666', marginTop: '8px' }}>
              Minimum confidence score required before using precedent recommendations
            </p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={settings.autoLogEnabled}
                onChange={(e) => setSettings({ ...settings, autoLogEnabled: e.target.checked })}
                style={{
                  width: '20px',
                  height: '20px',
                  accentColor: '#FF6600',
                }}
              />
              <div>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#333' }}>
                  Auto-log all decisions
                </span>
                <p style={{ fontSize: '13px', color: '#666', margin: '4px 0 0' }}>
                  Automatically capture all agent decisions without explicit logging calls
                </p>
              </div>
            </label>
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: 500, 
              marginBottom: '8px',
              color: '#333',
            }}>
              Data Retention (days)
            </label>
            <input
              type="number"
              min="7"
              max="365"
              value={settings.retentionDays}
              onChange={(e) => setSettings({ ...settings, retentionDays: parseInt(e.target.value) })}
              style={{
                width: '120px',
                padding: '12px 16px',
                border: '1px solid #E5E5E5',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
            <p style={{ fontSize: '13px', color: '#666', marginTop: '8px' }}>
              How long to retain decision history (minimum 7 days)
            </p>
          </div>
        </div>
      </div>

      {/* Database Info */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Database</h3>
        </div>
        <div className="card-body">
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(4, 1fr)', 
            gap: '24px',
          }}>
            <div>
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>Type</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#333' }}>PostgreSQL</div>
            </div>
            <div>
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>Database</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#333' }}>ledgermind</div>
            </div>
            <div>
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>Vector Support</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#333' }}>JSON Array</div>
            </div>
            <div>
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>Status</div>
              <div style={{ 
                fontSize: '14px', 
                fontWeight: 600, 
                color: '#22C55E',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E' }} />
                Connected
              </div>
            </div>
          </div>

          <div style={{ 
            marginTop: '24px', 
            padding: '16px', 
            background: '#FAFAFA', 
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#666',
          }}>
            postgresql://localhost:5432/ledgermind
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card" style={{ borderColor: '#FEE2E2' }}>
        <div className="card-header" style={{ background: '#FEF2F2' }}>
          <h3 className="card-title" style={{ color: '#EF4444' }}>Danger Zone</h3>
        </div>
        <div className="card-body">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            paddingBottom: '16px',
            borderBottom: '1px solid #E5E5E5',
            marginBottom: '16px',
          }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#333' }}>
                Clear All Decision History
              </div>
              <p style={{ fontSize: '13px', color: '#666', margin: '4px 0 0' }}>
                Permanently delete all traces, events, and overrides
              </p>
            </div>
            <button style={{
              padding: '10px 20px',
              background: 'white',
              border: '1px solid #EF4444',
              borderRadius: '8px',
              color: '#EF4444',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}>
              Clear Data
            </button>
          </div>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#333' }}>
                Reset All Settings
              </div>
              <p style={{ fontSize: '13px', color: '#666', margin: '4px 0 0' }}>
                Restore all settings to default values
              </p>
            </div>
            <button style={{
              padding: '10px 20px',
              background: 'white',
              border: '1px solid #EF4444',
              borderRadius: '8px',
              color: '#EF4444',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}>
              Reset Settings
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        gap: '12px',
        marginTop: '24px',
      }}>
        {saved && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#22C55E',
            fontSize: '14px',
            fontWeight: 500,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            Settings saved!
          </div>
        )}
        <button className="btn btn-primary" onClick={handleSave}>
          Save Settings
        </button>
      </div>
    </div>
  )
}

export default Settings
