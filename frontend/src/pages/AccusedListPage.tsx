import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { formatIstDate, formatNumber, statusClass, type Accused, type FormChoices, type Paginated } from '../types'

export function AccusedListPage() {
  const [search, setSearch] = useState('')
  const [district, setDistrict] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const query = useQuery({
    queryKey: ['accused', 'list', search, district, status, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), page_size: '12' })
      if (search.trim()) params.set('search', search.trim())
      if (district) params.set('district', district)
      if (status) params.set('location_status', status)
      return api.get<Paginated<Accused>>(`/api/accused/?${params}`)
    },
  })
  const choices = useQuery({
    queryKey: ['form-choices'],
    queryFn: () => api.get<FormChoices>('/api/choices/'),
  })

  function updateFilter(update: () => void) {
    update()
    setPage(1)
  }

  return (
    <section>
      <div className="page-heading heading-with-action">
        <div>
          <p className="eyebrow">Records Directory</p>
          <h2>View Accused</h2>
        </div>
        <Link className="primary-button link-button" to="/accused/new">+ Add Accused</Link>
      </div>
      <div className="filter-toolbar">
        <label className="search-field">
          <span>Search records</span>
          <input value={search} onChange={(event) => updateFilter(() => setSearch(event.target.value))} placeholder="Name, mobile, address" />
        </label>
        <label>
          <span>District</span>
          <select value={district} onChange={(event) => updateFilter(() => setDistrict(event.target.value))}>
            <option value="">All districts</option>
            {choices.data?.districts.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label>
          <span>Location status</span>
          <select value={status} onChange={(event) => updateFilter(() => setStatus(event.target.value))}>
            <option value="">All statuses</option>
            {choices.data?.statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
      </div>
      {query.isPending && <p className="loading-inline">Loading accused records…</p>}
      {query.isError && <div className="notice error-notice" role="alert">{query.error.message}</div>}
      {query.data && (
        <>
          <p className="muted-copy result-count">{formatNumber(query.data.count)} records</p>
          {query.data.results.length ? (
            <div className="accused-card-list">
              {query.data.results.map((record) => (
                <article className="accused-card" key={record.id}>
                  <div className="record-card-top">
                    <span className="record-id">{record.record_id}</span>
                    <span className={statusClass(record.location_status)}>{record.location_status.replaceAll('_', ' ')}</span>
                  </div>
                  <h3><Link to={`/accused/${record.id}`}>{record.full_name}</Link></h3>
                  <p>{record.formatted_mobile}</p>
                  <p className="muted-copy">{record.village}, {record.taluka}, {record.city}, {record.district}</p>
                  <div className="record-card-bottom">
                    <span>Registered {formatIstDate(record.created_at)}</span>
                    <Link to={`/accused/${record.id}`}>Open record →</Link>
                  </div>
                </article>
              ))}
            </div>
          ) : <div className="card empty-state"><h3>No accused records found</h3><p>Try changing the search or filters.</p></div>}
          {query.data.total_pages > 1 && (
            <div className="pagination">
              <button type="button" className="secondary-button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
              <span>Page {query.data.page} of {query.data.total_pages}</span>
              <button type="button" className="secondary-button" disabled={page >= query.data.total_pages} onClick={() => setPage((value) => value + 1)}>Next</button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
