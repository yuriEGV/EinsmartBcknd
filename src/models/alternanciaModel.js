import mongoose from 'mongoose';

const registroBitacoraSchema = new mongoose.Schema({
    fecha: { type: Date, required: true },
    horasCronologicas: { type: Number, required: true },
    actividadRealizada: { type: String, required: true },
    observaciones: { type: String, default: '' },
    firmadoTutor: { type: Boolean, default: false }
});

const alternanciaSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    estudianteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Estudiante', required: true },
    careerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Career' },
    empresa: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
    tipo: { 
        type: String, 
        enum: ['Pasantía', 'Práctica Profesional', 'Charla Técnica', 'Uso de Equipamiento'], 
        required: true 
    },
    estado: { 
        type: String, 
        enum: ['Borrador', 'Activa', 'Finalizada', 'Cancelada', 'Pendiente'], 
        default: 'Borrador' 
    },
    fechaInicio: { type: Date, required: true },
    fechaTermino: { type: Date },
    seguroEscolar: { type: Boolean, default: false },
    planFormativo: {
        objetivosAprendizaje: [{ type: String }],
        actividades: [{ type: String }],
        totalHoras: { type: Number, default: 0 }
    },
    bitacora: [registroBitacoraSchema],
    profesorSupervisor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    observaciones: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('Alternancia', alternanciaSchema);
