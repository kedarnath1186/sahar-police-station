import { lazy, Suspense, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { ApiError, api } from './api'

const LoginPage = lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })))
const AccusedDetailPage = lazy(() => import('./pages/AccusedDetailPage').then((module) => ({ default: module.AccusedDetailPage })))
const AccusedFormPage = lazy(() => import('./pages/AccusedFormPage').then((module) => ({ default: module.AccusedFormPage })))
const AccusedListPage = lazy(() => import('./pages/AccusedListPage').then((module) => ({ default: module.AccusedListPage })))
const AccusedMapPage = lazy(() => import('./pages/AccusedMapPage').then((module) => ({ default: module.AccusedMapPage })))
const AccusedTablePage = lazy(() => import('./pages/AccusedTablePage').then((module) => ({ default: module.AccusedTablePage })))
const AccusedPhotosPage = lazy(() => import('./pages/AccusedPhotosPage').then((module) => ({ default: module.AccusedPhotosPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const PrintRecordPage = lazy(() => import('./pages/PrintRecordPage').then((module) => ({ default: module.PrintRecordPage })))
const PlacesPage = lazy(() => import('./pages/PlacesPage').then((module) => ({ default: module.PlacesPage })))
const PlaceFormPage = lazy(() => import('./pages/PlaceFormPage').then((module) => ({ default: module.PlaceFormPage })))

type User = {
  id: number
  username: string
  is_staff: boolean
}

const navigation = [
  { to: '/', label: 'nav.dashboard', symbol: '◈' },
  { to: '/accused/new', label: 'nav.addAccused', symbol: '+' },
  { to: '/accused', label: 'nav.viewAccused', symbol: '♙' },
  { to: '/map', label: 'nav.mapView', symbol: '⌖' },
  { to: '/table', label: 'nav.tableView', symbol: '▦' },
  { to: '/places/new', label: 'nav.addPlace', symbol: '⌂' },
  { to: '/places', label: 'nav.places', symbol: '⌑' },
]

function ProtectedLayout() {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && menuOpen) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  useEffect(() => {
    document.documentElement.lang = i18n.language
  }, [i18n.language])
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
  const activeNavigation = navigation.find((item) => item.to === location.pathname)
  const pageTitle = activeNavigation
    ? t(activeNavigation.label)
    : location.pathname.endsWith('/edit')
      ? t('accused.edit')
      : location.pathname.includes('/photos')
        ? t('photos.title')
        : location.pathname.startsWith('/accused/')
          ? t('accused.record')
          : location.pathname.startsWith('/places/')
            ? t('places.edit')
            : location.pathname.startsWith('/print/')
              ? t('print.title')
              : t('app.station')

  if (userQuery.isPending) {
    return <main className="loading-screen" aria-live="polite">{t('common.loading')}</main>
  }
  if (!userQuery.data) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return (
    <div className="app-shell">
      <button
        className={`sidebar-backdrop ${menuOpen ? 'is-visible' : ''}`}
        type="button"
        aria-label={t('nav.close')}
        onClick={() => setMenuOpen(false)}
      />
      <aside className={`sidebar ${menuOpen ? 'is-open' : ''}`}>
        <button
          type="button"
          className="sidebar-close-btn"
          aria-label={t('nav.close')}
          onClick={() => setMenuOpen(false)}
        >
          ✕
        </button>
        <Link className="brand" to="/" onClick={() => setMenuOpen(false)}>
          <img src="/static/img/maharashtra_police_logo.png" alt={t('app.logoAlt')} />
          <span className="brand-force">{t('app.force')}</span>
          <strong>{t('app.station')}</strong>
          <span className="brand-local">{t('app.localStation')}</span>
          <span className="brand-address">{t('app.address')}</span>
        </Link>
        <nav className="primary-nav"         aria-label={t('nav.open')}>
          {navigation.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-link ${location.pathname === item.to ? 'is-active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              <span className="nav-symbol" aria-hidden="true">{item.symbol}</span>
              <span>{t(item.label)}</span>
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
            {logoutMutation.isPending ? t('nav.signingOut') : t('nav.logout')}
          </button>
          {logoutMutation.isError && <p className="inline-error">{t('errors.logoutFailed')}</p>}
        </div>
      </aside>

      <div className="main-panel">
        <header className="topbar">
          <button
            type="button"
            className="menu-toggle"
            aria-label={t('nav.main')}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>
          <div className="topbar-titles">
            <p className="topbar-eyebrow">{t('app.force')}</p>
            <h1>{pageTitle}</h1>
          </div>
          <div className="topbar-tools">
            <label className="language-picker">
              <span className="visually-hidden">{t('language.label')}</span>
              <select
                aria-label={t('language.label')}
                value={i18n.resolvedLanguage ?? 'en'}
                onChange={(event) => {
                  const language = event.target.value
                  void i18n.changeLanguage(language)
                  window.localStorage.setItem('language', language)
                  document.documentElement.lang = language
                }}
              >
                <option value="en">{t('language.english')}</option>
                <option value="mr">{t('language.marathi')}</option>
                <option value="hi">{t('language.hindi')}</option>
              </select>
            </label>
            <div className="officer-chip"><span aria-hidden="true">●</span> {t('app.officer')}: {userQuery.data.username}</div>
          </div>
        </header>
        <main className="page-content"><Outlet /></main>
        <footer className="app-footer">{t('footer.poweredBy')}</footer>
      </div>
    </div>
  )
}

function NotFound() {
  const { t } = useTranslation()
  return <section className="card"><h2>{t('common.pageNotFound')}</h2><Link to="/">{t('common.returnDashboard')}</Link></section>
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
    <Suspense fallback={<main className="loading-screen" aria-live="polite">Loading…</main>}>
    <Routes>
      <Route
        path="/login"
        element={<LoginPage onSubmit={(values) => loginMutation.mutateAsync(values)} error={loginMutation.error} submitting={loginMutation.isPending} />}
      />
      <Route element={<ProtectedLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="accused" element={<AccusedListPage />} />
        <Route path="accused/new" element={<AccusedFormPage />} />
        <Route path="accused/:id" element={<AccusedDetailPage />} />
        <Route path="accused/:id/edit" element={<AccusedFormPage />} />
        <Route path="accused/:id/delete" element={<AccusedDetailPage />} />
        <Route path="accused/:id/photos" element={<AccusedPhotosPage />} />
        <Route path="map" element={<AccusedMapPage />} />
        <Route path="table" element={<AccusedTablePage />} />
        <Route path="places" element={<PlacesPage />} />
        <Route path="places/new" element={<PlaceFormPage />} />
        <Route path="places/:id/edit" element={<PlaceFormPage />} />
        <Route path="print/:id" element={<PrintRecordPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
    </Suspense>
  )
}

export default App
