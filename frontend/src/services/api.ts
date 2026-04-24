import type { Restaurant, RestaurantWithMenu, Dish, DishTag, Order, User } from '../data/types'
import { DISH_TAGS } from '../data/types'

const BASE = '/api'

// The currently-signed-in user id, injected as an x-user-id header on every
// request. Set by the user store after login; cleared on logout.
// Stage 4 replaces this with a real LINE-issued token, but the wiring stays put.
let currentUserId: string | null = null

export function setAuthUserId(id: string | null) {
  currentUserId = id
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (currentUserId) headers['X-User-Id'] = currentUserId

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const err = new Error(body.error ?? `Request failed: ${res.status}`) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return res.json()
}

// Mongoose returns _id; normalise to id everywhere so UI code never sees raw DB fields.
function toDish(d: Record<string, unknown>): Dish {
  const rawTags = Array.isArray(d.tags) ? (d.tags as string[]) : []
  const tags = rawTags.filter((t): t is DishTag => (DISH_TAGS as readonly string[]).includes(t))
  return {
    id: d._id as string,
    restaurantId: d.restaurantId as string,
    name: d.name as string,
    description: d.description as string,
    price: d.price as number,
    imageUrl: d.imageUrl as string,
    category: d.category as string,
    tags,
    isAvailable: (d.isAvailable as boolean | undefined) ?? true,
  }
}

function toRestaurant(r: Record<string, unknown>): Restaurant {
  return {
    id: r._id as string,
    name: r.name as string,
    cuisine: r.cuisine as string,
    rating: r.rating as number,
    reviewCount: r.reviewCount as number,
    deliveryTime: r.deliveryTime as string,
    deliveryFee: r.deliveryFee as number,
    minOrder: r.minOrder as number,
    imageUrl: r.imageUrl as string,
    logoUrl: r.logoUrl as string,
    tags: r.tags as string[],
    isOpen: r.isOpen as boolean,
  }
}

function toOrder(o: Record<string, unknown>): Order {
  return {
    id: o._id as string,
    userId: o.userId as string,
    restaurantId: o.restaurantId as string,
    restaurantName: o.restaurantName as string,
    items: o.items as Order['items'],
    subtotal: o.subtotal as number,
    deliveryFee: o.deliveryFee as number,
    total: o.total as number,
    status: o.status as Order['status'],
    createdAt: o.createdAt as string,
  }
}

function toUser(u: Record<string, unknown>): User {
  return {
    id: u._id as string,
    displayName: u.displayName as string,
    email: u.email as string,
    phone: u.phone as string,
    pictureUrl: u.pictureUrl as string | undefined,
    deliveryLocation: u.deliveryLocation as string | undefined,
  }
}

export async function fetchRestaurants(): Promise<Restaurant[]> {
  const data = await request<Record<string, unknown>[]>('/restaurants')
  return data.map(toRestaurant)
}

// Hits both the restaurant and its menu endpoints in parallel so the
// RestaurantPage only waits for one round-trip.
export async function fetchRestaurantWithMenu(id: string): Promise<RestaurantWithMenu> {
  const [restaurantRaw, dishesRaw] = await Promise.all([
    request<Record<string, unknown>>(`/restaurants/${id}`),
    request<Record<string, unknown>[]>(`/restaurants/${id}/menu`),
  ])
  return { ...toRestaurant(restaurantRaw), menu: dishesRaw.map(toDish) }
}

export interface PlaceOrderPayload {
  restaurantId: string
  items: { dishId: string; quantity: number; note?: string }[]
}

export async function placeOrder(payload: PlaceOrderPayload): Promise<Order> {
  const data = await request<Record<string, unknown>>('/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return toOrder(data)
}

export async function fetchOrder(id: string): Promise<Order> {
  const data = await request<Record<string, unknown>>(`/orders/${id}`)
  return toOrder(data)
}

// --- Auth + user ---

export async function login(email: string): Promise<User> {
  const data = await request<Record<string, unknown>>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
  return toUser(data)
}

export async function fetchMe(): Promise<User> {
  const data = await request<Record<string, unknown>>('/users/me')
  return toUser(data)
}

export interface UpdateProfilePayload {
  displayName?: string
  email?: string
  phone?: string
  deliveryLocation?: string
}

export async function updateMe(payload: UpdateProfilePayload): Promise<User> {
  const data = await request<Record<string, unknown>>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return toUser(data)
}

export async function fetchMyOrders(): Promise<Order[]> {
  const data = await request<Record<string, unknown>[]>('/users/me/orders')
  return data.map(toOrder)
}
