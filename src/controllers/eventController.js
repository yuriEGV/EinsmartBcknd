import Event from '../models/eventModel.js';
import Enrollment from '../models/enrollmentModel.js';
import Apoderado from '../models/apoderadoModel.js';
import Estudiante from '../models/estudianteModel.js';
import Course from '../models/courseModel.js';

class EventController {
    static async createEvent(req, res) {
        try {
            if (req.user.role === 'student') {
                return res.status(403).json({ message: 'Los alumnos no pueden crear eventos.' });
            }
            const event = new Event({
                ...req.body,
                creadoPor: req.user.userId,
                tenantId: req.user.tenantId
            });
            await event.save();
            res.status(201).json(event);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    static async getEvents(req, res) {
        try {
            const query = { tenantId: req.user.tenantId };

            // Allow SuperAdmins to see everything (no tenantId) if needed, but current logic enforces it.
            // if (req.user.role === 'admin') delete query.tenantId;

            // [STRICT ISOLATION] Students and Guardians only see global or relevant events
            if (req.user.role === 'student' || req.user.role === 'apoderado') {
                let studentId;
                if (req.user.role === 'student') {
                    studentId = req.user.profileId;
                } else {
                    const apoderado = await Apoderado.findById(req.user.profileId);
                    studentId = apoderado?.estudianteId;
                }

                if (studentId) {
                    const enrollment = await Enrollment.findOne({
                        estudianteId: studentId,
                        tenantId: req.user.tenantId,
                        status: { $in: ['confirmada', 'activo', 'activa'] }
                    });

                    if (enrollment) {
                        const course = await Course.findById(enrollment.courseId);
                        const courseIdStr = enrollment.courseId.toString();
                        const gradeName = course?.name; // e.g. "1A"

                        query.$or = [
                            { target: 'global' },
                            { target: 'curso', targetId: courseIdStr },
                            { target: 'grado', targetId: gradeName }
                        ];
                    } else {
                        query.target = 'global';
                    }
                } else {
                    query.target = 'global';
                }
            } else if (req.user.role === 'teacher' || req.user.role === 'admin' || req.user.role === 'sostenedor' || req.user.role === 'director' || req.user.role === 'utp' || req.user.role === 'inspector_general') {
                // Management and teachers see everything for their tenant
                // Already handled by base query { tenantId }
            }

            const events = await Event.find(query).sort({ date: 1 });

            // [NUEVO] Integrar Alternancias al Calendario
            const Alternancia = await import('../models/alternanciaModel.js').then(m => m.default);
            // Si es un rol directivo o profesor, ve todas las alternancias del tenant para coordinación
            // Si es alumno o apoderado, se filtrarán las que correspondan (o se asume global según el requerimiento "todos estén alertados")
            let altQuery = { tenantId: req.user.tenantId };
            
            // Si es alumno/apoderado, solo ve las suyas/de su pupilo
            if (req.user.role === 'student' || req.user.role === 'apoderado') {
                let studentId;
                if (req.user.role === 'student') studentId = req.user.profileId;
                else {
                    const apoderado = await Apoderado.findById(req.user.profileId);
                    studentId = apoderado?.estudianteId;
                }
                if (studentId) altQuery.estudianteId = studentId;
            }

            const alternancias = await Alternancia.find(altQuery)
                .populate('estudianteId', 'firstName lastName nombres apellidos')
                .populate('careerId', 'name');

            const alternanciaEvents = alternancias.map(alt => {
                const studentName = alt.estudianteId ? 
                    (alt.estudianteId.nombres || `${alt.estudianteId.firstName} ${alt.estudianteId.lastName}`) : 'Estudiante';
                
                return {
                    _id: alt._id,
                    tenantId: alt.tenantId,
                    title: `Alternancia: ${studentName}`,
                    description: `Actividad en ${alt.empresaInstitucion}. Especialidad: ${alt.careerId?.name || 'TP'}. Estado: ${alt.estado}`,
                    date: alt.fechaInicio,
                    endDate: alt.fechaTermino, // Support duration if frontend displays it
                    location: alt.empresaInstitucion,
                    type: 'alternancia',
                    target: 'global' // Visibilidad global para alertas
                };
            });

            // Combinar y retornar (ordenados por fecha)
            const combined = [...events, ...alternanciaEvents].sort((a, b) => new Date(a.date) - new Date(b.date));

            return res.status(200).json(combined);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async deleteEvent(req, res) {
        try {
            if (req.user.role === 'student') {
                return res.status(403).json({ message: 'No tienes permisos para eliminar eventos.' });
            }
            const event = await Event.findOneAndDelete({
                _id: req.params.id,
                tenantId: req.user.tenantId
            });
            if (!event) return res.status(404).json({ message: 'Evento no encontrado' });
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export default EventController;
