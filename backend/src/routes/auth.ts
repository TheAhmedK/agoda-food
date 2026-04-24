import { Router, Request, Response } from 'express'
import { User } from '../models/User'

const router = Router()

/**
 * POST /api/auth/login
 * Body: { email }
 *
 * Dev-only "login" — looks up a user by email. Returns the user doc.
 * The client stores the user's id and sends it back via the x-user-id header.
 *
 * Stage 4 replaces this with POST /api/auth/line which verifies a LINE ID token
 * and upserts a User by lineUserId. The rest of the app stays unchanged.
 */
router.post('/login', async (req: Request<object, object, { email?: string }>, res: Response) => {
  const email = req.body.email?.trim().toLowerCase()
  if (!email) {
    res.status(400).json({ error: 'email is required' })
    return
  }

  try {
    const user = await User.findOne({ email })
    if (!user) {
      res.status(404).json({ error: `No user found for email "${email}"` })
      return
    }
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: 'Login failed' })
  }
})

export default router
