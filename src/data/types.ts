export interface MenuItem {
  id: string
  name: string
  description: string
  price: number // THB
  imageUrl: string
  category: string
  isPopular?: boolean
  isVegetarian?: boolean
}

export interface Restaurant {
  id: string
  name: string
  cuisine: string
  rating: number
  reviewCount: number
  deliveryTime: string // e.g. "15–25 min"
  deliveryFee: number // THB, 0 = free
  minOrder: number // THB
  imageUrl: string
  logoUrl: string
  tags: string[]
  isOpen: boolean
  menu: MenuItem[]
}

export interface CartItem {
  menuItem: MenuItem
  restaurantId: string
  restaurantName: string
  quantity: number
  note: string
}
