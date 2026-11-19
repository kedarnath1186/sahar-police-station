import type { TFunction } from 'i18next'
import { ApiError } from './api'

export function localizedError(error: unknown, t: TFunction) {
  if (!(error instanceof ApiError)) return t('errors.requestFailed')
  if (error.status === 401) return t('errors.invalidLogin')
  if (error.status === 403) return t('errors.forbidden')
  if (error.status === 404) return t('errors.notFound')
  if (error.status === 429) return t('errors.lockedOut')

  const body = error.data as { detail?: string | string[] } | null
  const detail = Array.isArray(body?.detail) ? body.detail.join(' ').toLowerCase() : body?.detail?.toLowerCase() ?? ''
  if (detail.includes('invalid coordinates')) return t('errors.invalidCoordinates')
  if (detail.includes('within india') || detail.includes('reside within india')) return t('errors.outsideIndia')
  if (detail.includes('without established coordinates')) return t('errors.noCoordinates')
  if (detail.includes('image') || detail.includes('photo')) return t('errors.uploadFailed')
  if (detail.includes('lockout') || detail.includes('failed login attempts')) return t('errors.lockedOut')
  return t('errors.requestFailed')
}

export function localizedFieldError(field: string, t: TFunction) {
  if (field === 'mobile_number') return t('validation.digitsMobile')
  if (field === 'pincode') return t('validation.digitsPincode')
  if (field === 'image' || field === 'photo') return t('validation.imageInvalid')
  return t('validation.required')
}
