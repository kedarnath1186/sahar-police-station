import argon2 from 'argon2'
import prisma from '../db.js'
import { LOGIN_ATTEMPTS_LIMIT, LOGIN_LOCKOUT_MINUTES } from '../config.js'

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
  })
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain)
  } catch {
    return false
  }
}

export function normalizeUsername(username: string): string {
  return (username || '').trim().toLowerCase()
}

export async function authenticateOfficer(
  username: string,
  password: string,
  ipAddress?: string
): Promise<{
  user: { id: number; username: string; fullName: string; isStaff: boolean } | null
  error: string | null
  locked: boolean
}> {
  const normalizedUsername = normalizeUsername(username)
  const sinceTime = new Date(Date.now() - LOGIN_LOCKOUT_MINUTES * 60 * 1000)

  // Count recent failed attempts for this normalized username within the lockout window
  const recentFailures = await prisma.loginAttempt.count({
    where: {
      username: normalizedUsername,
      successful: false,
      timestamp: {
        gte: sinceTime,
      },
    },
  })

  if (recentFailures >= LOGIN_ATTEMPTS_LIMIT) {
    return {
      user: null,
      error: `Security lockout: Too many failed login attempts for '${username}'. Please wait ${LOGIN_LOCKOUT_MINUTES} minutes before trying again.`,
      locked: true,
    }
  }

  let user = await prisma.user.findUnique({
    where: { username: normalizedUsername },
  })
  if (!user && username !== normalizedUsername) {
    user = await prisma.user.findUnique({
      where: { username },
    })
  }

  const isValid = user ? await verifyPassword(user.password, password) : false

  await prisma.loginAttempt.create({
    data: {
      username: normalizedUsername,
      ipAddress: ipAddress || null,
      successful: isValid,
    },
  })

  if (isValid && user) {
    return {
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        isStaff: user.isStaff,
      },
      error: null,
      locked: false,
    }
  }

  const remaining = Math.max(0, LOGIN_ATTEMPTS_LIMIT - (recentFailures + 1))
  if (remaining > 0) {
    return {
      user: null,
      error: `Invalid username or password. ${remaining} attempt(s) remaining before temporary lockout.`,
      locked: false,
    }
  } else {
    return {
      user: null,
      error: `Security lockout: Too many failed login attempts. Please wait ${LOGIN_LOCKOUT_MINUTES} minutes.`,
      locked: true,
    }
  }
}
