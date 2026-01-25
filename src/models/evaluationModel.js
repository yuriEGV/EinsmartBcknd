import mongoose from 'mongoose';

const evaluationSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Types.ObjectId, ref: 'Tenant', required: true },
    courseId: { type: mongoose.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true },
    type: {
        type: String,
        enum: ['formativa', 'sumativa', 'diagnostica'],
        default: 'sumativa'
    },
    maxScore: { type: Number, required: true, default: 7.0 },
    subjectId: { type: mongoose.Types.ObjectId, ref: 'Subject', required: true },
    period: { type: String, enum: ['1_semestre', '2_semestre', 'anual'], default: '1_semestre' },
    date: { type: Date, required: true },
}, { timestamps: true });

export default mongoose.model('Evaluation', evaluationSchema);


