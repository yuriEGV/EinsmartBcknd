import mongoose from 'mongoose';

const estudianteSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Types.ObjectId, ref: 'Tenant', required: true },

  nombres: { type: String, required: true, trim: true },
  apellidos: { type: String, required: true, trim: true },
  rut: {
    type: String,
    sparse: true,
    trim: true,
    match: [/^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/, 'Formato de RUT inválido (ej: 12.345.678-9)']
  },
  matricula: { type: String, sparse: true, trim: true },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Por favor ingrese un email válido']
  },

  edad: { type: Number, min: 0, max: 120 },
  fechaNacimiento: { type: Date },
  genero: { type: String, enum: ['Masculino', 'Femenino', 'Otro', 'No informado'], default: 'No informado' },
  grado: { type: String, trim: true },
  direccion: { type: String, trim: true, default: '' },
  salud: {
    seguro: { type: String, default: '' }, // e.g., Fonasa, Isapre
    alergias: [String],
    cronicas: [String],
    medicamentos: [String],
    observaciones: { type: String, default: '' }
  },
  etnia: { type: String, default: '' },
  programaPIE: { type: Boolean, default: false },
  certificadosAnteriores: [{
    nombre: String,
    url: String,
    fecha: { type: Date, default: Date.now }
  }],

  fechaRegistro: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Índices únicos por Tenant para permitir el mismo RUT en diferentes colegios (si fuera necesario para la SaaS)
estudianteSchema.index({ rut: 1, tenantId: 1 }, { unique: true, sparse: true });
estudianteSchema.index({ matricula: 1, tenantId: 1 }, { unique: true, sparse: true });

export default mongoose.model('Estudiante', estudianteSchema);
