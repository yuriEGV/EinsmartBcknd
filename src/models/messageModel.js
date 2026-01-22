import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Types.ObjectId, ref: 'Tenant', required: true },
    senderId: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true },
    type: { type: String, enum: ['direct', 'system'], default: 'direct' },
    status: { type: String, enum: ['sent', 'read'], default: 'sent' },
    subject: { type: String, trim: true }
}, { timestamps: true });

export default mongoose.model('Message', messageSchema);
