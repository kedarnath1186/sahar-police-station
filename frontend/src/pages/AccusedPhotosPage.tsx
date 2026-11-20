import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useParams } from 'react-router-dom'
import { z } from 'zod'
import { api } from '../api'
import type { Accused, Photo } from '../types'
import { EmptyState } from '../components/EmptyState'

const maxImageSize = 5 * 1024 * 1024
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
const imageSchema = z.instanceof(FileList)
  .refine((files) => files.length > 0, 'Choose an image to upload.')
  .refine((files) => files[0].size <= maxImageSize, 'The image must be 5 MB or smaller.')
  .refine((files) => allowedTypes.includes(files[0].type), 'Use a JPEG, PNG, or WebP image.')
  .refine((files) => /\.(jpe?g|png|webp)$/i.test(files[0].name), 'Use a JPEG, PNG, or WebP image.')

const uploadSchema = z.object({
  image: imageSchema,
  location_address: z.string().trim().min(1, 'Enter where the photo was taken.').max(500),
  latitude: z.number(),
  longitude: z.number(),
  caption: z.string().max(255),
})

const metadataSchema = z.object({
  location_address: z.string().trim().min(1, 'Enter where the photo was taken.').max(500),
  latitude: z.number(),
  longitude: z.number(),
  caption: z.string().max(255),
})

type UploadValues = z.infer<typeof uploadSchema>
type MetadataValues = z.infer<typeof metadataSchema>

export function AccusedPhotosPage() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const accused = useQuery({
    queryKey: ['accused', id],
    queryFn: () => api.get<Accused>(`/api/accused/${id}/`),
  })
  const photos = useQuery({
    queryKey: ['accused-photos', id],
    queryFn: () => api.get<Photo[]>(`/api/accused/${id}/photos/`),
  })

  if (accused.isPending || photos.isPending) return <p className="loading-inline">Loading photographs…</p>
  if (accused.isError || photos.isError) return <div className="notice error-notice" role="alert">Could not load accused photographs.</div>

  return (
    <section>
      <div className="page-heading heading-with-action">
        <div><p className="eyebrow">{accused.data.record_id}</p><h2>Accused Photographs</h2><p className="muted-copy">{accused.data.full_name}</p></div>
        <Link className="secondary-button link-button" to={`/accused/${id}`}>Back to record</Link>
      </div>
      <UploadPhotoForm
        accused={accused.data}
        onUploaded={async () => {
          await queryClient.invalidateQueries({ queryKey: ['accused-photos', id] })
          await queryClient.invalidateQueries({ queryKey: ['accused', id] })
        }}
      />
      <div className="section-heading photos-heading"><div><h3>Stored Photographs</h3><p className="muted-copy">{photos.data.length} photographs</p></div></div>
      {photos.data.length ? (
        <div className="photo-grid">
          {photos.data.map((photo) => (
            <PhotoCard key={photo.id} photo={photo} onChanged={() => {
              void queryClient.invalidateQueries({ queryKey: ['accused-photos', id] })
              void queryClient.invalidateQueries({ queryKey: ['accused', id] })
            }} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No photographs saved"
          description="Upload an identity or spot photograph with its location details above to complete this profile."
          actionLabel="Upload Photograph"
          onAction={() => {
            const input = document.querySelector<HTMLInputElement>('.upload-form input[type="file"]')
            input?.click()
          }}
        />
      )}
    </section>
  )
}

function UploadPhotoForm({ accused, onUploaded }: { accused: Accused; onUploaded: () => Promise<void> }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<UploadValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      location_address: [accused.detailed_address, accused.village, accused.city, accused.district, accused.state].filter(Boolean).join(', '),
      latitude: accused.latitude ?? 19.076,
      longitude: accused.longitude ?? 72.8777,
      caption: '',
    },
  })
  const upload = useMutation({
    mutationFn: (values: UploadValues) => {
      const formData = new FormData()
      formData.append('image', values.image[0])
      formData.append('location_address', values.location_address)
      formData.append('latitude', String(values.latitude))
      formData.append('longitude', String(values.longitude))
      formData.append('caption', values.caption)
      return api.upload<Photo>(`/api/accused/${accused.id}/photos/`, formData)
    },
    onSuccess: async () => {
      reset()
      await onUploaded()
    },
  })

  return (
    <form className="card upload-form" onSubmit={handleSubmit((values) => upload.mutate(values))} noValidate>
      <h3>Upload Photograph</h3>
      <div className="form-grid">
        <label className="form-field field-wide"><span>Image (JPEG, PNG, WebP; up to 5 MB)</span><input type="file" accept="image/jpeg,image/png,image/webp" {...register('image')} /></label>
        {errors.image && <span className="field-error field-wide">{errors.image.message}</span>}
        <label className="form-field field-wide"><span>Photo Location Address</span><input {...register('location_address')} /></label>
        {errors.location_address && <span className="field-error field-wide">{errors.location_address.message}</span>}
        <label className="form-field"><span>Latitude</span><input type="number" step="any" {...register('latitude', { valueAsNumber: true })} /></label>
        <label className="form-field"><span>Longitude</span><input type="number" step="any" {...register('longitude', { valueAsNumber: true })} /></label>
        {errors.latitude && <span className="field-error">{errors.latitude.message}</span>}
        {errors.longitude && <span className="field-error">{errors.longitude.message}</span>}
        <label className="form-field field-wide"><span>Caption (optional)</span><input {...register('caption')} /></label>
        {errors.caption && <span className="field-error field-wide">{errors.caption.message}</span>}
      </div>
      {upload.isError && <div className="notice error-notice" role="alert">{upload.error.message}</div>}
      {upload.isSuccess && <div className="notice success-notice" role="status">Photograph uploaded.</div>}
      <button className="primary-button" type="submit" disabled={upload.isPending}>{upload.isPending ? 'Uploading…' : 'Upload Photograph'}</button>
    </form>
  )
}

