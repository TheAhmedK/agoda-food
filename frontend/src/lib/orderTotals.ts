/** Per-day delivery fee and minimum subtotal for a multi-day pre-order cart. */
export function computeOrderTotals(params: {
  dates: string[]
  subtotal: number
  subtotalForDate: (date: string) => number
  deliveryFeePerDay: number
  minOrder: number
}) {
  const { dates, subtotal, subtotalForDate, deliveryFeePerDay, minOrder } = params
  const lunchCount = dates.length
  const totalDeliveryFee = deliveryFeePerDay * lunchCount
  const grandTotal = subtotal + totalDeliveryFee
  const daysBelowMinOrder = dates.filter((d) => subtotalForDate(d) < minOrder)

  return {
    lunchCount,
    deliveryFeePerDay,
    totalDeliveryFee,
    grandTotal,
    minOrder,
    daysBelowMinOrder,
    meetsMinOrder: daysBelowMinOrder.length === 0,
  }
}
