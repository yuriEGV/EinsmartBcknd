import mongoose from 'mongoose';

const userNotificationSchema = new mongoose.Schema({
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
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: [
            'grade_change',
            'admin_day_request',
            'admin_day_update',
            'system',
            'planning_submitted',
            'planning_approved',
            'planning_rejected',
            'rubric_submitted',
            'rubric_approved',
            'rubric_rejected'
        ],
        default: 'system'
    },
    isRead: {
        type: Boolean,
        default: false
    },
    link: {
        type: String
    }
}, {
    timestamps: true
});

export default mongoose.model('UserNotification', userNotificationSchema);
