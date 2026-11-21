import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import L from 'leaflet'
import { api } from '../api'
import { EmptyState } from '../components/EmptyState'

function MapResizer() {
  const map = useMap()
  useEffect(() => {
    map.invalidateSize()
    const timer = setTimeout(() => map.invalidateSize(), 200)
    const handleResize = () => map.invalidateSize()
    window.addEventListener('resize', handleResize)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', handleResize)
    }
  }, [map])
  return null
}

const landmarkIcon = L.divIcon({
  className: 'custom-map-pin',
  html: `<svg width="26" height="34" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20s12-11 12-20c0-6.627-5.373-12-12-12z" fill="#0B2A5B"/>
    <circle cx="12" cy="11" r="5" fill="#E0A526"/>
  </svg>`,
  iconSize: [26, 34],
  iconAnchor: [13, 34],
  popupAnchor: [0, -32],
})

export type FamousPlace = {
  id: number
  name: string
  description: string
  city: string
  district: string
  address: string
  latitude: number | null
  longitude: number | null
  photo_url: string
}

export function PlacesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const places = useQuery({
    queryKey: ['places'],
    queryFn: () => api.get<FamousPlace[]>('/api/places/'),
  })
  const mapped = places.data?.filter((place) => place.latitude != null && place.longitude != null) ?? []

  if (places.isPending) return <p className="loading-inline">{t('common.loadingPlaces')}</p>
  if (places.isError) return <div className="notice error-notice" role="alert">{places.error.message}</div>
  return (
    <section>
      <div className="page-heading heading-with-action">
        <div><p className="eyebrow">{t('app.force')}</p><h2>{t('nav.places')}</h2></div>
        <Link className="primary-button link-button" to="/places/new">+ {t('nav.addPlace')}</Link>
      </div>
      {mapped.length > 0 && (
        <div className="places-map-frame">
          <MapContainer center={[19.076, 72.8777]} zoom={10} scrollWheelZoom>
            <MapResizer />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png"
            />
            {mapped.map((place) => place.latitude != null && place.longitude != null && (
              <Marker key={place.id} position={[place.latitude, place.longitude]} icon={landmarkIcon}>
                <Popup><strong>{place.name}</strong><br />{place.address}</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
      {places.data.length ? (
        <div className="place-grid">
          {places.data.map((place) => <PlaceCard
            key={place.id}
            place={place}
            onDeleted={() => void queryClient.invalidateQueries({ queryKey: ['places'] })}
          />)}
        </div>
      ) : (
        <EmptyState
          title={t('places.emptyTitle')}
          description={t('places.emptyText')}
          actionLabel={`+ ${t('nav.addPlace')}`}
          actionTo="/places/new"
        />
      )}
    </section>
  )
}

function PlaceCard({ place, onDeleted }: { place: FamousPlace; onDeleted: () => void }) {
  const { t } = useTranslation()
  const [confirming, setConfirming] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const remove = useMutation({
    mutationFn: () => api.delete<void>(`/api/places/${place.id}/`),
    onSuccess: onDeleted,
  })
  return (
    <article className="card place-card">
      {place.photo_url && <img className="place-image" src={place.photo_url} alt={place.name} />}
      <div className="place-information">
        <div><h3>{place.name}</h3><p className="muted-copy">{place.city}, {place.district}</p></div>
        <p>{place.description}</p>
        <address>{place.address}</address>
        {place.latitude != null && place.longitude != null && <span className="muted-copy">{place.latitude.toFixed(5)}, {place.longitude.toFixed(5)}</span>}
        <div className="button-row">
          <Link className="secondary-button link-button" to={`/places/${place.id}/edit`}>{t('common.edit')}</Link>
          <button type="button" className="danger-button" onClick={() => setConfirming((value) => !value)}>{t('common.delete')}</button>
        </div>
        {confirming && (
          <div className="photo-delete-confirm">
            <label>{t('places.deleteConfirm')}<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
            <button type="button" className="danger-button" disabled={confirmation !== 'DELETE' || remove.isPending} onClick={() => remove.mutate()}>{remove.isPending ? t('accused.deleting') : t('places.confirmDelete')}</button>
          </div>
        )}
        {remove.isError && <p className="field-error" role="alert">{remove.error.message}</p>}
      </div>
    </article>
  )
}
