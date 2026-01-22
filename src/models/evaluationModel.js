import mongoose from 'mongoose';

const evaluationSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Types.ObjectId, ref: 'Tenant', required: true },
    courseId: { type: mongoose.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true },
    maxScore: { type: Number, required: true },
    subject: { type: String, required: true },
    date: { type: Date, required: true },
}, { timestamps: true });

export default mongoose.model('Evaluation', evaluationSchema);


