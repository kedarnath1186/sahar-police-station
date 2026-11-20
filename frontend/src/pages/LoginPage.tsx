import { useMemo } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { localizedError } from '../errorMessages'

const createLoginSchema = (required: (key: string) => string) =>
  z.object({
    username: z.string().trim().min(1, required('auth.usernameRequired')),
    password: z.string().min(1, required('auth.passwordRequired')),
  })

export type Credentials = {
  username: string
  password: string
}

type LoginPageProps = {
  onSubmit: (values: Credentials) => Promise<unknown>
  error: Error | null
  submitting: boolean
}

export function LoginPage({ onSubmit, error, submitting }: LoginPageProps) {
  const { t, i18n } = useTranslation()
  const schema = useMemo(() => createLoginSchema((key) => t(key)), [t])
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Credentials>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '' },
  })
  const serverError = error ? localizedError(error, t) : null

  return (
    <main className="login-page">
      <div className="login-container">
        <header className="login-header">
          <div className="login-logo-badge">
            <img className="login-logo" src="/static/img/maharashtra_police_logo.png" alt={t('app.logoAlt')} />
          </div>
          <h1 className="login-header-title">Maharashtra Police</h1>
          <p className="login-header-marathi">महाराष्ट्र पोलीस</p>
          <p className="login-header-station">{t('app.station')}</p>
        </header>

        <div className="login-top-bar">
          <label className="login-language-picker">
            <span className="visually-hidden">{t('language.label')}</span>
            <select
              id="login-language-select"
              aria-label={t('language.label')}
              value={i18n.resolvedLanguage ?? 'en'}
              onChange={(event) => {
                const language = event.target.value
                void i18n.changeLanguage(language)
                window.localStorage.setItem('language', language)
                document.documentElement.lang = language
              }}
            >
              <option value="en">{t('language.english')}</option>
              <option value="mr">{t('language.marathi')}</option>
              <option value="hi">{t('language.hindi')}</option>
            </select>
          </label>
        </div>

        <section className="login-card" aria-labelledby="login-card-title">
          <h2 id="login-card-title" className="login-card-title">{t('auth.signIn')}</h2>

          {serverError && (
            <div role="alert" className="login-error-alert">
              <svg
                className="login-alert-icon"
                viewBox="0 0 20 20"
                fill="currentColor"
                width="18"
                height="18"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{serverError}</span>
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit((values) => onSubmit(values))} noValidate>
            <div className="login-field">
              <label htmlFor="username">{t('auth.username')}</label>
              <input
                id="username"
                autoComplete="username"
                autoCapitalize="none"
                aria-invalid={Boolean(errors.username)}
                aria-describedby={errors.username ? 'username-error' : undefined}
                {...register('username')}
              />
              {errors.username && <span className="field-error" id="username-error">{errors.username.message}</span>}
            </div>

            <div className="login-field">
              <label htmlFor="password">{t('auth.password')}</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'password-error' : undefined}
                {...register('password')}
              />
              {errors.password && <span className="field-error" id="password-error">{errors.password.message}</span>}
            </div>

            <button className="primary-button login-submit" type="submit" disabled={submitting}>
              {submitting ? t('auth.submitting') : t('auth.submit')}
            </button>
          </form>
        </section>

        <footer className="login-footer">
          {t('footer.poweredBy')}
        </footer>
      </div>
    </main>
  )
}
