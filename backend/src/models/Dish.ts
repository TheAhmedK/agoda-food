import { Schema, model, Document, Types } from 'mongoose'

/**
 * Allowed tags on a dish. Kept as a const tuple so it can be reused as a
 * TypeScript union and as a Mongoose enum at the same time.
 */
export const DISH_TAGS = ['Popular', 'Vegetarian', 'Vegan', 'Spicy', 'GlutenFree'] as const
export type DishTag = (typeof DISH_TAGS)[number]

export interface IDish extends Document {
  restaurantId: Types.ObjectId
  name: string
  description: string
  price: number // THB
  imageUrl: string
  category: string
  tags: DishTag[]
  // Soft-disable a dish without deleting it (e.g. 86'd for the day).
  // Orders can still reference disabled dishes; new orders cannot add them.
  isAvailable: boolean
  createdAt: Date
  updatedAt: Date
}

const DishSchema = new Schema<IDish>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    imageUrl: { type: String, required: true },
    category: { type: String, required: true },
    tags: {
      type: [{ type: String, enum: DISH_TAGS }],
      default: [],
    },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true },
)

// Primary access pattern: fetch the menu of a restaurant grouped by category.
DishSchema.index({ restaurantId: 1, category: 1 })
DishSchema.index({ restaurantId: 1, isAvailable: 1 })
// Useful for filtering the menu by tag (e.g. "show vegetarian dishes")
DishSchema.index({ restaurantId: 1, tags: 1 })

export const Dish = model<IDish>('Dish', DishSchema)
