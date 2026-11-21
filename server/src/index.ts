import http from 'node:http'
import app from './app.js'
import { PORT, HOST, validateProductionConfig } from './config.js'
import { logger } from './logger.js'
import prisma from './db.js'

const configCheck = validateProductionConfig()
if (!configCheck.valid) {
  logger.fatal({ errors: configCheck.errors }, 'Startup configuration validation failed')
  console.error('Fatal configuration error(s):')
  for (const err of configCheck.errors) {
    console.error(` - ${err}`)
  }
  process.exit(1)
}

const server = http.createServer(app)

server.listen(PORT, HOST, () => {
  logger.info(`Sahar Police Station server running on http://${HOST}:${PORT}`)
})

let isShuttingDown = false

export async function handleShutdown(signal: string) {
  if (isShuttingDown) return
  isShuttingDown = true
  logger.info(`Received ${signal}. Starting graceful shutdown...`)

  server.close(async (err) => {
    if (err) {
      logger.error({ err }, 'Error closing HTTP server')
    } else {
      logger.info('HTTP server closed')
    }

    try {
      await prisma.$disconnect()
      logger.info('Prisma database connection closed')
    } catch (dbErr) {
      logger.error({ err: dbErr }, 'Error disconnecting Prisma')
    }

    process.exit(err ? 1 : 0)
  })

  // Force exit after 10s timeout if connections do not drain
  setTimeout(() => {
    logger.error('Graceful shutdown timed out, force exiting')
    process.exit(1)
  }, 10000).unref()
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'))
process.on('SIGINT', () => handleShutdown('SIGINT'))
