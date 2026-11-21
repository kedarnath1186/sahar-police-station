import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { api } from '../api'
import type { FormChoices } from '../types'
import type { FamousPlace } from './PlacesPage'

const sizeLimit = 5 * 1024 * 1024
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
const placeSchema = z.object({
  name: z.string().trim().min(1, 'Enter the place name.').max(200),
  description: z.string().trim().min(1, 'Enter a description.'),
  city: z.string().trim().min(1, 'Enter the city.').max(100),
  district: z.string().min(1, 'Select a district.'),
  address: z.string().trim().min(1, 'Enter the full address.').max(500),
  photo: z.custom<FileList>().optional()
    .refine((files) => !files?.length || files[0].size <= sizeLimit, 'The image must be 5 MB or smaller.')
    .refine((files) => !files?.length || allowedTypes.includes(files[0].type), 'Use a JPEG, PNG, or WebP image.')
    .refine((files) => !files?.length || /\.(jpe?g|png|webp)$/i.test(files[0].name), 'Use a JPEG, PNG, or WebP image.'),
})

type PlaceValues = z.infer<typeof placeSchema>

const emptyValues: PlaceValues = { name: '', description: '', city: '', district: '', address: '' }

export function PlaceFormPage() {
  const { id } = useParams()
  const edit = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const placeQuery = useQuery({
    queryKey: ['place', id],
    queryFn: () => api.get<FamousPlace>(`/api/places/${id}/`),
    enabled: edit,
  })
  const choices = useQuery({
    queryKey: ['form-choices'],
    queryFn: () => api.get<FormChoices>('/api/choices/'),
  })
  const { register, handleSubmit, reset, formState: { errors } } = useForm<PlaceValues>({
    resolver: zodResolver(placeSchema),
    defaultValues: emptyValues,
  })
  useEffect(() => {
    if (placeQuery.data) reset({
      name: placeQuery.data.name,
      description: placeQuery.data.description,
      city: placeQuery.data.city,
      district: placeQuery.data.district,
      address: placeQuery.data.address,
    })
  }, [placeQuery.data, reset])
  const save = useMutation({
    mutationFn: (values: PlaceValues) => {
      const formData = new FormData()
      formData.append('name', values.name)
      formData.append('description', values.description)
      formData.append('city', values.city)
      formData.append('district', values.district)
      formData.append('address', values.address)
      if (values.photo?.[0]) formData.append('photo', values.photo[0])
      return api.upload<FamousPlace>(edit ? `/api/places/${id}/` : '/api/places/', formData, edit ? 'PATCH' : 'POST')
    },
    onSuccess: async (place) => {
      await queryClient.invalidateQueries({ queryKey: ['places'] })
      await queryClient.invalidateQueries({ queryKey: ['place', id] })
      navigate('/places', { replace: true, state: { saved: place.name } })
    },
  })

  if (edit && placeQuery.isPending) return <p className="loading-inline">{t('common.loadingPlace')}</p>
  if (edit && placeQuery.isError) return <div className="notice error-notice" role="alert">{placeQuery.error.message}</div>
  if (choices.isError) return <div className="notice error-notice" role="alert">{t('errors.loadChoices')}</div>

  return (
    <section>
      <div className="page-heading">
        <p className="eyebrow">{t('places.title')}</p>
        <h2>{edit ? t('places.edit') : t('places.add')}</h2>
      </div>
      <form className="card place-form" onSubmit={handleSubmit((values) => save.mutate(values))} noValidate>
        <div className="form-grid">
          <FormField label={t('form.placeName')} error={errors.name?.message} wide><input {...register('name')} /></FormField>
          <FormField label={t('form.description')} error={errors.description?.message} wide><textarea rows={4} {...register('description')} /></FormField>
          <FormField label={t('form.city')} error={errors.city?.message}><input {...register('city')} /></FormField>
          <FormField label={t('common.district')} error={errors.district?.message}>
            <select {...register('district')}>
              <option value="">{t('form.selectDistrict')}</option>
              {choices.data?.districts.map((district) => <option key={district.value} value={district.value}>{district.label}</option>)}
            </select>
          </FormField>
          <FormField label={t('form.fullAddress')} error={errors.address?.message} wide><input {...register('address')} /></FormField>
          <FormField label={`${t('form.photo')} (${t('form.imageRules')})`} error={errors.photo?.message} wide>
            <input type="file" accept="image/jpeg,image/png,image/webp" {...register('photo')} />
          </FormField>
        </div>
        {edit && placeQuery.data?.photo_url && <img className="place-form-preview" src={placeQuery.data.photo_url} alt={placeQuery.data.name} />}
        {save.isError && <div className="notice error-notice" role="alert">{save.error.message}</div>}
        <div className="form-actions">
          <button className="primary-button" type="submit" disabled={save.isPending}>{save.isPending ? t('common.saving') : t('form.savePlace')}</button>
          <Link className="secondary-button link-button" to="/places">{t('common.cancel')}</Link>
        </div>
      </form>
    </section>
  )
}

function FormField({ label, error, wide, children }: {
  label: string
  error?: string
  wide?: boolean
  children: ReactNode
}) {
  return (
    <div className={`form-field ${wide ? 'field-wide' : ''}`}>
      <label className="form-field-label">{label}{children}</label>
      {error && <span className="field-error" role="alert">{error}</span>}
    </div>
  )
}
