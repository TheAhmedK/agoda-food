import { Request, Response, NextFunction } from 'express'
import { Types } from 'mongoose'
import { User, IUser } from '../models/User'

// Augment Express.Request so req.user is typed on protected routes.
declare global {
  namespace Express {
    interface Request {
      user?: IUser
    }
  }
}

/**
 * Stub auth used until Stage 4 (LINE login).
 * Reads the current user id from the `x-user-id` header.
 *
 * When LINE login ships, this file is the single place that changes:
 * it starts verifying a LIFF id-token / JWT and populates req.user from that.
 * Every route stays the same.
 */
async function resolveUserFromHeader(req: Request): Promise<IUser | null> {
  const raw = req.header('x-user-id')
  if (!raw || !Types.ObjectId.isValid(raw)) return null
  return User.findById(raw)
}

// Rejects the request if no valid user is authenticated.
export async function requireUser(req: Request, res: Response, next: NextFunction) {
  const user = await resolveUserFromHeader(req)
  if (!user) {
    res.status(401).json({ error: 'Sign in required' })
    return
  }
  req.user = user
  next()
}

// Attaches req.user if a valid id is provided but never blocks the request.
// Used for endpoints that behave differently for guests vs signed-in users.
export async function optionalUser(req: Request, _res: Response, next: NextFunction) {
  const user = await resolveUserFromHeader(req).catch(() => null)
  if (user) req.user = user
  next()
}
