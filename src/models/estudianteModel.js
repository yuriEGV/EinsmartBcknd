import mongoose from 'mongoose';

const estudianteSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Types.ObjectId, ref: 'Tenant', required: true },

  nombres: { type: String, required: true },
  apellidos: { type: String, required: true },
  rut: { type: String, unique: true, sparse: true },
  matricula: { type: String, unique: true, sparse: true },
  email: { type: String, required: true },

  edad: { type: Number },
  grado: { type: String },

  fechaRegistro: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

export default mongoose.model('Estudiante', estudianteSchema);
