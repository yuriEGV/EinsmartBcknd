import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true, trim: true },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Por favor ingrese un email válido']
    },
    rut: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        // match: [/^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/, 'Formato de RUT inválido (ej: 12.345.678-9)'] // Deshabilitado temporalmente para depuración
    },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'sostenedor', 'teacher', 'student', 'apoderado'], required: true },
    profileId: { type: mongoose.Types.ObjectId, default: null }, // Link to Estudiante or Apoderado
}, { timestamps: true });

export default mongoose.model('User', userSchema);
