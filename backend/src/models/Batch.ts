import { Schema, model, Document, Types } from 'mongoose'
import type { IPaymentProof, PaymentProofStatus } from '@models/Order'

export type BatchStatus =
  | 'awaiting_payment'
  | 'pending_verification'
  | 'confirmed'
  | 'cancelled'

export interface IBatch extends Document {
  userId: Types.ObjectId
  restaurantId: Types.ObjectId
  orderIds: Types.ObjectId[]
  grandTotal: number
  status: BatchStatus
  paymentProof?: IPaymentProof
  createdAt: Date
  updatedAt: Date
}

const PaymentProofSchema = new Schema<IPaymentProof>(
  {
    fileKey: { type: String, required: true },
    contentType: { type: String, required: true },
    sizeBytes: { type: Number, required: true, min: 0 },
    uploadedAt: { type: Date, required: true, default: Date.now },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'] satisfies PaymentProofStatus[],
      default: 'pending',
    },
    reviewedAt: { type: Date },
    reviewerNote: { type: String },
  },
  { _id: false },
)

const BatchSchema = new Schema<IBatch>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    orderIds: [{ type: Schema.Types.ObjectId, ref: 'Order' }],
    grandTotal: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['awaiting_payment', 'pending_verification', 'confirmed', 'cancelled'],
      default: 'awaiting_payment',
    },
    paymentProof: { type: PaymentProofSchema },
  },
  { timestamps: true },
)

export const Batch = model<IBatch>('Batch', BatchSchema)
