import mongoose from 'mongoose';

const estudianteSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Types.ObjectId, ref: 'Tenant', required: true },

  nombres: { type: String, required: true, trim: true },
  apellidos: { type: String, required: true, trim: true },
  rut: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    match: [/^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/, 'Formato de RUT inválido (ej: 12.345.678-9)']
  },
  matricula: { type: String, unique: true, sparse: true, trim: true },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Por favor ingrese un email válido']
  },

  edad: { type: Number, min: 0, max: 120 },
  grado: { type: String, trim: true },

  fechaRegistro: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

export default mongoose.model('Estudiante', estudianteSchema);
