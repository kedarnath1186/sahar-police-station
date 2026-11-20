import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { choiceLabel, formatIstDate, statusClass, type Accused, type FormChoices } from '../types'
import { EmptyState } from '../components/EmptyState'

export function AccusedDetailPage() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [manualOpen, setManualOpen] = useState(false)
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [note, setNote] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const detail = useQuery({
    queryKey: ['accused', id],
    queryFn: () => api.get<Accused>(`/api/accused/${id}/`),
  })
  const choices = useQuery({
    queryKey: ['form-choices'],
    queryFn: () => api.get<FormChoices>('/api/choices/'),
  })
  const refresh = async (record: Accused) => {
    queryClient.setQueryData(['accused', id], record)
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    await queryClient.invalidateQueries({ queryKey: ['accused'] })
  }
  const verify = useMutation({
    mutationFn: () => api.post<Accused>(`/api/accused/${id}/verify/`, {}),
    onSuccess: refresh,
  })
  const setLocation = useMutation({
    mutationFn: () => api.post<Accused>(`/api/accused/${id}/location/`, {
      latitude: Number(latitude),
      longitude: Number(longitude),
      note,
    }),
    onSuccess: async (record) => {
      setManualOpen(false)
      setLatitude('')
      setLongitude('')
      setNote('')
      await refresh(record)
    },
  })
  const remove = useMutation({
    mutationFn: () => api.delete<void>(`/api/accused/${id}/`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['accused'] })
      navigate('/accused', { replace: true })
    },
  })

  if (detail.isPending) return <p className="loading-inline">Loading record…</p>
  if (detail.isError) return <div className="notice error-notice" role="alert">{detail.error.message}</div>
  const record = detail.data

  return (
    <section>
      <div className="page-heading heading-with-action">
        <div>
          <p className="eyebrow">{record.record_id}</p>
          <h2>{record.full_name}</h2>
          <p className="muted-copy">{record.formatted_mobile}</p>
        </div>
        <div className="button-row">
          <Link className="secondary-button link-button" to={`/print/${record.id}`}>Print</Link>
          <Link className="secondary-button link-button" to={`/accused/${record.id}/edit`}>Edit</Link>
          <Link className="primary-button link-button" to={`/accused/${record.id}/photos`}>Photos ({record.photo_count})</Link>
        </div>
      </div>
      <div className="detail-grid">
        <article className="card detail-card">
          <h3>Personal Information</h3>
          <DetailItem label="Record ID" value={record.record_id} mono />
          <DetailItem label="Full Name" value={record.full_name} />
          <DetailItem label="Mobile Number" value={record.formatted_mobile} />
          <DetailItem label="Registered (IST)" value={formatIstDate(record.created_at)} />
        </article>
        <article className="card detail-card">
          <h3>Residential Address</h3>
          <DetailItem label="Detailed Address" value={record.detailed_address} />
          <DetailItem label="Village / Locality" value={record.village} />
          <DetailItem label="City / Taluka" value={`${record.city} / ${record.taluka}`} />
          <DetailItem label="District / State" value={`${record.district}, ${record.state} ${record.pincode}`} />
        </article>
        <article className="card detail-card detail-wide">
          <div className="heading-with-action">
            <h3>Location Verification</h3>
            <span className={statusClass(record.location_status)}>{choiceLabel(choices.data?.statuses, record.location_status)}</span>
          </div>
          {record.latitude != null && record.longitude != null ? (
            <div className="coordinate-box">
              <span>{record.latitude.toFixed(6)}, {record.longitude.toFixed(6)}</span>
              <span className={`accuracy-chip accuracy-${record.location_accuracy}`}>{choiceLabel(choices.data?.accuracies, record.location_accuracy)}</span>
            </div>
          ) : <p className="muted-copy">No coordinates have been set for this record.</p>}
          {record.geocoded_display_name && <p className="muted-copy">{record.geocoded_display_name}</p>}
          <div className="button-row location-actions">
            <button type="button" className="secondary-button" onClick={() => setManualOpen((open) => !open)}>Set Location Manually</button>
            <button
              type="button"
              className="primary-button"
              disabled={record.latitude == null || record.longitude == null || verify.isPending}
              onClick={() => verify.mutate()}
            >{verify.isPending ? 'Verifying…' : 'Verify Location'}</button>
          </div>
          {verify.isError && <div className="notice error-notice">{verify.error.message}</div>}
          {manualOpen && (
            <form className="manual-location-form" onSubmit={(event) => { event.preventDefault(); setLocation.mutate() }}>
              <div className="form-grid">
                <label className="form-field"><span>Latitude</span><input required type="number" step="any" value={latitude} onChange={(event) => setLatitude(event.target.value)} /></label>
                <label className="form-field"><span>Longitude</span><input required type="number" step="any" value={longitude} onChange={(event) => setLongitude(event.target.value)} /></label>
                <label className="form-field field-wide"><span>Verification note</span><input value={note} onChange={(event) => setNote(event.target.value)} /></label>
              </div>
              {setLocation.isError && <div className="notice error-notice" role="alert">{setLocation.error.message}</div>}
              <div className="button-row">
                <button className="primary-button" disabled={setLocation.isPending} type="submit">{setLocation.isPending ? 'Saving…' : 'Save Location'}</button>
                <button className="secondary-button" type="button" onClick={() => setManualOpen(false)}>Cancel</button>
              </div>
            </form>
          )}
        </article>
        <article className="card detail-card detail-wide">
          <h3>Location History</h3>
          {record.location_checks?.length ? (
            <div className="history-list">
              {record.location_checks.map((check, index) => (
                <div className="history-row" key={`${check.timestamp}-${index}`}>
                  <span className={statusClass(check.location_status)}>{check.action.replaceAll('_', ' ')}</span>
                  <div>
                    <strong>{check.note || check.location_status}</strong>
                    <p className="muted-copy">{check.officer ?? 'System'} · {formatIstDate(check.timestamp)}</p>
                  </div>
                  {check.latitude != null && check.longitude != null && <span className="muted-copy">{check.latitude.toFixed(4)}, {check.longitude.toFixed(4)}</span>}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No location history recorded"
              description="Verification checks and location updates for this accused record will appear here."
              actionLabel="Verify Location"
              onAction={() => verify.mutate()}
            />
          )}
        </article>
        <article className="card detail-card detail-wide danger-zone">
          <h3>Record Actions</h3>
          {!deleteOpen ? (
            <button type="button" className="danger-button" onClick={() => setDeleteOpen(true)}>Delete Accused Record</button>
          ) : (
            <div>
              <p>This action permanently removes {record.record_id}. Type <strong>DELETE</strong> to confirm.</p>
              <div className="button-row">
                <input aria-label="Type DELETE to confirm" value={confirmText} onChange={(event) => setConfirmText(event.target.value)} />
                <button type="button" className="danger-button" disabled={confirmText !== 'DELETE' || remove.isPending} onClick={() => remove.mutate()}>{remove.isPending ? 'Deleting…' : 'Confirm Delete'}</button>
                <button type="button" className="secondary-button" onClick={() => setDeleteOpen(false)}>Cancel</button>
              </div>
              {remove.isError && <div className="notice error-notice" role="alert">{remove.error.message}</div>}
            </div>
          )}
        </article>
      </div>
    </section>
  )
}

function DetailItem({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="detail-item"><span>{label}</span><strong className={mono ? 'record-id' : ''}>{value || '—'}</strong></div>
}
