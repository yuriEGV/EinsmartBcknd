import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    rut: { type: String, unique: true, sparse: true }, // Sparse allows null/undefined values to not conflict
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'sostenedor', 'teacher', 'student', 'apoderado'], required: true },
    profileId: { type: mongoose.Types.ObjectId, default: null }, // Link to Estudiante or Apoderado
}, { timestamps: true });

export default mongoose.model('User', userSchema);


