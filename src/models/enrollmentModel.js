import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Types.ObjectId, ref: 'Tenant', required: true },
    estudianteId: { type: mongoose.Types.ObjectId, ref: 'Estudiante', required: true },
    apoderadoId: { type: mongoose.Types.ObjectId, ref: 'Apoderado' },
    courseId: { type: mongoose.Types.ObjectId, ref: 'Course', required: true },
    period: { type: String, required: true },
    status: { type: String, enum: ['pendiente', 'confirmada', 'rechazada', 'activo', 'activa', 'pre-matricula', 'inscrito'], default: 'confirmada' },
    fee: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    documents: [{
        filename: { type: String },
        url: { type: String },
        mimeType: { type: String },
        size: { type: Number },
        uploadedAt: { type: Date, default: Date.now }
    }],
    documentacionAportada: {
        identidadEstudiante: { type: Boolean, default: false },
        identidadApoderado: { type: Boolean, default: false },
        antecedentesAcademicos: { type: Boolean, default: false },
        comprobanteSAE: { type: Boolean, default: false },
        poderSimple: { type: Boolean, default: false }
    }
}, { timestamps: true });

// Índices únicos para evitar duplicados por periodo y tenant
enrollmentSchema.index({ tenantId: 1, estudianteId: 1, period: 1 }, { unique: true });

export default mongoose.model('Enrollment', enrollmentSchema);


