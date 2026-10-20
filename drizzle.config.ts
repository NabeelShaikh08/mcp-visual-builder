import { defineConfig } from 'drizzle-kit'
import * as dotenv from 'fs'

// Load .env.local manually since drizzle-kit doesn't read it automatically
const envFile = '.env.local'
try {
  const lines = dotenv.readFileSync(envFile, 'utf-8').split('\n')
  for (const line of lines) {
    const [key, ...rest] = line.split('=')
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
  }
} catch { /* file not found */ }

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
