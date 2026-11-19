import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import type { ReactNode } from 'react'
import { z } from 'zod'
import { ApiError, api } from '../api'
import type { Accused, FormChoices } from '../types'

const schema = z.object({
  full_name: z.string().trim().min(1, 'Enter the full name.').max(150),
  mobile_number: z.string().regex(/^\d{10}$/, 'Enter a 10-digit mobile number.'),
  detailed_address: z.string().trim().min(1, 'Enter the detailed address.'),
  village: z.string().trim().min(1, 'Enter the village or locality.').max(100),
  city: z.string().trim().min(1, 'Enter the city.').max(100),
  taluka: z.string().trim().min(1, 'Enter the taluka.').max(100),
  district: z.string().min(1, 'Select a district.'),
  state: z.string().min(1, 'Select a state.'),
  pincode: z.string().regex(/^\d{6}$/, 'Enter a 6-digit pincode.'),
})

type AccusedValues = z.infer<typeof schema>

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
            setError(field as keyof AccusedValues, { message: messages[0].message })
          }
        })
      }
    },
  })

  if (edit && detailQuery.isPending) return <p className="loading-inline">Loading record…</p>
  if (edit && detailQuery.isError) return <div className="notice error-notice" role="alert">Could not load this accused record.</div>
  if (choicesQuery.isError) return <div className="notice error-notice" role="alert">Could not load form options.</div>

  const districts = choicesQuery.data?.districts ?? []
  const states = choicesQuery.data?.states ?? []

  return (
    <section>
      <div className="page-heading">
        <p className="eyebrow">Accused Records</p>
        <h2>{edit ? 'Edit Accused Record' : 'Register Accused Record'}</h2>
        <p className="muted-copy">Enter accurate personal and address details. Address changes may clear an existing map location if the new address cannot be geocoded.</p>
      </div>
      <form className="record-form card" onSubmit={handleSubmit((values) => saveMutation.mutate(values))} noValidate>
        <h3>Personal Identification</h3>
        <div className="form-grid">
          <FormField label="Full Name" error={errors.full_name?.message}>
            <input autoComplete="name" {...register('full_name')} />
          </FormField>
          <FormField label="Mobile Number" error={errors.mobile_number?.message}>
            <input inputMode="numeric" maxLength={10} autoComplete="tel-national" {...register('mobile_number')} />
          </FormField>
        </div>
        <h3>Residential Address</h3>
        <div className="form-grid">
          <FormField label="Detailed Address" error={errors.detailed_address?.message} wide>
            <textarea rows={3} {...register('detailed_address')} />
          </FormField>
          <FormField label="Village / Locality" error={errors.village?.message}>
            <input {...register('village')} />
          </FormField>
          <FormField label="City / Town" error={errors.city?.message}>
            <input {...register('city')} />
          </FormField>
          <FormField label="Taluka" error={errors.taluka?.message}>
            <input {...register('taluka')} />
          </FormField>
          <FormField label="District" error={errors.district?.message}>
            <select {...register('district')}>
              <option value="">Select a district</option>
              {districts.map((district) => <option key={district.value} value={district.value}>{district.label}</option>)}
            </select>
          </FormField>
          <FormField label="State / Union Territory" error={errors.state?.message}>
            <select {...register('state')}>
              {states.map((state) => <option key={state.value} value={state.value}>{state.label}</option>)}
            </select>
          </FormField>
          <FormField label="Pincode" error={errors.pincode?.message}>
            <input inputMode="numeric" maxLength={6} autoComplete="postal-code" {...register('pincode')} />
          </FormField>
        </div>
        {saveMutation.isError && !validationMessages(saveMutation.error) && (
          <div className="notice error-notice" role="alert">{saveMutation.error.message}</div>
        )}
        {saveMutation.isError && validationMessages(saveMutation.error)?.__all__?.map((message) => (
          <div key={message.message} className="notice error-notice" role="alert">{message.message}</div>
        ))}
        <div className="form-actions">
          <button className="primary-button" disabled={saveMutation.isPending} type="submit">
            {saveMutation.isPending ? 'Saving…' : edit ? 'Save Changes' : 'Save and Geocode'}
          </button>
          <button className="secondary-button" type="button" onClick={() => navigate(edit ? `/accused/${id}` : '/accused')}>Cancel</button>
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
