import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
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
    grade: {
        type: String
    },
    questionText: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['multiple_choice', 'open', 'true_false'],
        default: 'multiple_choice'
    },
    options: [{
        text: String,
        isCorrect: Boolean
    }],
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'approved'
    },
    tags: [String],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

export default mongoose.model('Question', questionSchema);
