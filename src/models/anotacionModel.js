import mongoose from 'mongoose';

const anotacionSchema = new mongoose.Schema({
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
    creadoPor: {
        type: mongoose.Types.ObjectId,
        ref: 'User',
        required: true
    },
    tipo: {
        type: String,
        enum: ['positiva', 'negativa'],
        required: [true, 'El tipo de anotación es obligatorio']
    },
    titulo: {
        type: String,
        required: [true, 'El título es obligatorio'],
        trim: true
    },
    descripcion: {
        type: String,
        required: [true, 'La descripción es obligatoria'],
        trim: true
    },
    fecha: {
        type: Date,
        default: Date.now
    },
    fechaOcurrencia: {
        type: Date,
        default: Date.now
    },
    medidas: {
        type: String,
        trim: true,
        default: '' // Medidas tomadas o recomendaciones
    },
    archivos: [{
        type: String,
        trim: true
    }] // URLs de archivos adjuntos si es necesario
}, {
    timestamps: true
});

// Índice para búsquedas eficientes
anotacionSchema.index({ estudianteId: 1, fecha: -1 });
anotacionSchema.index({ tenantId: 1, tipo: 1 });

export default mongoose.model('Anotacion', anotacionSchema);

