/**
 * One-shot migration tool: copies config values from the current process.env
 * into the `app_config` MongoDB collection.
 *
 * Run once per environment after the initial setup:
 *   npm run seed:config -w @agoda-food/backend
 *
 * Idempotent — keys already present in the DB are NOT overwritten.
 * Only keys listed in CONFIG_KEYS are imported.
 *
 * Also reads frontend/.env to pick up VITE_* vars that map to backend keys
 * (e.g. VITE_LIFF_ID → LIFF_ID).
 *
 * After running, remove the migrated vars from your .env files and keep only:
 *   MONGODB_URI, PORT, NODE_ENV
 */
import 'dotenv/config'
import path from 'path'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { AppConfigEntry } from '@models/AppConfigEntry'
import { CONFIG_KEYS, ConfigKey } from './keys'

// Also load frontend/.env so VITE_* aliases are available
const frontendEnvPath = path.resolve(__dirname, '..', '..', '..', 'frontend', '.env')
dotenv.config({ path: frontendEnvPath, override: false })

// Keys that live under a different name in the frontend env file
const FRONTEND_ENV_ALIASES: Partial<Record<ConfigKey, string>> = {
  LIFF_ID: 'VITE_LIFF_ID',
}

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/agoda-food'

async function seedFromEnv() {
  await mongoose.connect(MONGODB_URI)
  console.log('[seed:config] Connected to MongoDB')

  let inserted = 0
  let skipped = 0

  for (const meta of Object.values(CONFIG_KEYS)) {
    const { key } = meta
    // Check the canonical env var first, then fall back to a frontend alias if one exists
    const alias = FRONTEND_ENV_ALIASES[key]
    const envVal = process.env[key] ?? (alias ? process.env[alias] : undefined)

    if (envVal === undefined || envVal === '') {
      console.log(`  SKIP  ${key} (not in env${alias ? ` or ${alias}` : ''})`)
      skipped++
      continue
    }

    const existing = await AppConfigEntry.findOne({ key }).lean()
    if (existing) {
      console.log(`  SKIP  ${key} (already in DB)`)
      skipped++
      continue
    }

    // Coerce value to the appropriate type based on the default's type
    let value: string | number | boolean = envVal
    const metaWithDefault = meta as { default?: string | number | boolean }
    if (metaWithDefault.default !== undefined) {
      if (typeof metaWithDefault.default === 'number') value = Number(envVal)
      else if (typeof metaWithDefault.default === 'boolean') value = envVal.toLowerCase() === 'true'
    }

    await AppConfigEntry.create({
      key,
      value,
      isSecret: meta.secret,
      description: 'description' in meta ? meta.description : undefined,
    })

    const display = meta.secret ? '***hidden***' : String(value)
    console.log(`  INSERT ${key} = ${display}`)
    inserted++
  }

  console.log(`\n[seed:config] Done. Inserted: ${inserted}, Skipped: ${skipped}`)
  await mongoose.disconnect()
}

seedFromEnv().catch((err) => {
  console.error('[seed:config] Fatal error:', err)
  process.exit(1)
})
