import mongoose from 'mongoose';

const alternanciaLocationSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    alternanciaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Alternancia', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    accuracy: { type: Number },
    numeroChip: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('AlternanciaLocation', alternanciaLocationSchema);
