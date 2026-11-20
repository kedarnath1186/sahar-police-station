import prisma from '../db.js'

export async function logAction(
  userId: number | null,
  action: 'create' | 'update' | 'delete' | 'verify' | 'manual_set',
  modelName: string,
  objectId: number,
  description = ''
) {
  try {
    return await prisma.auditLog.create({
      data: {
        userId,
        action,
        modelName,
        objectId,
        description,
      },
    })
  } catch (err) {
    console.error('Failed to write audit log:', err)
  }
}
