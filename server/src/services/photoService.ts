import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileTypeFromBuffer } from 'file-type'
import sharp from 'sharp'
import { MEDIA_DIR } from '../config.js'

export const MAX_PHOTO_SIZE = 5 * 1024 * 1024 // 5 MB
export const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export async function validateAndSaveImage(
  buffer: Buffer,
  folder: 'accused_photos' | 'famous_places'
): Promise<string> {
  if (buffer.length > MAX_PHOTO_SIZE) {
    throw new Error('The image must be 5 MB or smaller.')
  }

  // 1. Check content with file-type
  const type = await fileTypeFromBuffer(buffer)
  if (!type || !ALLOWED_MIME_TYPES.has(type.mime)) {
    throw new Error('Upload a valid image. The file you uploaded was either not an image or a corrupted image.')
  }

  // 2. Decode with sharp to verify image integrity
  try {
    const metadata = await sharp(buffer).metadata()
    if (!metadata.width || !metadata.height) {
      throw new Error('Corrupted image payload.')
    }
  } catch {
    throw new Error('Upload a valid image. The file you uploaded was either not an image or a corrupted image.')
  }

  // 3. Save to disk
  const targetDir = path.join(MEDIA_DIR, folder)
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }

  const ext = type.ext === 'jpg' ? 'jpg' : type.ext
  const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`
  const filePath = path.join(targetDir, filename)

  await fs.promises.writeFile(filePath, buffer)

  return `${folder}/${filename}`
}

export async function deleteImageFile(relativeImagePath: string): Promise<void> {
  if (!relativeImagePath) return
  const normalizedMediaDir = path.resolve(MEDIA_DIR)
  const fullPath = path.resolve(normalizedMediaDir, relativeImagePath)
  if (!fullPath.startsWith(normalizedMediaDir + path.sep)) return
  try {
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath)
    }
  } catch (err) {
    console.error(`Failed to delete image file ${fullPath}:`, err)
  }
}
