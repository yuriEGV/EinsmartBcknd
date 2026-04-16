import Event from '../models/eventModel.js';
import Enrollment from '../models/enrollmentModel.js';
import Apoderado from '../models/apoderadoModel.js';
import Estudiante from '../models/estudianteModel.js';
import Course from '../models/courseModel.js';
import NotificationService from '../services/notificationService.js';

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

            // [NUEVO] Integración de Notificaciones de Calendario
            try {
                // Alerta general al equipo directivo (Director, UTP, Inspectores)
                await NotificationService.notifyPlatformChange({
                    tenantId: req.user.tenantId,
                    title: `Nuevo Evento: ${event.title}`,
                    message: `Se ha agendado: ${event.description || 'Sin descripción'} para el ${new Date(event.date).toLocaleDateString()}.`,
                    type: 'system',
                    link: '/events'
                });
            } catch (notifErr) {
                console.error("Error sending event notification:", notifErr);
            }

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

            // [NUEVO] Integrar Licencias Médicas de Funcionarios
            const MedicalLicense = await import('../models/medicalLicenseModel.js').then(m => m.default);
            // Solo personal interno necesita ver las licencias (directivos, UTP, admins)
            let licenseEvents = [];
            if (['admin', 'sostenedor', 'director', 'utp', 'inspector_general'].includes(req.user.role)) {
                const licenses = await MedicalLicense.find({
                    tenantId: req.user.tenantId,
                    userType: 'Funcionario',
                    estado: 'Aprobado'
                }).populate('userId', 'name email');

                // [BUG 4 FIX] Agrupar licencias por fecha de inicio cuando coinciden múltiples funcionarios
                const licensesByDate = {};
                for (const lic of licenses) {
                    const userName = lic.userId?.name || 'Funcionario';
                    const dateKey = lic.fechaInicio.toISOString().split('T')[0]; // YYYY-MM-DD

                    if (!licensesByDate[dateKey]) {
                        licensesByDate[dateKey] = [];
                    }
                    licensesByDate[dateKey].push({ lic, userName });
                }

                // Convertir grupos a eventos del calendario
                for (const [dateKey, group] of Object.entries(licensesByDate)) {
                    if (group.length === 1) {
                        // Licencia individual: evento simple con nombre del funcionario
                        const { lic, userName } = group[0];
                        licenseEvents.push({
                            _id: lic._id,
                            tenantId: lic.tenantId,
                            title: `🔴 Licencia: ${userName}`,
                            description: `${lic.tipo} — ${lic.diasReposo} días (hasta ${new Date(lic.fechaFin).toLocaleDateString('es-CL')}). ${lic.observaciones || ''}`.trim(),
                            date: lic.fechaInicio,
                            endDate: lic.fechaFin,
                            location: 'Ausente',
                            type: 'licencia',
                            // [BUG 4 FIX] Metadatos de color para el frontend
                            colorHex: '#ef4444',
                            bgColorHex: '#fee2e2',
                            isLicencia: true,
                            target: 'global'
                        });
                    } else {
                        // Múltiples licencias en el mismo día: evento agrupado
                        const nombres = group.map(g => g.userName).join(', ');
                        const lic = group[0].lic; // Usar la primera para la fecha
                        const maxEndDate = group.reduce((max, g) =>
                            new Date(g.lic.fechaFin) > max ? new Date(g.lic.fechaFin) : max,
                            new Date(lic.fechaFin)
                        );
                        const detalles = group.map(g =>
                            `• ${g.userName}: ${g.lic.tipo} (${g.lic.diasReposo} días)`
                        ).join('\n');

                        licenseEvents.push({
                            _id: `group-${dateKey}`,
                            tenantId: lic.tenantId,
                            title: `🔴 Licencias (${group.length} funcionarios)`,
                            description: `Funcionarios con licencia médica el ${new Date(dateKey).toLocaleDateString('es-CL')}:\n${detalles}`,
                            date: lic.fechaInicio,
                            endDate: maxEndDate,
                            location: 'Varios ausentes',
                            type: 'licencia',
                            // [BUG 4 FIX] Metadatos de color para el frontend
                            colorHex: '#ef4444',
                            bgColorHex: '#fee2e2',
                            isLicencia: true,
                            licenciadosCount: group.length,
                            target: 'global'
                        });
                    }
                }
            }

            // Combinar y retornar (ordenados por fecha)
            const combined = [...events, ...alternanciaEvents, ...licenseEvents].sort((a, b) => new Date(a.date) - new Date(b.date));

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

            // [NUEVO] Notificar eliminación
            await NotificationService.notifyPlatformChange({
                tenantId: req.user.tenantId,
                title: 'Evento Eliminado',
                message: `Se ha eliminado el evento: ${event.title}.`,
                type: 'system'
            });

            res.status(204).send();
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export default EventController;
