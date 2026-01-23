import mongoose from 'mongoose';

const payrollPaymentSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    userId: {
        type: mongoose.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'CLP' // Por defecto, pesos chilenos
    },
    paymentDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    period: {
        type: String, // Ej: '2026-01' para enero de 2026
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'paid', ''cancelled'],
        default: 'pending'
    },
    concept: {
        type: String,
        trim: true
    },
    // Opcional: Referencia a un contrato de salario si se implementa un módulo de contratos
    // contractId: { type: mongoose.Types.ObjectId, ref: 'Contract' }
}, { timestamps: true });

export default mongoose.model('PayrollPayment', payrollPaymentSchema);
