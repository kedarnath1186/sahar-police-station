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
    if (!response.ok) throw new ApiError('Unable to initialize secure session.', response.status, null)
    token = cookieValue('csrftoken')
  }
  if (!token) throw new ApiError('Unable to initialize secure session.', 0, null)
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
    body: options.body instanceof FormData ? options.body : options.body ? JSON.stringify(options.body) : undefined,
  })
  if (response.status === 204) return undefined as T
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const message = typeof data?.detail === 'string' ? data.detail : 'The request could not be completed.'
    throw new ApiError(message, response.status, data)
  }
  return data as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, body: FormData) => request<T>(path, { method: 'POST', body }),
}
