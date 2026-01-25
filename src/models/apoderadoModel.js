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
    },
    financialStatus: {
        type: String,
        enum: ['solvente', 'moroso', 'exento'],
        default: 'solvente'
    }
}, {
    timestamps: true
});

// Índice para evitar duplicados de apoderado principal por estudiante dentro del mismo Tenant
apoderadoSchema.index({ estudianteId: 1, tipo: 1, tenantId: 1 }, {
    unique: true,
    partialFilterExpression: { tipo: 'principal' }
});

// Método para sincronizar su estado financiero basado en deudas de sus pupilos
apoderadoSchema.statics.syncFinancialStatus = async function (apoderadoId) {
    const Payment = mongoose.model('Payment');
    const apoderado = await this.findById(apoderadoId);
    if (!apoderado) return;

    // Buscar si tiene algún pago pendiente QUE ESTÉ VENCIDO
    const hasDebt = await Payment.exists({
        apoderadoId: apoderado._id,
        status: { $in: ['pendiente', 'vencido', 'en_revision'] },
        fechaVencimiento: { $lt: new Date() }
    });

    apoderado.financialStatus = hasDebt ? 'moroso' : 'solvente';
    await apoderado.save();
    return apoderado.financialStatus;
};

export default mongoose.model('Apoderado', apoderadoSchema);

