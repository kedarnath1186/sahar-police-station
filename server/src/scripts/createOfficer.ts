import readline from 'node:readline'
import prisma from '../db.js'
import { hashPassword } from '../services/authService.js'

function prompt(query: string, hide = false): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

async function main() {
  const args = process.argv.slice(2)
  let username = ''
  let fullName = ''
  let password = ''

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--username' && args[i + 1]) username = args[++i]
    if (args[i] === '--full-name' && args[i + 1]) fullName = args[++i]
    if (args[i] === '--password' && args[i + 1]) password = args[++i]
  }

  if (!username) {
    username = await prompt('Enter officer username: ')
  }
  username = username.trim().toLowerCase()
  if (!username) {
    console.error('Username cannot be empty.')
    process.exit(1)
  }

  if (!fullName) {
    fullName = await prompt('Enter officer full name (optional): ')
  }

  if (!password) {
    password = await prompt('Enter password: ')
  }
  if (!password || password.length < 6) {
    console.error('Password must be at least 6 characters.')
    process.exit(1)
  }

  const hashedPassword = await hashPassword(password)

  const officer = await prisma.user.upsert({
    where: { username },
    update: {
      password: hashedPassword,
      fullName: fullName || username,
      isStaff: true,
    },
    create: {
      username,
      password: hashedPassword,
      fullName: fullName || username,
      isStaff: true,
    },
  })

  console.log(`Officer account '${officer.username}' created/updated successfully (ID: ${officer.id}).`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('Error creating officer:', err)
  process.exit(1)
})
