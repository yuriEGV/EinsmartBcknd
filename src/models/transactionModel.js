import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Types.ObjectId, ref: 'Tenant', required: true },
  paymentId: { type: mongoose.Types.ObjectId, ref: 'Payment' },
  provider: { type: String },
  providerEventId: { type: String },
  payload: { type: Object },
  status: { type: String, enum: ['received','processed','failed'], default: 'received' },
  processedAt: { type: Date },
}, { timestamps: true });

export default mongoose.model('Transaction', transactionSchema);
