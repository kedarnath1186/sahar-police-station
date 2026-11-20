import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('Police Design and UI Contract Tests', () => {
  const enPath = path.resolve(process.cwd(), 'frontend/src/locales/en/translation.json')
  const mrPath = path.resolve(process.cwd(), 'frontend/src/locales/mr/translation.json')
  const hiPath = path.resolve(process.cwd(), 'frontend/src/locales/hi/translation.json')
  const cssPath = path.resolve(process.cwd(), 'frontend/src/index.css')
  const mapPagePath = path.resolve(process.cwd(), 'frontend/src/pages/AccusedMapPage.tsx')
  const logoPath = path.resolve(process.cwd(), 'frontend/public/static/img/maharashtra_police_logo.png')

  it('official Maharashtra police emblem exists in public directory', () => {
    expect(fs.existsSync(logoPath)).toBe(true)
    const stats = fs.statSync(logoPath)
    expect(stats.size).toBeGreaterThan(1000)
  })

  it('footer matches required government vendor attribution in all 3 languages', () => {
    const en = JSON.parse(fs.readFileSync(enPath, 'utf-8'))
    const mr = JSON.parse(fs.readFileSync(mrPath, 'utf-8'))
    const hi = JSON.parse(fs.readFileSync(hiPath, 'utf-8'))

    expect(en.footer.poweredBy).toBe('Powered by: SCode Technologies & Solutions Pvt Ltd')
    expect(mr.footer.poweredBy).toBe('द्वारे समर्थित: SCode Technologies & Solutions Pvt Ltd')
    expect(hi.footer.poweredBy).toBe('द्वारा संचालित: SCode Technologies & Solutions Pvt Ltd')
  })

  it('map marker colors match the official palette specification', () => {
    const mapSource = fs.readFileSync(mapPagePath, 'utf-8')
    expect(mapSource).toContain("verified: '#2E7D32'")
    expect(mapSource).toContain("manually_set: '#0B2A5B'")
    expect(mapSource).toContain("needs_review: '#B26A00'")
    expect(mapSource).toContain("auto_geocoded: '#071C3F'")
    expect(mapSource).toContain("not_geocoded: '#6B7280'")
  })

  it('css defines explicit desktop and mobile heights for the map container', () => {
    const css = fs.readFileSync(cssPath, 'utf-8')
    expect(css).toContain('calc(100vh - 180px)')
    expect(css).toContain('60vh')
  })
})
