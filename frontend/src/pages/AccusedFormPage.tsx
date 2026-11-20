import { useEffect } from 'react'
import { useMemo } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { TFunction } from 'i18next'
import { z } from 'zod'
import { ApiError, api } from '../api'
import { localizedError, localizedFieldError } from '../errorMessages'
import type { Accused, FormChoices } from '../types'

const createSchema = (t: TFunction) => z.object({
  full_name: z.string().trim().min(1, t('validation.fullName')).max(150),
  mobile_number: z.string().regex(/^\d{10}$/, t('validation.mobile')),
  detailed_address: z.string().trim().min(1, t('validation.detailedAddress')),
  village: z.string().trim().min(1, t('validation.village')).max(100),
  city: z.string().trim().min(1, t('validation.city')).max(100),
  taluka: z.string().trim().min(1, t('validation.taluka')).max(100),
  district: z.string().min(1, t('validation.district')),
  state: z.string().min(1, t('validation.state')),
  pincode: z.string().regex(/^\d{6}$/, t('validation.pincode')),
})

type AccusedValues = {
  full_name: string
  mobile_number: string
  detailed_address: string
  village: string
  city: string
  taluka: string
  district: string
  state: string
  pincode: string
}

const blankValues: AccusedValues = {
  full_name: '',
  mobile_number: '',
  detailed_address: '',
  village: '',
  city: '',
  taluka: '',
  district: '',
  state: 'Maharashtra',
  pincode: '',
}

function validationMessages(error: unknown) {
  if (!(error instanceof ApiError) || !error.data || typeof error.data !== 'object') return null
  const errors = (error.data as { errors?: Record<string, { message: string }[]> }).errors
  return errors ?? null
}

export function AccusedFormPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const edit = Boolean(id)
  const detailQuery = useQuery({
    queryKey: ['accused', id],
    queryFn: () => api.get<Accused>(`/api/accused/${id}/`),
    enabled: edit,
  })
  const choicesQuery = useQuery({
    queryKey: ['form-choices'],
    queryFn: () => api.get<FormChoices>('/api/choices/'),
  })
  const initialValues = detailQuery.data ? {
    full_name: detailQuery.data.full_name,
    mobile_number: detailQuery.data.mobile_number,
    detailed_address: detailQuery.data.detailed_address,
    village: detailQuery.data.village,
    city: detailQuery.data.city,
    taluka: detailQuery.data.taluka,
    district: detailQuery.data.district,
    state: detailQuery.data.state,
    pincode: detailQuery.data.pincode,
  } : blankValues
  const schema = useMemo(() => createSchema(t), [t])
  const { register, handleSubmit, setError, reset, formState: { errors } } = useForm<AccusedValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  })
  useEffect(() => {
    if (detailQuery.data) reset({
      full_name: detailQuery.data.full_name,
      mobile_number: detailQuery.data.mobile_number,
      detailed_address: detailQuery.data.detailed_address,
      village: detailQuery.data.village,
      city: detailQuery.data.city,
      taluka: detailQuery.data.taluka,
      district: detailQuery.data.district,
      state: detailQuery.data.state,
      pincode: detailQuery.data.pincode,
    })
  }, [detailQuery.data, reset])
  const saveMutation = useMutation({
    mutationFn: (values: AccusedValues) => edit
      ? api.put<Accused>(`/api/accused/${id}/`, values)
      : api.post<Accused>('/api/accused/', values),
    onSuccess: async (record) => {
      await queryClient.invalidateQueries({ queryKey: ['accused'] })
      navigate(`/accused/${record.id}`, { replace: true })
    },
    onError: (error) => {
      const fieldErrors = validationMessages(error)
      if (fieldErrors) {
        Object.entries(fieldErrors).forEach(([field, messages]) => {
          if (field in blankValues && messages[0]) {
            setError(field as keyof AccusedValues, { message: localizedFieldError(field, t) })
          }
        })
      }
    },
  })

  if (edit && detailQuery.isPending) return <p className="loading-inline">{t('common.loadingRecord')}</p>
  if (edit && detailQuery.isError) return <div className="notice error-notice" role="alert">{t('errors.loadRecord')}</div>
  if (choicesQuery.isError) return <div className="notice error-notice" role="alert">{t('errors.loadChoices')}</div>

  const districts = choicesQuery.data?.districts ?? []
  const states = choicesQuery.data?.states ?? []

  return (
    <section>
      <div className="page-heading">
        <p className="eyebrow">{t('accused.directory')}</p>
        <h2>{edit ? t('accused.edit') : t('accused.register')}</h2>
        <p className="muted-copy">{t('accused.addressNote')}</p>
      </div>
      <form className="record-form card" onSubmit={handleSubmit((values) => saveMutation.mutate(values))} noValidate>
        <h3>{t('accused.personalHeading')}</h3>
        <div className="form-grid">
          <FormField label={t('accused.fullName')} error={errors.full_name?.message}>
            <input autoComplete="name" {...register('full_name')} />
          </FormField>
          <FormField label={t('accused.mobile')} error={errors.mobile_number?.message}>
            <input inputMode="numeric" maxLength={10} autoComplete="tel-national" placeholder={t('form.mobileHint')} {...register('mobile_number')} />
          </FormField>
        </div>
        <h3>{t('accused.addressHeading')}</h3>
        <div className="form-grid">
          <FormField label={t('accused.detailedAddress')} error={errors.detailed_address?.message} wide>
            <textarea rows={3} {...register('detailed_address')} />
          </FormField>
          <FormField label={t('accused.village')} error={errors.village?.message}>
            <input {...register('village')} />
          </FormField>
          <FormField label={t('accused.city')} error={errors.city?.message}>
            <input {...register('city')} />
          </FormField>
          <FormField label={t('accused.taluka')} error={errors.taluka?.message}>
            <input {...register('taluka')} />
          </FormField>
          <FormField label={t('common.district')} error={errors.district?.message}>
            <select {...register('district')}>
              <option value="">{t('form.selectDistrict')}</option>
              {districts.map((district) => <option key={district.value} value={district.value}>{district.label}</option>)}
            </select>
          </FormField>
          <FormField label={t('accused.state')} error={errors.state?.message}>
            <select {...register('state')}>
              <option value="">{t('form.selectState')}</option>
              {states.map((state) => <option key={state.value} value={state.value}>{state.label}</option>)}
            </select>
          </FormField>
          <FormField label={t('accused.pincode')} error={errors.pincode?.message}>
            <input inputMode="numeric" maxLength={6} autoComplete="postal-code" placeholder={t('form.pincodeHint')} {...register('pincode')} />
          </FormField>
        </div>
        {saveMutation.isError && !validationMessages(saveMutation.error) && (
          <div className="notice error-notice" role="alert">{localizedError(saveMutation.error, t)}</div>
        )}
        {saveMutation.isError && validationMessages(saveMutation.error)?.__all__?.map((message) => (
          <div key={message.message} className="notice error-notice" role="alert">{t('errors.requestFailed')}</div>
        ))}
        <div className="form-actions">
          <button className="primary-button" disabled={saveMutation.isPending} type="submit">
            {saveMutation.isPending ? t('accused.savingRecord') : edit ? t('accused.saveChanges') : t('accused.saveGeocode')}
          </button>
          <button className="secondary-button" type="button" onClick={() => navigate(edit ? `/accused/${id}` : '/accused')}>{t('common.cancel')}</button>
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
      <label className="form-field-label">{label}<span aria-hidden="true"> *</span>{children}</label>
      {error && <span className="field-error" role="alert">{error}</span>}
    </div>
  )
}
