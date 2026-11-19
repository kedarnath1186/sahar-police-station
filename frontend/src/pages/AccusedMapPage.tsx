import { Fragment } from 'react'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Circle, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import { Link } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import { api } from '../api'
import { choiceLabel, statusClass, type Accused, type FormChoices } from '../types'

type MapData = {
  records: Accused[]
  needs_review: Accused[]
  not_geocoded: Accused[]
}

const markerColors: Record<string, string> = {
  verified: '#2e7d32',
  manually_set: '#0b2a5b',
  needs_review: '#b26a00',
  auto_geocoded: '#65758b',
  not_geocoded: '#9299a3',
}

export function AccusedMapPage() {
  const [district, setDistrict] = useState('')
  const [status, setStatus] = useState('')
  const mapQuery = useQuery({
    queryKey: ['accused-map'],
    queryFn: () => api.get<MapData>('/api/accused/map/'),
  })
  const choices = useQuery({
    queryKey: ['form-choices'],
    queryFn: () => api.get<FormChoices>('/api/choices/'),
  })
  const records = useMemo(() => (mapQuery.data?.records ?? []).filter((record) =>
    (!district || record.district === district) && (!status || record.location_status === status),
  ), [district, mapQuery.data?.records, status])

  if (mapQuery.isPending) return <p className="loading-inline">Loading map…</p>
  if (mapQuery.isError) return <div className="notice error-notice" role="alert">{mapQuery.error.message}</div>

  return (
    <section>
      <div className="page-heading heading-with-action">
        <div><p className="eyebrow">Location Verification</p><h2>Accused Map</h2></div>
        <span className="muted-copy">{records.length} mapped records</span>
      </div>
      <div className="map-filters">
        <label><span>District</span>
          <select value={district} onChange={(event) => setDistrict(event.target.value)}>
            <option value="">All districts</option>
            {choices.data?.districts.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label><span>Location status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {choices.data?.statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
      </div>
      <div className="map-layout">
        <div className="map-frame" aria-label="Map of accused record locations">
          <MapContainer center={[19.076, 72.8777]} zoom={10} scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {records.map((record) => {
              const lat = record.lat ?? record.latitude
              const lon = record.lon ?? record.longitude
              if (lat == null || lon == null) return null
              const color = markerColors[record.location_status] ?? '#0b2a5b'
              const radius = choices.data?.accuracy_radii[record.location_accuracy] ?? 500
              return (
                <Fragment key={record.id}>
                  <Circle center={[lat, lon]} radius={radius} pathOptions={{ color, fillColor: color, fillOpacity: 0.12, weight: 1 }} />
                  <Marker position={[lat, lon]}>
                    <Popup>
                      <div className="map-popup">
                        <strong>{record.full_name}</strong>
                        <span className="record-id">{record.record_id}</span>
                        <span>{record.district}</span>
                        <span className={statusClass(record.location_status)}>{choiceLabel(choices.data?.statuses, record.location_status)}</span>
                        <Link to={`/accused/${record.id}`}>Open record</Link>
                      </div>
                    </Popup>
                  </Marker>
                </Fragment>
              )
            })}
          </MapContainer>
        </div>
        <aside className="map-side-panel">
          <article className="card">
            <h3>Needs Review</h3>
            {mapQuery.data.needs_review.length ? mapQuery.data.needs_review.map((record) => (
              <Link className="map-record-link" key={record.id} to={`/accused/${record.id}`}>
                <strong>{record.full_name}</strong><span className="record-id">{record.record_id}</span>
                <span className={statusClass(record.location_status)}>{choiceLabel(choices.data?.statuses, record.location_status)}</span>
              </Link>
            )) : <p className="muted-copy">No records need review.</p>}
          </article>
          <article className="card">
            <h3>No Location</h3>
            {mapQuery.data.not_geocoded.length ? mapQuery.data.not_geocoded.map((record) => (
              <Link className="map-record-link" key={record.id} to={`/accused/${record.id}`}>
                <strong>{record.full_name}</strong><span className="record-id">{record.record_id}</span>
                <span className={statusClass(record.location_status)}>{choiceLabel(choices.data?.statuses, record.location_status)}</span>
              </Link>
            )) : <p className="muted-copy">All records have a location.</p>}
          </article>
        </aside>
      </div>
      <div className="map-legend card" aria-label="Map status legend">
        {Object.entries(markerColors).map(([key, color]) => (
          <span key={key}><i style={{ backgroundColor: color }} />{choiceLabel(choices.data?.statuses, key)}</span>
        ))}
      </div>
    </section>
  )
}
