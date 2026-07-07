
import mongoose from 'mongoose';

const planningSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['anual', 'unidad', 'clase', 'material', 'evaluacion'],
        default: 'unidad'
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String
    },
    objectives: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Objective'
    }],
    activities: {
        type: String
    },
    strategies: {
        type: String
    },
    status: {
        type: String,
        enum: ['draft', 'submitted', 'approved', 'rejected'],
        default: 'draft'
    },
    feedback: {
        type: String
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    unitNumber: {
        type: Number
    },
    startDate: {
        type: Date
    },
    endDate: {
        type: Date
    },
    rubricId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Rubric'
    }
}, { timestamps: true });

// Faster lookups for teachers and UTP
planningSchema.index({ tenantId: 1, subjectId: 1, teacherId: 1 });
planningSchema.index({ tenantId: 1, status: 1 });

export default mongoose.model('Planning', planningSchema);
