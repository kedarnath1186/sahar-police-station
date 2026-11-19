import i18n from './i18n'

export class ApiError extends Error {
  readonly status: number
  readonly data: unknown

  constructor(
    message: string,
    status: number,
    data: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

function responseError(status: number, data: unknown) {
  if (status === 401) return i18n.t('errors.invalidLogin')
  if (status === 403) return i18n.t('errors.forbidden')
  if (status === 404) return i18n.t('errors.notFound')
  if (status === 429) return i18n.t('errors.lockedOut')
  const detail = (data as { detail?: string | string[] } | null)?.detail
  const text = Array.isArray(detail) ? detail.join(' ').toLowerCase() : detail?.toLowerCase() ?? ''
  if (text.includes('invalid coordinates')) return i18n.t('errors.invalidCoordinates')
  if (text.includes('within india') || text.includes('reside within india')) return i18n.t('errors.outsideIndia')
  if (text.includes('without established coordinates')) return i18n.t('errors.noCoordinates')
  if (text.includes('image') || text.includes('photo')) return i18n.t('errors.uploadFailed')
  if (text.includes('lockout') || text.includes('failed login attempts')) return i18n.t('errors.lockedOut')
  return i18n.t('errors.requestFailed')
}

function cookieValue(name: string) {
  return document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.slice(name.length + 1)
}

async function csrfToken() {
  let token = cookieValue('csrftoken')
  if (!token) {
    const response = await fetch('/api/auth/csrf/', { credentials: 'same-origin' })
    if (!response.ok) throw new ApiError(i18n.t('errors.requestFailed'), response.status, null)
    token = cookieValue('csrftoken')
  }
  if (!token) throw new ApiError(i18n.t('errors.requestFailed'), 0, null)
  return decodeURIComponent(token)
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase()
  const headers = new Headers(options.headers)
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (!['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method)) {
    headers.set('X-CSRFToken', await csrfToken())
  }
  const response = await fetch(path, {
    ...options,
    method,
    headers,
    credentials: 'same-origin',
    body: options.body instanceof FormData || typeof options.body === 'string'
      ? options.body
      : options.body
        ? JSON.stringify(options.body)
        : undefined,
  })
  if (response.status === 204) return undefined as T
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError(responseError(response.status, data), response.status, data)
  }
  return data as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, body: FormData, method: 'POST' | 'PUT' | 'PATCH' = 'POST') =>
    request<T>(path, { method, body }),
}
