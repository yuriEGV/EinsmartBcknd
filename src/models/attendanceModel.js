import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
    {
        estudianteId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Estudiante',
            required: true
        },
        fecha: {
            type: Date,
            required: true
        },
        estado: {
            type: String,
            enum: ['presente', 'ausente', 'atraso', 'retiro_anticipado', 'justificado'],
            default: 'presente'
        },
        bloqueHorario: { type: String }, // e.g., "1st Block (08:00-09:30)"
        subjectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subject'
        },
        minutosAtraso: { type: Number, default: 0 },
        observacion: { type: String, default: '' },
        isSigned: { type: Boolean, default: false },
        signatureMetadata: {
            ip: String,
            userAgent: String,
            signedAt: Date,
            pinVerified: Boolean
        },
        tenantId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        registradoPor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    { timestamps: true }
);

export default mongoose.model('Attendance', attendanceSchema);
