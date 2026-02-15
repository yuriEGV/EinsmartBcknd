import mongoose from 'mongoose';

const citacionSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    estudianteId: {
        type: mongoose.Types.ObjectId,
        ref: 'Estudiante',
        required: true
    },
    apoderadoId: {
        type: mongoose.Types.ObjectId,
        ref: 'Apoderado',
        required: true
    },
    profesorId: {
        type: mongoose.Types.ObjectId,
        ref: 'User',
        required: true
    },
    fecha: {
        type: Date,
        required: true
    },
    hora: {
        type: String,
        required: true
    },
    motivo: {
        type: String,
        required: true,
        trim: true
    },
    anotacionId: {
        type: mongoose.Types.ObjectId,
        ref: 'Anotacion'
    },
    estado: {
        type: String,
        enum: ['propuesta', 'confirmada', 'rechazada', 'realizada', 'cancelada'],
        default: 'propuesta'
    },
    modalidad: {
        type: String,
        enum: ['presencial', 'online'],
        default: 'presencial'
    },
    linkMeeting: {
        type: String,
        trim: true
    },
    lugar: {
        type: String,
        default: 'Sala de Profesores'
    },
    observaciones: {
        type: String,
        default: ''
    },
    actaReunion: {
        type: String,
        default: ''
    },
    googleEventId: {
        type: String
    }
}, {
    timestamps: true
});

citacionSchema.index({ studentId: 1, fecha: -1 });

export default mongoose.model('Citacion', citacionSchema);
