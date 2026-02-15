import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema({
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
    dayOfWeek: {
        type: Number, // 0 (Sun) to 6 (Sat)
        required: true,
        min: 0,
        max: 6
    },
    startTime: {
        type: String, // format "HH:mm"
        required: true
    },
    endTime: {
        type: String, // format "HH:mm"
        required: true
    }
}, { timestamps: true });

// Index for quick lookup of current class
scheduleSchema.index({ tenantId: 1, courseId: 1, dayOfWeek: 1, startTime: 1 });

export default mongoose.model('Schedule', scheduleSchema);
