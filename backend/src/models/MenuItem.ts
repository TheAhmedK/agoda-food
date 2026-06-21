import { Schema, model, Document, Types } from 'mongoose'

export const MENU_ITEM_TAGS = ['Popular', 'Vegetarian', 'Vegan', 'Spicy', 'GlutenFree'] as const
export type MenuItemTag = (typeof MENU_ITEM_TAGS)[number]

export interface ISpecialDishAvailability {
  deliveryDate: string
  orderOpens: string
  orderCloses: string
}

export interface IMenuItem extends Document {
  restaurantId: Types.ObjectId
  name: string
  description: string
  price: number // THB
  imageKey?: string
  category?: string
  tags: MenuItemTag[]
  isAvailable: boolean
  isSpecialDish: boolean
  /** Pre-order window for promotional dishes; null for regular menu items. */
  availability: ISpecialDishAvailability | null
  createdAt: Date
  updatedAt: Date
}

const MenuItemSchema = new Schema<IMenuItem>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    imageKey: { type: String },
    category: { type: String, default: '' },
    tags: {
      type: [{ type: String, enum: MENU_ITEM_TAGS }],
      default: [],
    },
    isAvailable: { type: Boolean, default: true },
    isSpecialDish: { type: Boolean, default: false },
    availability: {
      type: {
        deliveryDate: { type: String, required: true },
        orderOpens: { type: String, required: true },
        orderCloses: { type: String, required: true },
      },
      default: null,
    },
  },
  { timestamps: true },
)

MenuItemSchema.index({ restaurantId: 1, category: 1 })
MenuItemSchema.index({ restaurantId: 1, isAvailable: 1 })
MenuItemSchema.index({ restaurantId: 1, tags: 1 })

export const MenuItem = model<IMenuItem>('MenuItem', MenuItemSchema)
