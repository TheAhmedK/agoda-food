import { MENU_ITEM_TAGS, type MenuItemTag } from '../data/types'

export { MENU_ITEM_TAGS, type MenuItemTag }

export const TAG_STYLES: Record<MenuItemTag, { label: string; classes: string }> = {
  Popular: { label: '⭐ Popular', classes: 'bg-brand-700 text-white' },
  Vegetarian: { label: '🥗 Veg', classes: 'bg-brand-550 text-white' },
  Vegan: { label: '🥕 Vegan', classes: 'bg-brand-500 text-white' },
  Spicy: { label: '🌶️ Spicy', classes: 'bg-brand-600 text-white' },
  GlutenFree: { label: 'Gluten Free', classes: 'bg-brand-100 text-brand-700' },
}
