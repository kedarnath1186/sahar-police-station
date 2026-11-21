import { describe, it, expect } from 'vitest'
import { validateProductionConfig } from '../src/config.js'

describe('Production Configuration Validation', () => {
  it('passes in development mode even with placeholder values', () => {
    const result = validateProductionConfig({
      NODE_ENV: 'development',
      SECRET_KEY: 'change-this-to-a-secure-random-secret-key',
      DATABASE_URL: 'file:./dev.db',
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rejects missing or empty SECRET_KEY in production', () => {
    const result = validateProductionConfig({
      NODE_ENV: 'production',
      SECRET_KEY: '',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      ALLOWED_HOSTS: 'localhost',
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('SECRET_KEY is required in production.')
  })

  it('rejects placeholder SECRET_KEY from .env.example in production', () => {
    const result = validateProductionConfig({
      NODE_ENV: 'production',
      SECRET_KEY: 'change-this-to-a-secure-random-secret-key',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      ALLOWED_HOSTS: 'localhost',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('insecure placeholder value'))).toBe(true)
  })

  it('rejects SECRET_KEY shorter than 32 characters in production', () => {
    const result = validateProductionConfig({
      NODE_ENV: 'production',
      SECRET_KEY: 'a-short-non-placeholder-key',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      ALLOWED_HOSTS: 'localhost',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('at least 32 characters'))).toBe(true)
  })

  it('rejects SQLite DATABASE_URL in production', () => {
    const result = validateProductionConfig({
      NODE_ENV: 'production',
      SECRET_KEY: 'a-very-long-and-secure-random-secret-key-32-chars-minimum',
      DATABASE_URL: 'file:./dev.db',
      ALLOWED_HOSTS: 'localhost',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('production database (e.g. PostgreSQL), not local SQLite'))).toBe(true)
  })

  it('rejects empty ALLOWED_HOSTS in production', () => {
    const result = validateProductionConfig({
      NODE_ENV: 'production',
      SECRET_KEY: 'a-very-long-and-secure-random-secret-key-32-chars-minimum',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      ALLOWED_HOSTS: '',
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('ALLOWED_HOSTS is required and cannot be empty in production.')
  })

  it('accepts valid production configuration', () => {
    const result = validateProductionConfig({
      NODE_ENV: 'production',
      SECRET_KEY: 'production-super-strong-secure-random-key-with-sufficient-length',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/sahar_police',
      ALLOWED_HOSTS: 'police.gov.in,api.police.gov.in',
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})
