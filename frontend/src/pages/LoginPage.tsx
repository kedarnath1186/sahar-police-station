import { useMemo } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { localizedError } from '../errorMessages'

const loginSchema = (required: (key: string) => string) => z.object({
  username: z.string().trim().min(1, required('auth.usernameRequired')),
  password: z.string().min(1, required('auth.passwordRequired')),
})

type Credentials = z.infer<typeof loginSchema>

type LoginPageProps = {
  onSubmit: (values: Credentials) => Promise<unknown>
  error: Error | null
  submitting: boolean
}

export function LoginPage({ onSubmit, error, submitting }: LoginPageProps) {
  const { t } = useTranslation()
  const schema = useMemo(() => loginSchema((key) => t(key)), [t])
  const { register, handleSubmit, formState: { errors } } = useForm<Credentials>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '' },
  })
  const serverError = error ? localizedError(error, t) : null

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <img className="login-logo" src="/static/img/maharashtra_police_logo.png" alt={t('app.logoAlt')} />
        <p className="eyebrow">{t('app.force')}</p>
        <h1 id="login-title">{t('app.station')}</h1>
        <p className="login-subtitle">{t('auth.signIn')}</p>
        <form className="login-form" onSubmit={handleSubmit((values) => onSubmit(values))} noValidate>
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
          {serverError && <div role="alert" className="form-error">{serverError}</div>}
          <button className="primary-button login-submit" type="submit" disabled={submitting}>
            {submitting ? t('auth.submitting') : t('auth.submit')}
          </button>
        </form>
        <p className="login-local">{t('app.localStation')}</p>
      </section>
    </main>
  )
}
