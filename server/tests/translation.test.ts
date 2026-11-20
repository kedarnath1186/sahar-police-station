import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

function getLeafKeys(obj: any, prefix = ''): string[] {
  let keys: string[] = []
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys = keys.concat(getLeafKeys(value, fullKey))
    } else {
      keys.push(fullKey)
    }
  }
  return keys.sort()
}

describe('Translation Keys Consistency Test', () => {
  const enPath = path.resolve(process.cwd(), 'frontend/src/locales/en/translation.json')
  const mrPath = path.resolve(process.cwd(), 'frontend/src/locales/mr/translation.json')
  const hiPath = path.resolve(process.cwd(), 'frontend/src/locales/hi/translation.json')

  it('all translation files exist and are valid JSON', () => {
    expect(fs.existsSync(enPath)).toBe(true)
    expect(fs.existsSync(mrPath)).toBe(true)
    expect(fs.existsSync(hiPath)).toBe(true)
  })

  it('en, mr, and hi have identical keys', () => {
    const en = JSON.parse(fs.readFileSync(enPath, 'utf-8'))
    const mr = JSON.parse(fs.readFileSync(mrPath, 'utf-8'))
    const hi = JSON.parse(fs.readFileSync(hiPath, 'utf-8'))

    const enKeys = getLeafKeys(en)
    const mrKeys = getLeafKeys(mr)
    const hiKeys = getLeafKeys(hi)

    expect(mrKeys).toEqual(enKeys)
    expect(hiKeys).toEqual(enKeys)
  })
})
