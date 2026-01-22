import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
    action: { type: String, required: true }, // e.g., 'DELETE_GRADE', 'UPDATE_USER'
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    entityType: { type: String, required: true }, // 'Grade', 'User', etc.
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    details: { type: Object }, // Store the old data or specific changes
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true }
}, { timestamps: true });

export default mongoose.model('AuditLog', auditLogSchema);
