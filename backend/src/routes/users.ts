import { Router, Request, Response } from 'express'
import { User } from '../models/User'
import { Order } from '../models/Order'
import { requireUser } from '../middleware/auth'

const router = Router()

interface RegisterBody {
  displayName: string
  email: string
  phone: string
  deliveryLocation?: string
  pictureUrl?: string
}

/**
 * POST /api/users
 * Creates a new user. Used by the seed script now and by LINE login later
 * (Stage 4 will build a thin wrapper that extracts these fields from a LINE profile).
 */
router.post('/', async (req: Request<object, object, RegisterBody>, res: Response) => {
  const { displayName, email, phone, deliveryLocation, pictureUrl } = req.body

  if (!displayName || !email || !phone) {
    res.status(400).json({ error: 'displayName, email and phone are required' })
    return
  }

  try {
    const user = await User.create({ displayName, email, phone, deliveryLocation, pictureUrl })
    res.status(201).json(user)
  } catch (err) {
    const mongoErr = err as { code?: number; message?: string }
    if (mongoErr.code === 11000) {
      res.status(409).json({ error: 'email already in use' })
      return
    }
    res.status(400).json({ error: mongoErr.message ?? 'Failed to create user' })
  }
})

// GET /api/users/me
router.get('/me', requireUser, (req: Request, res: Response) => {
  res.json(req.user)
})

interface UpdateMeBody {
  displayName?: string
  email?: string
  phone?: string
  deliveryLocation?: string
  pictureUrl?: string
}

// PATCH /api/users/me — edit own profile. lineUserId is immutable.
router.patch('/me', requireUser, async (req: Request<object, object, UpdateMeBody>, res: Response) => {
  const allowed: (keyof UpdateMeBody)[] = [
    'displayName',
    'email',
    'phone',
    'deliveryLocation',
    'pictureUrl',
  ]
  const updates: Partial<UpdateMeBody> = {}
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key]
  }

  try {
    const updated = await User.findByIdAndUpdate(req.user!._id, updates, {
      new: true,
      runValidators: true,
    })
    res.json(updated)
  } catch (err) {
    const mongoErr = err as { code?: number; message?: string }
    if (mongoErr.code === 11000) {
      res.status(409).json({ error: 'email already in use' })
      return
    }
    res.status(400).json({ error: (err as Error).message })
  }
})

// GET /api/users/me/orders — my orders newest first, optional pagination
router.get('/me/orders', requireUser, async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100)
  const skip = Math.max(Number(req.query.skip) || 0, 0)
  try {
    const orders = await Order.find({ userId: req.user!._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
    res.json(orders)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' })
  }
})

export default router
