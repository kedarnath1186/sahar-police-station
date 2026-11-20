import session from 'express-session'
import prisma from './db.js'

export class PrismaSessionStore extends session.Store {
  async get(sid: string, callback: (err?: any, session?: session.SessionData | null) => void) {
    try {
      const record = await prisma.session.findUnique({ where: { sid } })
      if (!record) return callback(null, null)
      if (record.expiresAt < new Date()) {
        await prisma.session.delete({ where: { sid } }).catch(() => {})
        return callback(null, null)
      }
      const data = JSON.parse(record.data)
      return callback(null, data)
    } catch (err) {
      return callback(err)
    }
  }

  async set(sid: string, sessionData: session.SessionData, callback?: (err?: any) => void) {
    try {
      const expiresAt = sessionData.cookie?.expires
        ? new Date(sessionData.cookie.expires)
        : new Date(Date.now() + 30 * 60 * 1000)

      await prisma.session.upsert({
        where: { sid },
        update: {
          data: JSON.stringify(sessionData),
          expiresAt,
        },
        create: {
          id: sid,
          sid,
          data: JSON.stringify(sessionData),
          expiresAt,
        },
      })
      callback?.(null)
    } catch (err) {
      callback?.(err)
    }
  }

  async destroy(sid: string, callback?: (err?: any) => void) {
    try {
      await prisma.session.delete({ where: { sid } }).catch(() => {})
      callback?.(null)
    } catch (err) {
      callback?.(err)
    }
  }

  async touch(sid: string, sessionData: session.SessionData, callback?: (err?: any) => void) {
    try {
      const expiresAt = sessionData.cookie?.expires
        ? new Date(sessionData.cookie.expires)
        : new Date(Date.now() + 30 * 60 * 1000)

      await prisma.session.update({
        where: { sid },
        data: { expiresAt },
      }).catch(() => {})
      callback?.(null)
    } catch (err) {
      callback?.(err)
    }
  }
}
