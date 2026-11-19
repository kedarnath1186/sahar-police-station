import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { ApiError, api } from './api'
import { LoginPage } from './pages/LoginPage'

type User = {
  id: number
  username: string
  is_staff: boolean
}

const navigation = [
  { to: '/', label: 'Dashboard', symbol: '◈' },
  { to: '/accused/new', label: 'Add Accused', symbol: '+' },
  { to: '/accused', label: 'View Accused', symbol: '♙' },
  { to: '/map', label: 'Map View', symbol: '⌖' },
  { to: '/table', label: 'Table View', symbol: '▦' },
  { to: '/places/new', label: 'Add Famous Place', symbol: '⌂' },
  { to: '/places', label: 'Famous Places', symbol: '⌑' },
]

function ProtectedLayout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const userQuery = useQuery<User | null>({
    queryKey: ['current-user'],
    queryFn: async () => {
      try {
        return await api.get<User>('/api/auth/me/')
      } catch (error) {
        if (error instanceof ApiError && error.status === 403) return null
        throw error
      }
    },
    retry: false,
  })
  const logoutMutation = useMutation({
    mutationFn: () => api.post<void>('/api/auth/logout/'),
    onSuccess: () => {
      queryClient.setQueryData(['current-user'], null)
      navigate('/login', { replace: true })
    },
  })

  if (userQuery.isPending) {
    return <main className="loading-screen" aria-live="polite">Loading…</main>
  }
  if (!userQuery.data) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return (
    <div className="app-shell">
      <button
        className={`sidebar-backdrop ${menuOpen ? 'is-visible' : ''}`}
        type="button"
        aria-label="Close navigation menu"
        onClick={() => setMenuOpen(false)}
      />
      <aside className={`sidebar ${menuOpen ? 'is-open' : ''}`}>
        <Link className="brand" to="/" onClick={() => setMenuOpen(false)}>
          <img src="/static/img/maharashtra_police_logo.png" alt="Maharashtra Police" />
          <span className="brand-force">Maharashtra Police</span>
          <strong>Sahar Police Station</strong>
          <span className="brand-local">सहार पोलीस ठाणे</span>
          <span className="brand-address">IA Project Road, Navpada, Sahar Village, Andheri East, Mumbai</span>
        </Link>
        <nav className="primary-nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-link ${location.pathname === item.to ? 'is-active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              <span className="nav-symbol" aria-hidden="true">{item.symbol}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-user">
          <span className="user-avatar" aria-hidden="true">●</span>
          <span className="user-name">{userQuery.data.username}</span>
          <button
            type="button"
            className="logout-button"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            {logoutMutation.isPending ? 'Signing out…' : 'Logout'}
          </button>
          {logoutMutation.isError && <p className="inline-error">Could not log out. Please try again.</p>}
        </div>
      </aside>

      <div className="main-panel">
        <header className="topbar">
          <button
            type="button"
            className="menu-toggle"
            aria-label="Open navigation menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>
          <div className="topbar-titles">
            <p className="topbar-eyebrow">Maharashtra Police</p>
            <h1>{navigation.find((item) => item.to === location.pathname)?.label ?? 'Sahar Police Station'}</h1>
          </div>
          <div className="officer-chip"><span aria-hidden="true">●</span> {userQuery.data.username}</div>
        </header>
        <main className="page-content"><Outlet /></main>
      </div>
    </div>
  )
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <section className="page-heading">
      <p className="eyebrow">Sahar Police Station</p>
      <h2>{title}</h2>
    </section>
  )
}

function NotFound() {
  return <section className="card"><h2>Page not found</h2><Link to="/">Return to dashboard</Link></section>
}

function App() {
  const queryClient = useQueryClient()
  const location = useLocation()
  const navigate = useNavigate()
  const loginMutation = useMutation({
    mutationFn: (credentials: { username: string; password: string }) =>
      api.post<{ user: User }>('/api/auth/login/', credentials),
    onSuccess: ({ user }) => {
      queryClient.setQueryData(['current-user'], user)
      const state = location.state as { from?: string } | null
      navigate(state?.from || '/', { replace: true })
    },
  })

  return (
    <Routes>
      <Route
        path="/login"
        element={<LoginPage onSubmit={loginMutation.mutateAsync} error={loginMutation.error} submitting={loginMutation.isPending} />}
      />
      <Route element={<ProtectedLayout />}>
        <Route index element={<PlaceholderPage title="Dashboard" />} />
        <Route path="accused" element={<PlaceholderPage title="View Accused" />} />
        <Route path="accused/new" element={<PlaceholderPage title="Add Accused" />} />
        <Route path="accused/:id" element={<PlaceholderPage title="Accused Record" />} />
        <Route path="accused/:id/edit" element={<PlaceholderPage title="Edit Accused" />} />
        <Route path="accused/:id/delete" element={<PlaceholderPage title="Delete Accused" />} />
        <Route path="accused/:id/photos" element={<PlaceholderPage title="Accused Photos" />} />
        <Route path="map" element={<PlaceholderPage title="Map View" />} />
        <Route path="table" element={<PlaceholderPage title="Table View" />} />
        <Route path="places" element={<PlaceholderPage title="Famous Places" />} />
        <Route path="places/new" element={<PlaceholderPage title="Add Famous Place" />} />
        <Route path="places/:id/edit" element={<PlaceholderPage title="Edit Famous Place" />} />
        <Route path="print/:id" element={<PlaceholderPage title="Print Record" />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default App
