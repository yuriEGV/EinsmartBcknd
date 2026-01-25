import mongoose from 'mongoose';

const classLogSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    topic: {
        type: String,
        required: true
    },
    activities: {
        type: String,
        required: true
    },
    objectives: [{
        type: String // Codes or descriptions from Subjects matriz
    }],
    isSigned: {
        type: Boolean,
        default: false
    },
    signedAt: {
        type: Date
    },
    digitalSignaturePin: {
        type: String,
        select: false // Only for verification
    }
}, { timestamps: true });

// Ensure one log per teacher/subject/course per day (to avoid duplicates)
classLogSchema.index({ courseId: 1, subjectId: 1, date: 1 }, { unique: false });

export default mongoose.model('ClassLog', classLogSchema);
