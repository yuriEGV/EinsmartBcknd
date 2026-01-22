import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Types.ObjectId, ref: 'Tenant', required: true },
    estudianteId: { type: mongoose.Types.ObjectId, ref: 'Estudiante', required: true },
    apoderadoId: { type: mongoose.Types.ObjectId, ref: 'Apoderado' },
    courseId: { type: mongoose.Types.ObjectId, ref: 'Course', required: true },
    period: { type: String, required: true },
    status: { type: String, enum: ['pendiente', 'confirmada', 'rechazada'], default: 'pendiente' },
    fee: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    documents: [{
        filename: { type: String },
        url: { type: String },
        mimeType: { type: String },
        size: { type: Number },
        uploadedAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

export default mongoose.model('Enrollment', enrollmentSchema);


