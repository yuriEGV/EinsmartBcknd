import mongoose from 'mongoose';

const apoderadoSchema = new mongoose.Schema({
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
    nombre: {
        type: String,
        required: [true, 'El nombre es obligatorio'],
        trim: true
    },
    apellidos: {
        type: String,
        required: [true, 'Los apellidos son obligatorios'],
        trim: true
    },
    direccion: {
        type: String,
        trim: true,
        default: ''
    },
    telefono: {
        type: String,
        trim: true,
        default: ''
    },
    correo: {
        type: String,
        trim: true,
        lowercase: true,
        default: ''
    },
    tipo: {
        type: String,
        enum: ['principal', 'suplente'],
        required: [true, 'El tipo de apoderado es obligatorio'],
        default: 'principal'
    },
    parentesco: {
        type: String,
        trim: true,
        default: '' // ej: 'Padre', 'Madre', 'Tutor', etc.
    }
}, {
    timestamps: true
});

// Índice para evitar duplicados de apoderado principal por estudiante
apoderadoSchema.index({ estudianteId: 1, tipo: 1 }, { 
    unique: true,
    partialFilterExpression: { tipo: 'principal' }
});

export default mongoose.model('Apoderado', apoderadoSchema);

