import mongoose from 'mongoose';

const medicalLicenseSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'userModel'
    },
    userModel: {
        type: String,
        required: true,
        enum: ['User', 'Estudiante'],
        default: 'User'
    },
    userType: {
        type: String,
        enum: ['Estudiante', 'Funcionario'],
        required: true
    },
    fechaInicio: {
        type: Date,
        required: true
    },
    fechaFin: {
        type: Date,
        required: true
    },
    diasReposo: {
        type: Number,
        required: true
    },
    tipo: {
        type: String,
        enum: ['Médica', 'Administrativa', 'Pre/Post Natal', 'Otro'],
        default: 'Médica'
    },
    estado: {
        type: String,
        enum: ['Pendiente', 'Aprobado', 'Rechazado'],
        default: 'Aprobado' // In many schools, once received it's considered valid unless rejected
    },
    documentoUrl: {
        type: String,
        default: ''
    },
    esElectronica: {
        type: Boolean,
        default: false
    },
    fechaEntrega: {
        type: Date,
        default: Date.now
    },
    observaciones: {
        type: String,
        default: ''
    },
    academicYear: {
        type: Number,
        required: true,
        default: () => new Date().getFullYear()
    }
}, { timestamps: true });

// Index for efficient overlap checks
medicalLicenseSchema.index({ userId: 1, fechaInicio: 1, fechaFin: 1 });
medicalLicenseSchema.index({ tenantId: 1 });

export default mongoose.model('MedicalLicense', medicalLicenseSchema);
