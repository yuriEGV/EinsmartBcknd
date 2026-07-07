import mongoose from 'mongoose';

const tariffSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true },
  description: { type: String },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Tariff', tariffSchema);
