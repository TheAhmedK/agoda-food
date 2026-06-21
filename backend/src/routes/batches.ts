import { Router, Request, Response, NextFunction } from 'express'
import sharp from 'sharp'
import { randomUUID } from 'crypto'
import { requireUser } from '@middleware/auth'
import { Restaurant } from '@models/Restaurant'
import { Payment } from '@models/Payment'
import { renderQrDataUrl } from '@lib/promptPay'
import { getPrivateStorage } from '@lib/storage'
import { imageUpload } from '@lib/upload'
import { createOrderBatch, type BatchDayInput } from '@lib/createOrders'
import {
  loadBatchForUser,
  loadBatchOrders,
  syncBatchProofToOrders,
} from '@lib/batchPayment'
import { pushPaymentProofToMerchantForBatch } from '@services/linePaymentReview'

const PROOF_FILE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

const router = Router()

interface CreateBatchBody {
  restaurantId: string
  days: BatchDayInput[]
}

interface PromptPayPaymentResponse {
  qrImageUrl: string
  qrPayload: string
  amount: number
  currency: 'thb'
  paymentStatus: 'unpaid' | 'paid' | 'refunded'
  proofStatus?: 'pending' | 'verified' | 'rejected'
  proofUploadedAt?: Date
  batchId: string
  grandTotal: number
  orderIds: string[]
}

async function loadOwnedBatch(req: Request, res: Response) {
  const batch = await loadBatchForUser(req.params.id, req.user!._id)
  if (!batch) {
    res.status(404).json({ error: 'Batch not found' })
    return null
  }
  return batch
}

// POST /api/batches — create multiple day-orders in one checkout batch
router.post('/', requireUser, async (req: Request<object, object, CreateBatchBody>, res: Response) => {
  const user = req.user!

  if (!user.emailVerified) {
    res.status(409).json({
      error: 'Please verify your email before placing an order',
      code: 'EMAIL_VERIFICATION_REQUIRED',
    })
    return
  }

  try {
    const result = await createOrderBatch({
      userId: user._id,
      restaurantId: req.body.restaurantId,
      days: req.body.days,
    })

    if ('errors' in result) {
      res.status(409).json({ errors: result.errors })
      return
    }

    res.status(201).json(result)
  } catch (err) {
    console.error('[batches] create failed', err)
    res.status(500).json({ error: 'Failed to create order batch' })
  }
})

// GET /api/batches/:id — batch + orders for owner
router.get('/:id', requireUser, async (req: Request, res: Response) => {
  try {
    const batch = await loadOwnedBatch(req, res)
    if (!batch) return
    const orders = await loadBatchOrders(batch)
    res.json({
      ...batch.toObject(),
      orders: orders.map((o) => o.toObject()),
    })
  } catch (err) {
    console.error('[batches] get failed', err)
    res.status(500).json({ error: 'Failed to fetch batch' })
  }
})

// POST /api/batches/:id/pay — combined PromptPay QR
router.post('/:id/pay', requireUser, async (req: Request, res: Response) => {
  try {
    const batch = await loadOwnedBatch(req, res)
    if (!batch) return

    const orders = await loadBatchOrders(batch)
    if (orders.some((o) => o.paymentStatus === 'paid')) {
      res.status(409).json({ error: 'Batch is already paid' })
      return
    }
    if (batch.status === 'cancelled') {
      res.status(409).json({ error: 'Batch has been cancelled' })
      return
    }

    const restaurant = await Restaurant.findById(batch.restaurantId)
    if (!restaurant?.promptPayPayload) {
      res.status(409).json({
        error: 'Restaurant has not configured PromptPay payment',
        code: 'PAYMENT_NOT_CONFIGURED',
      })
      return
    }

    const qrImageUrl = await renderQrDataUrl(restaurant.promptPayPayload)
    const response: PromptPayPaymentResponse = {
      qrImageUrl,
      qrPayload: restaurant.promptPayPayload,
      amount: Math.round(batch.grandTotal * 100),
      currency: 'thb',
      paymentStatus: orders[0]?.paymentStatus ?? 'unpaid',
      proofStatus: batch.paymentProof?.status,
      proofUploadedAt: batch.paymentProof?.uploadedAt,
      batchId: batch._id.toString(),
      grandTotal: batch.grandTotal,
      orderIds: batch.orderIds.map((id) => id.toString()),
    }
    res.json(response)
  } catch (err) {
    console.error('[batches] pay failed', err)
    res.status(500).json({ error: 'Failed to generate payment QR' })
  }
})

