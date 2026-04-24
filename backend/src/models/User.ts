import { Schema, model, Document } from 'mongoose'

export interface IUser extends Document {
  // Populated by LINE login in Stage 4. Kept optional now so dev users don't need one.
  lineUserId?: string
  displayName: string
  email: string
  phone: string
  pictureUrl?: string
  deliveryLocation?: string
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    lineUserId: {
      type: String,
      unique: true,
      sparse: true, // allows many docs without it while keeping uniqueness when present
    },
    displayName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    phone: { type: String, required: true, trim: true },
    pictureUrl: { type: String },
    deliveryLocation: { type: String, trim: true },
  },
  { timestamps: true },
)

export const User = model<IUser>('User', UserSchema)
