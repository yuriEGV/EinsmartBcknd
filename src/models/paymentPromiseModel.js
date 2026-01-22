import mongoose from 'mongoose';

const paymentPromiseSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Types.ObjectId, ref: 'Tenant', required: true },
    studentId: { type: mongoose.Types.ObjectId, ref: 'Estudiante', required: true },
    apoderadoId: { type: mongoose.Types.ObjectId, ref: 'Apoderado', required: true },
    enrollmentId: { type: mongoose.Types.ObjectId, ref: 'Enrollment' }, // Linked enrollment if successful

    amount: { type: Number, required: true },
    promiseDate: { type: Date, required: true }, // When they promise to pay

    status: {
        type: String,
        enum: ['active', 'fulfilled', 'broken', 'cancelled'],
        default: 'active'
    },

    createdBy: { type: mongoose.Types.ObjectId, ref: 'User', required: true }, // Sostenedor who authorized this
    notes: { type: String }

}, { timestamps: true });

export default mongoose.model('PaymentPromise', paymentPromiseSchema);
