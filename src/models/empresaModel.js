import mongoose from 'mongoose';

const empresaSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    rut: { type: String, required: true, trim: true },
    razonSocial: { type: String, required: true, trim: true },
    direccion: { type: String, trim: true },
    telefono: { type: String, trim: true },
    emailContacto: { type: String, trim: true },
    rubro: { type: String, trim: true },
    estado: { type: String, enum: ['Activo', 'Inactivo'], default: 'Activo' },
    // Convenio fields
    convenioNumero: { type: String, trim: true },
    convenioFechaInicio: { type: Date },
    convenioFechaTermino: { type: Date },
    convenioEstado: { type: String, enum: ['Vigente', 'Vencido', 'Pendiente'], default: 'Vigente' }
}, { timestamps: true });

// El RUT debe ser único dentro de cada institución escolar (Tenant)
empresaSchema.index({ rut: 1, tenantId: 1 }, { unique: true });

export default mongoose.model('Empresa', empresaSchema);
