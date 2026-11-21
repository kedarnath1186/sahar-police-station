import http from 'node:http'
import app from './app.js'
import { PORT, HOST, validateProductionConfig } from './config.js'
import { logger } from './logger.js'

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
