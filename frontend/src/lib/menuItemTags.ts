import { MENU_ITEM_TAGS, type MenuItemTag } from '../data/types'

export { MENU_ITEM_TAGS, type MenuItemTag }

export const TAG_STYLES: Record<MenuItemTag, { label: string; classes: string }> = {
  Popular: { label: '⭐ Popular', classes: 'bg-brand-500 text-white' },
  Vegetarian: { label: '🌿 Veg', classes: 'bg-green-500 text-white' },
  Vegan: { label: '🌱 Vegan', classes: 'bg-emerald-600 text-white' },
  Spicy: { label: '🌶️ Spicy', classes: 'bg-red-500 text-white' },
  GlutenFree: { label: 'GF', classes: 'bg-amber-500 text-white' },
}
