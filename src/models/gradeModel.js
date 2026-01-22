import mongoose from 'mongoose';

const gradeSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Types.ObjectId, ref: 'Tenant', required: true },
    evaluationId: { type: mongoose.Types.ObjectId, ref: 'Evaluation', required: true },
    estudianteId: { type: mongoose.Types.ObjectId, ref: 'Estudiante', required: true },
    score: { type: Number, required: true },
}, { timestamps: true });

export default mongoose.model('Grade', gradeSchema);


