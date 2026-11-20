import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { choiceLabel, formatIstDate, formatNumber, statusClass, type Accused, type FormChoices } from '../types'

type DashboardData = {
  accused_count: number
  photo_count: number
  places_count: number
  status_counts: Record<string, number>
  recent_accused: Accused[]
}

const statusOrder = ['verified', 'manually_set', 'needs_review', 'auto_geocoded', 'not_geocoded']

export function DashboardPage() {
  const { t } = useTranslation()
  const dashboard = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardData>('/api/dashboard/'),
  })
  const choices = useQuery({
    queryKey: ['form-choices'],
    queryFn: () => api.get<FormChoices>('/api/choices/'),
  })

  if (dashboard.isPending) return <p className="loading-inline">Loading dashboard…</p>
  if (dashboard.isError) return <div className="notice error-notice" role="alert">{dashboard.error.message}</div>
  const data = dashboard.data

  return (
    <section>
      <div className="page-heading heading-with-action">
        <div>
          <p className="eyebrow">{t('app.force')}</p>
          <h2>{t('app.station')}</h2>
          <p className="muted-copy">{t('app.localStation')} · {t('app.address')}</p>
        </div>
        <div className="button-row">
          <Link className="primary-button link-button" to="/accused/new">+ {t('nav.addAccused')}</Link>
          <Link className="secondary-button link-button" to="/map">{t('nav.mapView')}</Link>
        </div>
      </div>
      <div className="metrics-grid">
        <MetricCard title="Total Accused Records" value={data.accused_count} accent="navy" link="/accused" linkText="View directory" />
        <MetricCard title="Field Photographs" value={data.photo_count} accent="gold" link="/table" linkText="View table" />
        <MetricCard title="Famous Places" value={data.places_count} accent="green" link="/places" linkText="Explore places" />
      </div>
      <article className="card dashboard-status">
        <div className="section-heading">
          <div><h3>Location Verification</h3><p className="muted-copy">Status across all accused records</p></div>
          <Link to="/map">Review on map →</Link>
        </div>
        <div className="status-grid">
          {statusOrder.map((key) => (
            <Link key={key} className="status-tile" to={`/table?status=${key}`}>
              <span className={statusClass(key)}>{choiceLabel(choices.data?.statuses, key)}</span>
              <strong>{formatNumber(data.status_counts[key] ?? 0)}</strong>
            </Link>
          ))}
        </div>
      </article>
      <article className="card recent-records">
        <div className="section-heading">
          <div><h3>Recent Accused Entries</h3><p className="muted-copy">Recently registered records</p></div>
          <Link to="/accused">View all records →</Link>
        </div>
        {data.recent_accused.length ? (
          <div className="recent-list">
            {data.recent_accused.map((record) => (
              <Link className="recent-item" to={`/accused/${record.id}`} key={record.id}>
                <span><strong>{record.full_name}</strong><small className="record-id">{record.record_id}</small></span>
                <span className={statusClass(record.location_status)}>{choiceLabel(choices.data?.statuses, record.location_status)}</span>
                <time>{formatIstDate(record.created_at)}</time>
              </Link>
            ))}
          </div>
        ) : <p className="muted-copy">No accused records have been registered.</p>}
      </article>
    </section>
  )
}

function MetricCard({ title, value, accent, link, linkText }: {
  title: string
  value: number
  accent: string
  link: string
  linkText: string
}) {
  return (
    <article className={`metric-card metric-${accent}`}>
      <p>{title}</p>
      <strong>{formatNumber(value)}</strong>
      <Link to={link}>{linkText} →</Link>
    </article>
  )
}
