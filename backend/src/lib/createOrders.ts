import { Types } from 'mongoose'
import { Restaurant, type IRestaurant } from '@models/Restaurant'
import { MenuItem } from '@models/MenuItem'
import { Order, type IOrderItem } from '@models/Order'
import { Batch } from '@models/Batch'
import {
  isValidServiceDateStr,
  isServingDay,
  isOrderableForDate,
  serviceDateToDate,
} from '@lib/orderWindow'
import { getPublicStorage } from '@lib/storage'

export interface OrderItemInput {
  menuItemId: string
  quantity: number
  note?: string
}

export interface BatchDayInput {
  serviceDate: string
  items: OrderItemInput[]
}

export interface BatchValidationError {
  serviceDate?: string
  error: string
  code?: string
}

async function resolveItems(
  restaurantId: Types.ObjectId,
  items: OrderItemInput[],
): Promise<IOrderItem[] | BatchValidationError> {
  const menuItemIds = items.map((i) => i.menuItemId)
  const menuItems = await MenuItem.find({
    _id: { $in: menuItemIds },
    restaurantId,
    isAvailable: true,
  })
  const menuItemMap = new Map(menuItems.map((m) => [m._id.toString(), m]))

  const resolvedItems: IOrderItem[] = []
  for (const input of items) {
    const menuItem = menuItemMap.get(input.menuItemId)
    if (!menuItem) {
      return {
        error: `Menu item ${input.menuItemId} not available for this restaurant`,
      }
    }
    if (!Number.isInteger(input.quantity) || input.quantity < 1) {
      return {
        error: `Quantity must be a positive integer for ${menuItem.name}`,
      }
    }
    resolvedItems.push({
      menuItemId: menuItem._id,
      name: menuItem.name,
      price: menuItem.price,
      imageUrl: menuItem.imageKey
        ? getPublicStorage().publicUrl(menuItem.imageKey)
        : undefined,
      quantity: input.quantity,
      note: input.note ?? '',
    })
  }
  return resolvedItems
}

function validateDay(
  restaurant: IRestaurant,
  serviceDate: string,
  items: OrderItemInput[],
  now: Date,
): BatchValidationError | null {
  if (!isValidServiceDateStr(serviceDate)) {
    return { serviceDate, error: 'serviceDate must be YYYY-MM-DD' }
  }
  if (!isServingDay(restaurant.servingDays, serviceDate)) {
    return {
      serviceDate,
      error: `${restaurant.name} is not serving on this day`,
      code: 'NOT_SERVING_DAY',
    }
  }
  if (!isOrderableForDate(restaurant.orderWindow, serviceDate, now)) {
    return {
      serviceDate,
      error: `Ordering for ${serviceDate} is closed`,
      code: 'ORDER_WINDOW_CLOSED',
    }
  }
  if (!Array.isArray(items) || items.length === 0) {
    return { serviceDate, error: 'At least one item is required per day' }
  }
  return null
}

export async function createOrderBatch(params: {
  userId: Types.ObjectId
  restaurantId: string
  days: BatchDayInput[]
  now?: Date
}): Promise<
  | { batchId: string; orders: ReturnType<typeof Order.prototype.toObject>[]; grandTotal: number }
  | { errors: BatchValidationError[] }
> {
  const now = params.now ?? new Date()
  const { userId, restaurantId, days } = params

  if (!restaurantId || !Array.isArray(days) || days.length === 0) {
    return { errors: [{ error: 'restaurantId and at least one day are required' }] }
  }

  const restaurant = await Restaurant.findById(restaurantId)
  if (!restaurant) {
    return { errors: [{ error: 'Restaurant not found' }] }
  }
  if (restaurant.status !== 'active' || !restaurant.isOpen) {
    return { errors: [{ error: 'Restaurant is not accepting orders' }] }
  }
  if (!restaurant.promptPayPayload) {
    return {
      errors: [{
        error: 'Restaurant has not set up payment yet. Please try again later.',
        code: 'PAYMENT_NOT_CONFIGURED',
      }],
    }
  }

  const errors: BatchValidationError[] = []
  const prepared: { serviceDate: string; items: IOrderItem[]; subtotal: number; total: number }[] = []

  for (const day of days) {
    const dayErr = validateDay(restaurant, day.serviceDate, day.items, now)
    if (dayErr) {
      errors.push(dayErr)
      continue
    }

    const resolved = await resolveItems(restaurant._id, day.items)
    if (!Array.isArray(resolved)) {
      errors.push({ serviceDate: day.serviceDate, error: resolved.error, code: resolved.code })
      continue
    }

    const subtotal = resolved.reduce((sum, i) => sum + i.price * i.quantity, 0)
    const deliveryFee = restaurant.deliveryFee
    const total = subtotal + deliveryFee

    if (subtotal < restaurant.minOrder) {
      errors.push({
        serviceDate: day.serviceDate,
        error: `Subtotal ฿${subtotal} is below the minimum order ฿${restaurant.minOrder}`,
        code: 'BELOW_MIN_ORDER',
      })
      continue
    }

    prepared.push({
      serviceDate: day.serviceDate,
      items: resolved,
      subtotal,
      total,
    })
  }

  if (errors.length > 0) {
    return { errors }
  }
  if (prepared.length === 0) {
    return { errors: [{ error: 'No valid days to order' }] }
  }

  const batch = await Batch.create({
    userId,
    restaurantId: restaurant._id,
    orderIds: [],
    grandTotal: 0,
    status: 'awaiting_payment',
  })

  const orderDocs = []
  let grandTotal = 0

  for (const day of prepared) {
    const serviceDate = serviceDateToDate(
      day.serviceDate,
      restaurant.orderWindow.deliveryHour ?? 12,
    )
    const order = await Order.create({
      userId,
      restaurantId: restaurant._id,
      restaurantName: restaurant.name,
      items: day.items,
      subtotal: day.subtotal,
      deliveryFee: restaurant.deliveryFee,
      total: day.total,
      status: 'awaiting_payment',
      paymentStatus: 'unpaid',
      serviceDate,
      batchId: batch._id,
    })
    orderDocs.push(order)
    grandTotal += day.total
  }

  batch.orderIds = orderDocs.map((o) => o._id as Types.ObjectId)
  batch.grandTotal = grandTotal
  await batch.save()

  return {
    batchId: batch._id.toString(),
    orders: orderDocs.map((o) => o.toObject()),
    grandTotal,
  }
}
