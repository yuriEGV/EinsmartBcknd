import mongoose from 'mongoose';

const registroBitacoraSchema = new mongoose.Schema({
    fecha: { type: Date, required: true },
    horasCronologicas: { type: Number, required: true },
    actividadRealizada: { type: String, required: true },
    observaciones: { type: String, default: '' },
    firmadoTutor: { type: Boolean, default: false },
    firmaEstudiante: { type: String, default: '' }, // New: Base64/Link Signature
    firmaTutorContenido: { type: String, default: '' }, // New: Base64/Link Signature
    gpsLocation: {
        lat: { type: Number },
        lng: { type: Number },
        accuracy: { type: Number },
        timestamp: { type: Date }
    }
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
    // Nuevos campos Alternancia Pro
    maestroGuia: {
        nombre: { type: String, trim: true },
        cargo: { type: String, trim: true },
        email: { type: String, trim: true },
        telefono: { type: String, trim: true }
    },
    modulosDual: [{
        subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
        horasLiceo: { type: Number, default: 0 },
        horasEmpresa: { type: Number, default: 0 },
        actividades: { type: String }
    }],
    evaluacionesPeriodicas: [{
        fecha: { type: Date, default: Date.now },
        desempeñoTecnico: { type: Number, min: 1, max: 7 }, // Escala chilena 1-7
        habilidadesLaborales: { type: Number, min: 1, max: 7 },
        asistencia: { type: Number, min: 1, max: 7 },
        comentarios: { type: String },
        tutorFirma: { type: Boolean, default: false }
    }],
    convenioUrl: { type: String }, // Link a documento formal (Opcional)
    
    // Dispositivo Celular del PROFESOR SUPERVISOR (NO del estudiante)
    // Por razones de privacidad y legal (menores de edad), solo se rastrea al profesor que visita la empresa.
    dispositivoRastreo: {
        numeroChip: { type: String, default: '' },
        imei: { type: String, default: '' },
        modeloEquipo: { type: String, default: '' },
        activo: { type: Boolean, default: true }
    },
    
    bitacora: [registroBitacoraSchema],
    profesorSupervisor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tutorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    observaciones: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('Alternancia', alternanciaSchema);
