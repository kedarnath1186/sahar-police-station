import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const schemaPath = path.resolve(__dirname, '../prisma/schema.prisma')
const dbUrl = process.env.DATABASE_URL || 'file:./dev.db'

const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://')
const targetProvider = isPostgres ? 'postgresql' : 'sqlite'

if (fs.existsSync(schemaPath)) {
  let schema = fs.readFileSync(schemaPath, 'utf-8')
  schema = schema.replace(/provider\s*=\s*"(sqlite|postgresql)"/, `provider = "${targetProvider}"`)
  fs.writeFileSync(schemaPath, schema, 'utf-8')
  console.log(`Prisma schema datasource provider set to: ${targetProvider}`)
}
