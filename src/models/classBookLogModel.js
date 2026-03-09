import mongoose from 'mongoose';

const classBookLogSchema = new mongoose.Schema({
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
    courseId: {
        type: mongoose.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    action: {
        type: String,
        enum: ['view', 'edit', 'sign'],
        default: 'view'
    },
    details: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

classBookLogSchema.index({ tenantId: 1, createdAt: -1 });
classBookLogSchema.index({ courseId: 1, createdAt: -1 });

export default mongoose.model('ClassBookLog', classBookLogSchema);
