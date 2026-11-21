import pino from 'pino'
import { pinoHttp } from 'pino-http'
import crypto from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { DEBUG } from './config.js'

export function maskMobile(mobile: string | null | undefined): string {
  if (!mobile || typeof mobile !== 'string' || mobile.length !== 10) return mobile || ''
  return `${mobile.slice(0, 3)}****${mobile.slice(7)}`
}

export const logger = pino({
  level: DEBUG ? 'debug' : 'info',
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      'res.headers["set-cookie"]',
      'password',
      '*.password',
      'req.body.password',
      'authorization',
      '*.authorization',
      'cookie',
      '*.cookie',
      'session',
      '*.session',
      'csrfToken',
      '*.csrfToken',
      'mobile_number',
      '*.mobile_number',
      'req.body.mobile_number',
      'mobileNumber',
      '*.mobileNumber',
      'req.body.mobileNumber',
    ],
    censor: '[REDACTED]',
  },
  transport: process.env.NODE_ENV !== 'production'
    ? {
        target: 'pino-pretty',
        options: { colorize: true },
      }
    : undefined,
})

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req: IncomingMessage, res: ServerResponse) => {
    const existing = req.headers['x-request-id']
    const id = (typeof existing === 'string' && existing.trim()) ? existing.trim() : crypto.randomUUID()
    res.setHeader('X-Request-Id', id)
    return id
  },
  customLogLevel: (req: IncomingMessage, res: ServerResponse, err?: Error) => {
    if (res.statusCode >= 500 || err) return 'error'
    if (res.statusCode >= 400) return 'warn'
    return 'info'
  },
  autoLogging: {
    ignore: (req: IncomingMessage) => req.url === '/healthz',
  },
})
