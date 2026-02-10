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
            }

            const events = await Event.find(query)
                .sort({ date: 1 });
            res.status(200).json(events);
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
