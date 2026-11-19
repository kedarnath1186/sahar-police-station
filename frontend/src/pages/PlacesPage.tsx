import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import { Link } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import { api } from '../api'

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
  const queryClient = useQueryClient()
  const places = useQuery({
    queryKey: ['places'],
    queryFn: () => api.get<FamousPlace[]>('/api/places/'),
  })
  const mapped = places.data?.filter((place) => place.latitude != null && place.longitude != null) ?? []

  if (places.isPending) return <p className="loading-inline">Loading famous places…</p>
  if (places.isError) return <div className="notice error-notice" role="alert">{places.error.message}</div>
  return (
    <section>
      <div className="page-heading heading-with-action">
        <div><p className="eyebrow">Landmark Directory</p><h2>Famous Places</h2></div>
        <Link className="primary-button link-button" to="/places/new">+ Add Famous Place</Link>
      </div>
      {mapped.length > 0 && (
        <div className="places-map-frame">
          <MapContainer center={[19.076, 72.8777]} zoom={10} scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {mapped.map((place) => place.latitude != null && place.longitude != null && (
              <Marker key={place.id} position={[place.latitude, place.longitude]}>
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
      ) : <div className="card empty-state"><h3>No famous places added</h3><p>Create a place record to begin the directory.</p></div>}
    </section>
  )
}

function PlaceCard({ place, onDeleted }: { place: FamousPlace; onDeleted: () => void }) {
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
          <Link className="secondary-button link-button" to={`/places/${place.id}/edit`}>Edit</Link>
          <button type="button" className="danger-button" onClick={() => setConfirming((value) => !value)}>Delete</button>
        </div>
        {confirming && (
          <div className="photo-delete-confirm">
            <label>Type DELETE to confirm<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
            <button type="button" className="danger-button" disabled={confirmation !== 'DELETE' || remove.isPending} onClick={() => remove.mutate()}>{remove.isPending ? 'Deleting…' : 'Confirm Delete'}</button>
          </div>
        )}
        {remove.isError && <p className="field-error" role="alert">{remove.error.message}</p>}
      </div>
    </article>
  )
}
