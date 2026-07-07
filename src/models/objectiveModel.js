
import mongoose from 'mongoose';

const objectiveSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    subjectId: {
        type: mongoose.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    code: {
        type: String,
        required: true, // e.g., OA 01, OA 05
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    period: {
        type: String, // e.g., "Primer Semestre", "Segundo Semestre"
        default: 'Anual'
    },
    active: {
        type: Boolean,
        default: true
    },
    covered: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// index for faster lookups
objectiveSchema.index({ tenantId: 1, subjectId: 1 });

export default mongoose.model('Objective', objectiveSchema);
