import pino from 'pino'
import { DEBUG } from './config.js'

export const logger = pino({
  level: DEBUG ? 'debug' : 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? {
        target: 'pino-pretty',
        options: { colorize: true },
      }
    : undefined,
})
