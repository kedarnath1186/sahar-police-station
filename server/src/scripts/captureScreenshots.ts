import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

// Set trusted origins before importing app/config
process.env.CSRF_TRUSTED_ORIGINS = 'http://localhost:8000,http://127.0.0.1:8000,http://localhost:8765,http://127.0.0.1:8765'

import { app } from '../app.js'
import prisma from '../db.js'

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const SCREENSHOTS_DIR = path.resolve(process.cwd(), 'screenshots')

async function capture() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
  }

  // Find first accused id
  const firstAccused = await prisma.accused.findFirst({ orderBy: { id: 'asc' } })
  const accusedId = firstAccused ? firstAccused.id : 1

  const port = 8000
  const server = app.listen(port)
  console.log(`Server listening on port ${port} for screenshot capture...`)

  try {
    const browser = await puppeteer.launch({
      executablePath: EDGE_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    })

    const viewports = [
      { name: 'desktop', width: 1280, height: 800 },
      { name: 'mobile', width: 360, height: 740, isMobile: true, hasTouch: true },
    ]

    for (const vp of viewports) {
      console.log(`\n=== Capturing ${vp.name} screenshots (${vp.width}x${vp.height}) ===`)
      const context = await browser.createBrowserContext()
      const page = await context.newPage()
      await page.setViewport({ width: vp.width, height: vp.height })

      page.on('console', (msg) => {
        if (msg.type() === 'error') console.log(`[Browser Error]:`, msg.text())
      })

      // 1. Login Page
      console.log(`- Navigating to Login (${vp.name})...`)
      await page.goto(`http://localhost:${port}/login`, { waitUntil: 'networkidle0' })
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, `01_login_${vp.name}.png`),
      })

      // Perform Login
      console.log(`- Entering credentials as officer (${vp.name})...`)
      await page.waitForSelector('#username')
      await page.type('#username', 'officer')
      await page.type('#password', 'police123')
      await page.click('button[type="submit"]')

      // Wait for navigation to /
      console.log(`- Waiting for dashboard navigation...`)
      await page.waitForFunction(
        () => !(globalThis as any).location.pathname.includes('/login'),
        { timeout: 10000 })
      await new Promise((r) => setTimeout(r, 1500))
      console.log(`- Current URL: ${page.url()}`)

      // 2. Dashboard
      console.log(`- Capturing Dashboard (${vp.name})...`)
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, `02_dashboard_${vp.name}.png`),
      })

      // 3. Map View
      console.log(`- Navigating to Map (${vp.name})...`)
      await page.goto(`http://localhost:${port}/map`, { waitUntil: 'networkidle0' })
      await new Promise((r) => setTimeout(r, 3000)) // Wait for tiles and pins to render
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, `07_accused_map_${vp.name}.png`),
      })

      // 4. Accused Detail View
      console.log(`- Navigating to Accused Detail #${accusedId} (${vp.name})...`)
      await page.goto(`http://localhost:${port}/accused/${accusedId}`, { waitUntil: 'networkidle0' })
      await new Promise((r) => setTimeout(r, 1500))
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, `05_accused_detail_${vp.name}.png`),
      })

      // 5. Accused List View
      console.log(`- Navigating to Accused List (${vp.name})...`)
      await page.goto(`http://localhost:${port}/accused`, { waitUntil: 'networkidle0' })
      await new Promise((r) => setTimeout(r, 1500))
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, `03_accused_list_${vp.name}.png`),
      })

      // 6. Accused Add Form
      console.log(`- Navigating to Add Accused (${vp.name})...`)
      await page.goto(`http://localhost:${port}/accused/new`, { waitUntil: 'networkidle0' })
      await new Promise((r) => setTimeout(r, 1500))
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, `04_accused_add_${vp.name}.png`),
      })

      // 7. Accused Table View
      console.log(`- Navigating to Table View (${vp.name})...`)
      await page.goto(`http://localhost:${port}/table`, { waitUntil: 'networkidle0' })
      await new Promise((r) => setTimeout(r, 1500))
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, `06_accused_table_${vp.name}.png`),
      })

      // 8. Famous Places List
      console.log(`- Navigating to Famous Places (${vp.name})...`)
      await page.goto(`http://localhost:${port}/places`, { waitUntil: 'networkidle0' })
      await new Promise((r) => setTimeout(r, 2000))
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, `08_places_list_${vp.name}.png`),
      })

      // 9. Famous Places Add Form
      console.log(`- Navigating to Add Famous Place (${vp.name})...`)
      await page.goto(`http://localhost:${port}/places/new`, { waitUntil: 'networkidle0' })
      await new Promise((r) => setTimeout(r, 1500))
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, `09_places_add_${vp.name}.png`),
      })

      await context.close()
    }

    await browser.close()
    console.log('\nAll screenshots captured successfully!')
  } finally {
    server.close()
    await prisma.$disconnect()
  }
}

capture().catch((err) => {
  console.error('Error capturing screenshots:', err)
  process.exit(1)
})
