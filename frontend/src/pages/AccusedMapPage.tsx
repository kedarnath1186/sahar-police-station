import { Fragment, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { Link } from 'react-router-dom'
import L from 'leaflet'
import { useTranslation } from 'react-i18next'
import { api } from '../api'
import { choiceLabel, statusClass, type Accused, type FormChoices } from '../types'

type MapData = {
  records: Accused[]
  needs_review: Accused[]
  not_geocoded: Accused[]
}

export const markerColors: Record<string, string> = {
  verified: '#2E7D32',
  manually_set: '#0B2A5B',
  needs_review: '#B26A00',
  auto_geocoded: '#071C3F',
  not_geocoded: '#6B7280',
}

function createStatusIcon(status: string) {
  const color = markerColors[status] ?? '#0B2A5B'
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 36" width="28" height="36">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z" fill="${color}" stroke="#FFFFFF" stroke-width="2"/>
      <circle cx="14" cy="14" r="5" fill="#FFFFFF"/>
    </svg>
  `
  return L.divIcon({
    className: 'custom-map-pin',
    html: svg,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -34],
  })
}

function MapResizer() {
  const map = useMap()
  useEffect(() => {
    map.invalidateSize()
    const timer = setTimeout(() => {
      map.invalidateSize()
    }, 200)
    const onResize = () => {
      map.invalidateSize()
    }
    window.addEventListener('resize', onResize)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', onResize)
    }
  }, [map])
  return null
}

export function AccusedMapPage() {
  const { t } = useTranslation()
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

  const records = useMemo(
    () =>
      (mapQuery.data?.records ?? []).filter(
        (record) =>
          (!district || record.district === district) &&
          (!status || record.location_status === status),
      ),
    [district, mapQuery.data?.records, status],
  )

  const statusIcons = useMemo(() => {
    const icons: Record<string, L.DivIcon> = {}
    Object.keys(markerColors).forEach((k) => {
      icons[k] = createStatusIcon(k)
    })
    return icons
  }, [])

  if (mapQuery.isPending) return <p className="loading-inline">{t('common.loading')}</p>
  if (mapQuery.isError)
    return (
      <div className="notice error-notice" role="alert">
        {mapQuery.error.message}
      </div>
    )

  return (
    <section className="map-page-container">
      <div className="page-heading heading-with-action">
        <div>
          <p className="eyebrow">{t('nav.mapView')}</p>
          <h2>{t('map.heading', { defaultValue: 'Accused Geographic Map' })}</h2>
        </div>
        <span className="muted-copy">{records.length} mapped records</span>
      </div>

      <div className="map-filters">
        <label>
          <span>{t('common.district')}</span>
          <select value={district} onChange={(event) => setDistrict(event.target.value)}>
            <option value="">{t('form.allDistricts', { defaultValue: 'All districts' })}</option>
            {choices.data?.districts.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t('accused.locationStatus', { defaultValue: 'Location status' })}</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">{t('form.allStatuses', { defaultValue: 'All statuses' })}</option>
            {choices.data?.statuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="map-layout">
        <div className="map-frame" aria-label="Map of accused record locations">
          <MapContainer
            center={[19.0988, 72.8711]} // Centered on Sahar / Mumbai
            zoom={11}
            scrollWheelZoom
            style={{ width: '100%', height: '100%' }}
          >
            <MapResizer />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png"
            />
            {records.map((record) => {
              const lat = record.lat ?? record.latitude
              const lon = record.lon ?? record.longitude
              if (lat == null || lon == null) return null
              const color = markerColors[record.location_status] ?? '#0B2A5B'
              const radius = choices.data?.accuracy_radii[record.location_accuracy] ?? 500
              const icon = statusIcons[record.location_status] || statusIcons.verified

              return (
                <Fragment key={record.id}>
                  <Circle
                    center={[lat, lon]}
                    radius={radius}
                    pathOptions={{
                      color,
                      fillColor: color,
                      fillOpacity: 0.15,
                      weight: 1.5,
                    }}
                  />
                  <Marker position={[lat, lon]} icon={icon}>
                    <Popup>
                      <div className="map-popup">
                        <div className="map-popup-header">
                          <strong>{record.full_name}</strong>
                          <span className="record-id">{record.record_id}</span>
                        </div>
                        <p className="map-popup-address">
                          {record.address || `${record.detailed_address}, ${record.village}, ${record.city}`}
                        </p>
                        {record.geocoded_display_name && (
                          <p className="map-popup-display-name">
                            <small>{record.geocoded_display_name}</small>
                          </p>
                        )}
                        <div className="map-popup-badges">
                          <span className={statusClass(record.location_status)}>
                            {choiceLabel(choices.data?.statuses, record.location_status)}
                          </span>
                          <span className={`accuracy-chip accuracy-${record.location_accuracy}`}>
                            {choiceLabel(choices.data?.accuracies, record.location_accuracy)}
                          </span>
                        </div>
                        <div className="map-popup-actions">
                          <Link className="primary-button popup-btn" to={`/accused/${record.id}`}>
                            Open record
                          </Link>
                          <Link className="secondary-button popup-btn" to={`/accused/${record.id}/photos`}>
                            + Add photo
                          </Link>
                        </div>
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
            <h3>Locations Needing Review</h3>
            {mapQuery.data.needs_review.length ? (
              <div className="map-panel-list">
                {mapQuery.data.needs_review.map((record) => (
                  <Link className="map-record-link" key={record.id} to={`/accused/${record.id}`}>
                    <div className="map-record-info">
                      <strong>{record.full_name}</strong>
                      <span className="record-id">{record.record_id}</span>
                    </div>
                    <span className={statusClass(record.location_status)}>
                      {choiceLabel(choices.data?.statuses, record.location_status)}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="muted-copy">No records need review.</p>
            )}
          </article>

          <article className="card">
            <h3>Records Without Location</h3>
            {mapQuery.data.not_geocoded.length ? (
              <div className="map-panel-list">
                {mapQuery.data.not_geocoded.map((record) => (
                  <Link className="map-record-link" key={record.id} to={`/accused/${record.id}`}>
                    <div className="map-record-info">
                      <strong>{record.full_name}</strong>
                      <span className="record-id">{record.record_id}</span>
                    </div>
                    <span className={statusClass(record.location_status)}>
                      {choiceLabel(choices.data?.statuses, record.location_status)}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="muted-copy">All records have a location.</p>
            )}
          </article>
        </aside>
      </div>

      <div className="map-legend card" aria-label="Map status legend">
        <strong className="legend-title">Verification Status:</strong>
        {Object.entries(markerColors).map(([key, color]) => (
          <span key={key} className="legend-item">
            <i style={{ backgroundColor: color }} />
            {choiceLabel(choices.data?.statuses, key)}
          </span>
        ))}
      </div>
    </section>
  )
}
