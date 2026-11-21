import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const prismaDir = path.resolve(__dirname, '../prisma')
const schemaPath = path.resolve(prismaDir, 'schema.prisma')
const dbUrl = process.env.DATABASE_URL || 'file:./dev.db'

const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://')
const targetProvider = isPostgres ? 'postgresql' : 'sqlite'

if (fs.existsSync(schemaPath)) {
  let schema = fs.readFileSync(schemaPath, 'utf-8')
  schema = schema.replace(/provider\s*=\s*"(sqlite|postgresql)"/, `provider = "${targetProvider}"`)
  fs.writeFileSync(schemaPath, schema, 'utf-8')
  console.log(`Prisma schema datasource provider set to: ${targetProvider}`)
}

// Synchronize migration baseline based on database provider
const activeMigrationsDir = path.resolve(prismaDir, 'migrations')
const sqliteMigrationsDir = path.resolve(prismaDir, 'migrations_sqlite')
const postgresMigrationsDir = path.resolve(prismaDir, 'migrations_postgres')

const sourceMigrationsDir = isPostgres ? postgresMigrationsDir : sqliteMigrationsDir
if (fs.existsSync(sourceMigrationsDir)) {
  if (fs.existsSync(activeMigrationsDir)) {
    fs.rmSync(activeMigrationsDir, { recursive: true, force: true })
  }
  fs.cpSync(sourceMigrationsDir, activeMigrationsDir, { recursive: true })
  console.log(`Prisma migrations synchronized to: ${isPostgres ? 'PostgreSQL' : 'SQLite'} baseline`)
}
