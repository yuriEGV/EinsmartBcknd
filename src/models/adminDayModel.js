import mongoose from 'mongoose';

const adminDaySchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    userId: {
        type: mongoose.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: [true, 'La fecha es obligatoria']
    },
    type: {
        type: String,
        enum: ['completo', 'media_tarde', 'media_mañana'],
        default: 'completo'
    },
    status: {
        type: String,
        enum: ['pendiente', 'aprobado', 'rechazado'],
        default: 'pendiente'
    },
    reason: {
        type: String,
        trim: true,
        maxlength: 500
    },
    reviewedBy: {
        type: mongoose.Types.ObjectId,
        ref: 'User'
    },
    reviewDate: {
        type: Date
    },
    rejectionReason: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Avoid duplicate requests for the same day/user
adminDaySchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model('AdminDay', adminDaySchema);
