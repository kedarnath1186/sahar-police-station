import i18n from './i18n'
import type { TFunction } from 'i18next'

export type Choice = { value: string; label: string }

export type FormChoices = {
  districts: Choice[]
  states: Choice[]
  statuses: Choice[]
  accuracies: Choice[]
  accuracy_radii: Record<string, number>
}

export type LocationCheck = {
  action: string
  latitude: number | null
  longitude: number | null
  location_status: string
  location_accuracy: string
  note: string
  timestamp: string
  officer: string | null
}

export type Photo = {
  id: number
  image_url: string
  location_address: string
  latitude: number
  longitude: number
  caption: string
  uploaded_at: string
}

export type Accused = {
  id: number
  record_id: string
  full_name: string
  mobile_number: string
  formatted_mobile: string
  detailed_address: string
  village: string
  city: string
  taluka: string
  district: string
  state: string
  pincode: string
  latitude: number | null
  longitude: number | null
  location_status: string
  location_accuracy: string
  geocoded_display_name: string
  geocoded_at: string | null
  verified_by: string | null
  verified_at: string | null
  created_at: string
  updated_at: string
  photo_count: number
  photos?: Photo[]
  location_checks?: LocationCheck[]
  name?: string
  lat?: number
  lon?: number
  address?: string
  display_name?: string
}

export type Paginated<T> = {
  results: T[]
  count: number
  page: number
  page_size: number
  total_pages: number
}

function activeLocale() {
  if (i18n.language.startsWith('mr')) return 'mr-IN'
  if (i18n.language.startsWith('hi')) return 'hi-IN'
  return 'en-IN'
}

export function formatIstDate(value: string | null | undefined, locale = activeLocale()) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value))
}

export function formatNumber(value: number, locale = activeLocale()) {
  return new Intl.NumberFormat(locale).format(value)
}

export function statusClass(status: string) {
  return `status-badge status-${status.replaceAll('_', '-')}`
}

export function choiceLabel(choices: Choice[] | undefined, value: string) {
  return choices?.find((choice) => choice.value === value)?.label ?? value.replaceAll('_', ' ')
}

export function statusLabel(value: string, t: TFunction) {
  return t(`status.${value}`, { defaultValue: value.replaceAll('_', ' ') })
}

export function accuracyLabel(value: string, t: TFunction) {
  return t(`accuracy.${value}`, { defaultValue: value })
}

