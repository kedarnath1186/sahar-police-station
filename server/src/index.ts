import http from 'node:http'
import app from './app.js'
import { PORT, HOST } from './config.js'
import { logger } from './logger.js'

const server = http.createServer(app)

server.listen(PORT, HOST, () => {
  logger.info(`Sahar Police Station server running on http://${HOST}:${PORT}`)
})
