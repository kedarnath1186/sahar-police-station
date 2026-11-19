import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ApiError } from '../api'

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Enter your username.'),
  password: z.string().min(1, 'Enter your password.'),
})

type Credentials = z.infer<typeof loginSchema>

type LoginPageProps = {
  onSubmit: (values: Credentials) => Promise<unknown>
  error: Error | null
  submitting: boolean
}

export function LoginPage({ onSubmit, error, submitting }: LoginPageProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<Credentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })
  const serverError = error instanceof ApiError ? error.message : error?.message

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <img className="login-logo" src="/static/img/maharashtra_police_logo.png" alt="Maharashtra Police" />
        <p className="eyebrow">Maharashtra Police</p>
        <h1 id="login-title">Sahar Police Station</h1>
        <p className="login-subtitle">Officer sign in</p>
        <form className="login-form" onSubmit={handleSubmit((values) => onSubmit(values))} noValidate>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            autoComplete="username"
            autoCapitalize="none"
            aria-invalid={Boolean(errors.username)}
            aria-describedby={errors.username ? 'username-error' : undefined}
            {...register('username')}
          />
          {errors.username && <span className="field-error" id="username-error">{errors.username.message}</span>}
          <label htmlFor="password">Password</label>
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
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="login-local">सहार पोलीस ठाणे</p>
      </section>
    </main>
  )
}
