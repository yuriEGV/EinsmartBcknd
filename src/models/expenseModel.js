const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    description: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['Mantenimiento', 'Recursos Humanos', 'Servicios Básicos', 'PME', 'ADECO', 'Otros']
    },
    date: {
        type: Date,
        default: Date.now
    },
    type: {
        type: String,
        enum: ['Normal', 'PME', 'ADECO'],
        default: 'Normal'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Expense', expenseSchema);
