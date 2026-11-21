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
  const normalizedMediaDir = path.resolve(MEDIA_DIR)
  const filePath = path.resolve(normalizedMediaDir, safePath)

  if (!filePath.startsWith(normalizedMediaDir + path.sep) && filePath !== normalizedMediaDir) {
    return res.status(403).json({ detail: 'Access denied.' })
  }

  try {
    const stat = fs.statSync(filePath)
    if (stat.isFile()) {
      return res.sendFile(filePath)
    }
  } catch {
    return res.status(404).json({ detail: 'Not found.' })
  }

  return res.status(404).json({ detail: 'Not found.' })
})
