import { Router } from 'express'
import path from 'node:path'
import fs from 'node:fs'
import { MEDIA_DIR } from '../config.js'

export const mediaRouter = Router()

mediaRouter.get('/*', (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ detail: 'Authentication credentials were not provided.' })
  }

  // Prevent path traversal
  const requestedPath = (req.params as any)[0]
  if (!requestedPath) {
    return res.status(404).json({ detail: 'Not found.' })
  }

  const safePath = path.normalize(requestedPath).replace(/^(\.\.[\/\\])+/, '')
  const filePath = path.resolve(MEDIA_DIR, safePath)

  if (!filePath.startsWith(MEDIA_DIR)) {
    return res.status(403).json({ detail: 'Access denied.' })
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return res.sendFile(filePath)
  }

  return res.status(404).json({ detail: 'Not found.' })
})
