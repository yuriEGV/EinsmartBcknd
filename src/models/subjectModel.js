
import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    name: {
        type: String,
        required: [true, 'El nombre de la asignatura es obligatorio'],
        trim: true
    },
    courseId: {
        type: mongoose.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    teacherId: {
        type: mongoose.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Avoid duplicate subjects in the same course (e.g. 2 "Matemáticas" in "1°A")
subjectSchema.index({ tenantId: 1, courseId: 1, name: 1 }, { unique: true });

export default mongoose.model('Subject', subjectSchema);
