import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true, trim: true },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Por favor ingrese un email válido']
    },
    rut: {
        type: String,
        trim: true,
        // match: [/^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/, 'Formato de RUT inválido (ej: 12.345.678-9)'] // Deshabilitado temporalmente para depuración
    },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'sostenedor', 'director', 'utp', 'teacher', 'student', 'apoderado', 'psicologo', 'orientador', 'asistente_aula', 'manipulador_alimento', 'bibliotecario', 'secretario', 'paradocente', 'inspector_general'], required: true },
    profileId: { type: mongoose.Types.ObjectId, default: null }, // Link to Estudiante or Apoderado
    specialization: { type: String, trim: true }, // Especialidad del profesor (ej: Matemáticas)
    mustChangePassword: { type: Boolean, default: false },
    mustChangePin: { type: Boolean, default: true }, // Teachers must change default PIN
    signaturePin: { type: String, default: '1234' }, // PIN for digital signature
}, { timestamps: true });

// Índices únicos por Tenant para permitir el mismo email/RUT en diferentes colegio/colegios
userSchema.index({ email: 1, tenantId: 1 }, { unique: true });
userSchema.index({ rut: 1, tenantId: 1 }, { unique: true, sparse: true });

export default mongoose.model('User', userSchema);
