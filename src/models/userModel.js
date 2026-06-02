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
    },
    phone: {
        type: String,
        trim: true,
    },
    address: {
        type: String,
        trim: true,
    },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'sostenedor', 'director', 'utp', 'teacher', 'student', 'apoderado', 'psicologo', 'orientador', 'asistente_aula', 'manipulador_alimento', 'bibliotecario', 'secretario', 'paradocente', 'inspector_general', 'trabajador_social', 'psicopedagogo', 'auxiliar', 'vigilante', 'administrativo', 'tutor_empresa'], required: true },
    profileId: { type: mongoose.Types.ObjectId, default: null }, // Link to Estudiante or Apoderado
    specialization: { type: String, trim: true }, // Especialidad del profesor (ej: Matemáticas)
    mustChangePassword: { type: Boolean, default: false },
    mustChangePin: { type: Boolean, default: true }, // Teachers must change default PIN
    signaturePin: { type: String, default: '1234' }, // PIN for digital signature
    sessionToken: { type: String, default: null } // Single session control
}, { timestamps: true });

// Índices únicos por Tenant para permitir el mismo email/RUT en diferentes colegio/colegios
userSchema.index({ email: 1, tenantId: 1 }, { unique: true });
userSchema.index(
    { rut: 1, tenantId: 1 }, 
    { 
        unique: true, 
        partialFilterExpression: { rut: { $exists: true, $type: 'string', $ne: '' } } 
    }
);
export default mongoose.model('User', userSchema);
