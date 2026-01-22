import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    title: {
        type: String,
        required: [true, 'El título es obligatorio'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    date: {
        type: Date,
        required: [true, 'La fecha es obligatoria']
    },
    location: {
        type: String,
        trim: true
    },
    type: {
        type: String,
        enum: ['evento', 'reunion', 'otro'],
        default: 'evento'
    },
    target: {
        type: String,
        enum: ['global', 'grado', 'curso'],
        default: 'global'
    },
    targetId: {
        type: String, // '1A', '2B', or Grade Name
        default: null
    },
    creadoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

export default mongoose.model('Event', eventSchema);
