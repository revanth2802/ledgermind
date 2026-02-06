import { Routes, Route, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Timeline from './pages/Timeline'
import Agents from './pages/Agents'
import AgentDetail from './pages/AgentDetail'
import Policies from './pages/Policies'
import Overrides from './pages/Overrides'
import Settings from './pages/Settings'
import Search from './pages/Search'
import Ask from './pages/Ask'
import Patterns from './pages/Patterns'
import Audit from './pages/Audit'

function App() {
  const location = useLocation()
  const isLanding = location.pathname === '/' || location.pathname === ''

  if (isLanding) {
    return <Landing />
  }

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/agents/:agentName" element={<AgentDetail />} />
          <Route path="/policies" element={<Policies />} />
          <Route path="/overrides" element={<Overrides />} />
          <Route path="/search" element={<Search />} />
          <Route path="/ask" element={<Ask />} />
          <Route path="/patterns" element={<Patterns />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
