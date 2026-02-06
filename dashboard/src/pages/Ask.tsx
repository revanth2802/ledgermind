import { useState } from 'react'

const Ask = () => {
  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState(false)
  const [answer, setAnswer] = useState<{ answer: string; context?: any } | null>(null)
  const [history, setHistory] = useState<Array<{ question: string; answer: string }>>([])

  const handleAsk = async () => {
    if (!question.trim()) return
    
    setAsking(true)
    try {
      const response = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer demo-key',
          'x-tenant-id': 'demo-tenant',
        },
        body: JSON.stringify({ question }),
      })
      const data = await response.json()
      setAnswer(data)
      setHistory([{ question, answer: data.answer }, ...history])
      setQuestion('')
    } catch (err) {
      console.error('Ask failed:', err)
      setAnswer({ answer: 'Failed to get answer. Please try again.' })
    } finally {
      setAsking(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Ask AI</h1>
        <p className="page-subtitle">
          Ask questions in natural language about your decision history and patterns
        </p>
      </div>

      {/* Input Section */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-body">
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
              Your Question
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., What patterns do you see in fraud detection decisions? Which agents have the highest override rate?"
              rows={3}
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
                  handleAsk()
                }
              }}
            />
            <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
              Press Cmd+Enter to ask
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleAsk}
            disabled={asking || !question.trim()}
            style={{ width: '150px' }}
          >
            {asking ? 'Thinking...' : 'Ask AI'}
          </button>
        </div>
      </div>

      {/* Suggested Questions */}
      {!answer && history.length === 0 && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">Example Questions</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                'What patterns do you see in recent decisions?',
                'Which agents have the most human overrides?',
                'What are common reasons for rejection?',
                'Show me trends in approval rates over time',
                'What decisions had low confidence scores?',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => setQuestion(q)}
                  style={{
                    padding: '12px 16px',
                    border: '1px solid #E5E5E5',
                    borderRadius: '8px',
                    background: '#fff',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#333',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#FF6600'
                    e.currentTarget.style.background = '#FFF8F3'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E5E5E5'
                    e.currentTarget.style.background = '#fff'
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Current Answer */}
      {answer && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">Answer</h3>
          </div>
          <div className="card-body">
            <div style={{
              fontSize: '15px',
              color: '#111',
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
            }}>
              {answer.answer}
            </div>
            {answer.context && (
              <details style={{ marginTop: '16px' }}>
                <summary style={{ 
                  cursor: 'pointer', 
                  fontSize: '13px', 
                  color: '#666',
                  fontWeight: 500,
                }}>
                  View Context Data
                </summary>
                <pre style={{
                  marginTop: '12px',
                  padding: '12px',
                  background: '#F8F9FA',
                  borderRadius: '8px',
                  fontSize: '12px',
                  overflow: 'auto',
                  maxHeight: '300px',
                }}>
                  {JSON.stringify(answer.context, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Questions</h3>
            <button
              onClick={() => setHistory([])}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                border: '1px solid #E5E5E5',
                borderRadius: '6px',
                background: '#fff',
                cursor: 'pointer',
                color: '#666',
              }}
            >
              Clear History
            </button>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {history.map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: '16px 24px',
                  borderBottom: idx < history.length - 1 ? '1px solid #F0F0F0' : 'none',
                }}
              >
                <div style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#111',
                  marginBottom: '8px',
                }}>
                  Q: {item.question}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#666',
                  lineHeight: 1.6,
                }}>
                  A: {item.answer}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Ask