function PhotoCard({ photo, onChanged }: { photo: Photo; onChanged: () => void }) {
  const [editing, setEditing] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm<MetadataValues>({
    resolver: zodResolver(metadataSchema),
    defaultValues: {
      location_address: photo.location_address,
      latitude: photo.latitude,
      longitude: photo.longitude,
      caption: photo.caption,
    },
  })
  const update = useMutation({
    mutationFn: (values: MetadataValues) => api.patch<Photo>(`/api/photos/${photo.id}/`, values),
    onSuccess: () => {
      setEditing(false)
      onChanged()
    },
  })
  const remove = useMutation({
    mutationFn: () => api.delete<void>(`/api/photos/${photo.id}/`),
    onSuccess: onChanged,
  })

  return (
    <article className="card photo-card">
      <img className="photo-image" src={photo.image_url} alt={photo.caption || photo.location_address} />
      {!editing ? (
        <div className="photo-information">
          <strong>{photo.caption || 'Photograph'}</strong>
          <span>{photo.location_address}</span>
          <span className="muted-copy">{photo.latitude.toFixed(5)}, {photo.longitude.toFixed(5)}</span>
          <div className="button-row">
            <button type="button" className="secondary-button" onClick={() => setEditing(true)}>Edit details</button>
            <button type="button" className="danger-button" onClick={() => setDeleteOpen((open) => !open)}>Delete</button>
          </div>
          {deleteOpen && (
            <div className="photo-delete-confirm">
              <label>Type DELETE to confirm<input value={confirmText} onChange={(event) => setConfirmText(event.target.value)} /></label>
              <button type="button" className="danger-button" disabled={confirmText !== 'DELETE' || remove.isPending} onClick={() => remove.mutate()}>Confirm Delete</button>
            </div>
          )}
          {remove.isError && <div className="field-error" role="alert">{remove.error.message}</div>}
        </div>
      ) : (
        <form className="photo-information photo-edit-form" onSubmit={handleSubmit((values) => update.mutate(values))}>
          <label className="form-field"><span>Location Address</span><input {...register('location_address')} /></label>
          {errors.location_address && <span className="field-error">{errors.location_address.message}</span>}
          <div className="form-grid">
            <label className="form-field"><span>Latitude</span><input type="number" step="any" {...register('latitude', { valueAsNumber: true })} /></label>
            <label className="form-field"><span>Longitude</span><input type="number" step="any" {...register('longitude', { valueAsNumber: true })} /></label>
          </div>
          <label className="form-field"><span>Caption</span><input {...register('caption')} /></label>
          {errors.caption && <span className="field-error">{errors.caption.message}</span>}
          {update.isError && <span className="field-error" role="alert">{update.error.message}</span>}
          <div className="button-row">
            <button className="primary-button" type="submit" disabled={update.isPending}>Save</button>
            <button className="secondary-button" type="button" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      )}
    </article>
  )
}
