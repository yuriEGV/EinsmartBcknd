
import mongoose from 'mongoose';

const careerSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    name: {
        type: String,
        required: [true, 'El nombre de la carrera es obligatorio'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    type: {
        type: String,
        enum: ['cientifico-humanista', 'tecnico-profesional'],
        default: 'cientifico-humanista'
    },
    code: {
        type: String,
        trim: true
    }
}, { timestamps: true });

// Avoid duplicate career names per tenant
careerSchema.index({ tenantId: 1, name: 1 }, { unique: true });

export default mongoose.model('Career', careerSchema);
