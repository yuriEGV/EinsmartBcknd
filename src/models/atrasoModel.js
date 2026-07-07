import mongoose from 'mongoose';

const atrasoSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    estudianteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Estudiante',
        required: true
    },
    fecha: {
        type: Date,
        required: true
    },
    bloque: {
        type: String,
        enum: ['Bloque 1', 'Bloque 2', 'Bloque 3', 'Bloque 4', 'Bloque 5'],
        required: true
    },
    minutosAtraso: {
        type: Number,
        required: true,
        default: 0
    },
    motivo: {
        type: String,
        default: ''
    },
    estado: {
         type: String,
         enum: ['justificado', 'injustificado'],
         default: 'injustificado'
    },
    registradoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    academicYear: {
        type: Number,
        required: true,
        default: () => new Date().getFullYear()
    }
}, { timestamps: true });

export default mongoose.model('Atraso', atrasoSchema);
