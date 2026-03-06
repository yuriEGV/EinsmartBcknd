import mongoose from 'mongoose';

const alternanciaSchema = new mongoose.Schema({
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
    careerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Career'
    },
    empresaInstitucion: {
        type: String,
        required: true
    },
    tipo: {
        type: String,
        enum: ['empresa', 'CFT', 'IP', 'servicio_publico'],
        required: true
    },
    fechaInicio: {
        type: Date,
        required: true
    },
    fechaTermino: {
        type: Date
    },
    estado: {
        type: String,
        enum: ['activa', 'completada', 'cancelada'],
        default: 'activa'
    },
    tutorEmpresa: {
        type: String,
        default: ''
    },
    profesorSupervisor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    observaciones: {
        type: String,
        default: ''
    }
}, { timestamps: true });

export default mongoose.model('Alternancia', alternanciaSchema);
