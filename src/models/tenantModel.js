import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    domain: { type: String, require: false, trim: true, lowercase: true },
    theme: {
        primaryColor: { type: String, default: '#3b82f6', trim: true },
        secondaryColor: { type: String, default: '#1e293b', trim: true },
        logoUrl: { type: String, trim: true }
    },
    paymentType: {
        type: String,
        enum: ['paid', 'free'],
        default: 'paid',
        required: true
    },
    address: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    contactEmail: { type: String, default: '', trim: true, lowercase: true },
    annualFee: { type: Number, default: 0 },
    academicYear: { type: String, default: new Date().getFullYear().toString() }
}, { timestamps: true });

export default mongoose.model('Tenant', tenantSchema);
