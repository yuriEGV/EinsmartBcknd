
import mongoose from 'mongoose';

const rubricSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject'
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String
    },
    levels: [{
        name: { type: String, required: true }, // e.g., "Destacado", "Logrado", "No Logrado"
        points: { type: Number, required: true }
    }],
    criteria: [{
        name: { type: String, required: true }, // e.g., "Ortografía", "Creatividad"
        descriptors: [{
            levelName: { type: String, required: true },
            text: { type: String, required: true }
        }]
    }]
}, { timestamps: true });

// Index for performance
rubricSchema.index({ tenantId: 1, teacherId: 1 });

export default mongoose.model('Rubric', rubricSchema);
