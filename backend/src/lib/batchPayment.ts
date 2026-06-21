import { Types } from 'mongoose'
import { Batch, type IBatch } from '@models/Batch'
import { Order, type IOrder } from '@models/Order'
import { Payment } from '@models/Payment'

const PROOF_FILE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

export async function loadBatchForUser(
  batchId: string,
  userId: Types.ObjectId,
): Promise<IBatch | null> {
  return Batch.findOne({ _id: batchId, userId })
}

export async function loadBatchOrders(batch: IBatch): Promise<IOrder[]> {
  return Order.find({ _id: { $in: batch.orderIds } }).sort({ serviceDate: 1 })
}

/** Mirror batch proof onto each order so existing merchant UI keeps working. */
export async function syncBatchProofToOrders(batch: IBatch): Promise<void> {
  if (!batch.paymentProof) return
  await Order.updateMany(
    { _id: { $in: batch.orderIds } },
    {
      $set: {
        paymentProof: batch.paymentProof,
        status: 'pending_verification',
      },
    },
  )
}

export async function confirmBatchPayment(batch: IBatch, now = new Date()): Promise<void> {
  const fileKey = batch.paymentProof?.fileKey
  if (!fileKey) return

  const expireFileAt = new Date(now.getTime() + PROOF_FILE_RETENTION_MS)

  await Payment.updateMany(
    {
      orderId: { $in: batch.orderIds },
      provider: 'promptpay_byo',
      fileKey,
      status: 'pending',
    },
    {
      $set: {
        status: 'paid',
        reviewedAt: now,
        paidAt: now,
        reviewerNote: '',
        expireFileAt,
      },
    },
  )

  batch.status = 'confirmed'
  if (batch.paymentProof) {
    batch.paymentProof.status = 'verified'
    batch.paymentProof.reviewedAt = now
    batch.paymentProof.reviewerNote = ''
  }
  await batch.save()

  await Order.updateMany(
    { _id: { $in: batch.orderIds } },
    {
      $set: {
        status: 'confirmed',
        paymentStatus: 'paid',
        'paymentProof.status': 'verified',
        'paymentProof.reviewedAt': now,
        'paymentProof.reviewerNote': '',
      },
    },
  )
}

export async function rejectBatchPayment(
  batch: IBatch,
  mode: 'request_new' | 'cancel',
  reason: string,
  now = new Date(),
): Promise<void> {
  const fileKey = batch.paymentProof?.fileKey
  if (!fileKey) return

  const expireFileAt = new Date(now.getTime() + PROOF_FILE_RETENTION_MS)

  await Payment.updateMany(
    {
      orderId: { $in: batch.orderIds },
      provider: 'promptpay_byo',
      fileKey,
      status: 'pending',
    },
    {
      $set: {
        status: 'rejected',
        reviewedAt: now,
        reviewerNote: reason,
        expireFileAt,
      },
    },
  )

  if (batch.paymentProof) {
    batch.paymentProof.status = 'rejected'
    batch.paymentProof.reviewedAt = now
    batch.paymentProof.reviewerNote = reason
  }

  if (mode === 'cancel') {
    batch.status = 'cancelled'
  } else {
    batch.status = 'awaiting_payment'
    batch.paymentProof = undefined
  }
  await batch.save()

  const orderStatus = mode === 'cancel' ? 'cancelled' : 'awaiting_payment'
  const proofSnapshot =
    mode === 'cancel' && batch.paymentProof
      ? batch.paymentProof
      : undefined

  await Order.updateMany(
    { _id: { $in: batch.orderIds } },
    {
      $set: {
        status: orderStatus,
        paymentProof: proofSnapshot,
      },
    },
  )
}

export async function findBatchByOrderId(orderId: Types.ObjectId): Promise<IBatch | null> {
  const order = await Order.findById(orderId).select('batchId').lean()
  if (!order?.batchId) return null
  return Batch.findById(order.batchId)
}
