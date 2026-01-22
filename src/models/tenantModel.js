import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    domain: { type: String, require: false },
    theme: {
        primaryColor: { type: String, default: '#3b82f6' },
        secondaryColor: { type: String, default: '#1e293b' },
        logoUrl: { type: String }
    },
    paymentType: {
        type: String,
        enum: ['paid', 'free'],
        default: 'paid',
        required: true
    },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    contactEmail: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('Tenant', tenantSchema);


