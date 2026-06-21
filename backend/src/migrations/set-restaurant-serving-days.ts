/**
 * Backfill servingDays for existing restaurants (Mon–Fri).
 * Run with: npm run migrate
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { Restaurant } from '@models/Restaurant'

const MONGODB_URI = 'mongodb://localhost:27017/agoda-food'

/** 0=Sun … 6=Sat — Monday through Friday */
const DEFAULT_SERVING_DAYS = [1, 2, 3, 4, 5]

async function migrate() {
  await mongoose.connect(MONGODB_URI)
  console.log('Connected to MongoDB')

  const result = await Restaurant.updateMany(
    {
      $or: [
        { servingDays: { $exists: false } },
        { servingDays: null },
        { servingDays: { $size: 0 } },
      ],
    },
    { $set: { servingDays: DEFAULT_SERVING_DAYS } },
  )

  console.log(
    `Updated ${result.modifiedCount} restaurant(s) to Mon–Fri (${DEFAULT_SERVING_DAYS.join(', ')})`,
  )
  console.log(`Matched ${result.matchedCount} restaurant(s)`)

  await mongoose.disconnect()
  console.log('Done')
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