// GET /api/batches/:id/payment
router.get('/:id/payment', requireUser, async (req: Request, res: Response) => {
  try {
    const batch = await loadOwnedBatch(req, res)
    if (!batch) return

    const restaurant = await Restaurant.findById(batch.restaurantId)
    if (!restaurant?.promptPayPayload) {
      res.status(404).json({ error: 'No payment configured' })
      return
    }

    const orders = await loadBatchOrders(batch)
    const qrImageUrl = await renderQrDataUrl(restaurant.promptPayPayload)
    const response: PromptPayPaymentResponse = {
      qrImageUrl,
      qrPayload: restaurant.promptPayPayload,
      amount: Math.round(batch.grandTotal * 100),
      currency: 'thb',
      paymentStatus: orders[0]?.paymentStatus ?? 'unpaid',
      proofStatus: batch.paymentProof?.status,
      proofUploadedAt: batch.paymentProof?.uploadedAt,
      batchId: batch._id.toString(),
      grandTotal: batch.grandTotal,
      orderIds: batch.orderIds.map((id) => id.toString()),
    }
    res.json(response)
  } catch (err) {
    console.error('[batches] payment get failed', err)
    res.status(500).json({ error: 'Failed to fetch payment session' })
  }
})

// POST /api/batches/:id/payment-proof
router.post(
  '/:id/payment-proof',
  requireUser,
  imageUpload.single('image'),
  async (req: Request, res: Response) => {
    try {
      const batch = await loadOwnedBatch(req, res)
      if (!batch) return

      const orders = await loadBatchOrders(batch)
      if (orders.some((o) => o.paymentStatus === 'paid')) {
        res.status(409).json({ error: 'Batch is already paid' })
        return
      }
      if (batch.status !== 'awaiting_payment' && batch.status !== 'pending_verification') {
        res.status(409).json({ error: 'Batch is not awaiting payment' })
        return
      }
      if (!req.file) {
        res.status(400).json({ error: 'image file is required' })
        return
      }

      const processed = await sharp(req.file.buffer)
        .rotate()
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer()

      const fileKey = `payment-proofs/batch-${batch._id}/${randomUUID()}.jpg`
      await getPrivateStorage().put(fileKey, processed, 'image/jpeg')

      const now = new Date()
      for (const order of orders) {
        await Payment.create({
          orderId: order._id,
          provider: 'promptpay_byo',
          amount: order.total,
          currency: 'THB',
          status: 'pending',
          fileKey,
          contentType: 'image/jpeg',
          sizeBytes: processed.length,
          expireFileAt: new Date(now.getTime() + PROOF_FILE_RETENTION_MS),
        })
      }

      batch.paymentProof = {
        fileKey,
        contentType: 'image/jpeg',
        sizeBytes: processed.length,
        uploadedAt: now,
        status: 'pending',
      }
      batch.status = 'pending_verification'
      await batch.save()

      await syncBatchProofToOrders(batch)

      pushPaymentProofToMerchantForBatch(batch, orders).catch((err) =>
        console.error('[batches] pushPaymentProofToMerchantForBatch failed:', err),
      )

      const refreshed = await loadBatchOrders(batch)
      res.json({
        ...batch.toObject(),
        orders: refreshed.map((o) => o.toObject()),
      })
    } catch (err) {
      console.error('[batches] payment-proof upload failed', err)
      res.status(500).json({ error: 'Failed to upload payment proof' })
    }
  },
)

// POST /api/batches/:id/cancel
router.post('/:id/cancel', requireUser, async (req: Request, res: Response) => {
  try {
    const batch = await loadOwnedBatch(req, res)
    if (!batch) return

    if (!['awaiting_payment', 'pending_verification'].includes(batch.status)) {
      res.status(409).json({ error: 'This batch can no longer be cancelled' })
      return
    }

    const orders = await loadBatchOrders(batch)
    const now = new Date()

    if (batch.paymentProof?.fileKey) {
      await Payment.updateMany(
        {
          orderId: { $in: batch.orderIds },
          provider: 'promptpay_byo',
          fileKey: batch.paymentProof.fileKey,
          status: 'pending',
        },
        {
          $set: {
            status: 'canceled',
            reviewedAt: now,
            expireFileAt: new Date(now.getTime() + PROOF_FILE_RETENTION_MS),
          },
        },
      )
      batch.paymentProof = undefined
    }

    batch.status = 'cancelled'
    await batch.save()

    await Promise.all(
      orders.map(async (order) => {
        order.status = 'cancelled'
        order.paymentProof = undefined
        await order.save()
      }),
    )

    res.json({
      ...batch.toObject(),
      orders: orders.map((o) => o.toObject()),
    })
  } catch (err) {
    console.error('[batches] cancel failed', err)
    res.status(500).json({ error: 'Failed to cancel batch' })
  }
})

router.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code: string }).code
    if (code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: 'File is too large (max 8 MB)' })
      return
    }
  }
  if (err instanceof Error) {
    res.status(400).json({ error: err.message })
    return
  }
  res.status(500).json({ error: 'Upload failed' })
})

export default router
