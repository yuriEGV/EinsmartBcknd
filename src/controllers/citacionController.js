import NotificationService from '../services/notificationService.js';
import Citacion from '../models/citacionModel.js';
import User from '../models/userModel.js';
import mongoose from 'mongoose';

class CitacionController {
    static async create(req, res) {
        try {
            const { estudianteId } = req.body;

            // Auto-lookup the apoderado for this student
            const student = await mongoose.model('Estudiante').findById(estudianteId);
            if (!student) return res.status(404).json({ message: 'Estudiante no encontrado' });

            const apoderado = await mongoose.model('Apoderado').findOne({ estudianteId, tipo: 'principal' });

            if (!apoderado) return res.status(400).json({ message: 'El estudiante no tiene un apoderado principal asignado. No se puede crear la citación.' });

            // [NUEVO] Obtener el curso actual del estudiante desde su matricula activa
            const enrollment = await mongoose.model('Enrollment').findOne({
                estudianteId,
                tenantId: req.user.tenantId,
                status: { $in: ['confirmada', 'activo', 'activa'] }
            });

            if (!enrollment) return res.status(400).json({ message: 'El estudiante no tiene una matrícula activa. No se puede crear la citación.' });

            const citacion = new Citacion({
                ...req.body,
                apoderadoId: apoderado._id,
                courseId: enrollment.courseId,
                tenantId: req.user.tenantId,
                profesorId: req.user.userId
            });
            await citacion.save();

            // [NUEVO] Notificar al apoderado
            NotificationService.notifyNewCitation(
                citacion.estudianteId,
                citacion.motivo,
                citacion.fecha,
                citacion.hora,
                citacion.observaciones || citacion.motivo,
                req.user.tenantId
            );

            res.status(201).json(citacion);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async list(req, res) {
        try {
            const { courseId } = req.query;
            const query = { tenantId: req.user.tenantId };

            if (courseId) {
                query.courseId = courseId;
            }

            // Privacy Logic: Stricter for teachers
            if (req.user.role === 'teacher') {
                const Subject = mongoose.model('Subject');
                const Course = mongoose.model('Course');

                const [teacherSubjects, headCourses] = await Promise.all([
                    Subject.find({ teacherId: req.user.userId, tenantId: req.user.tenantId }).select('courseId'),
                    Course.find({ teacherId: req.user.userId, tenantId: req.user.tenantId }).select('_id')
                ]);

                const allowedCourseIds = [
                    ...new Set([
                        ...teacherSubjects.map(s => s.courseId.toString()),
                        ...headCourses.map(c => c._id.toString())
                    ])
                ];

                if (courseId && !allowedCourseIds.includes(courseId)) {
                    return res.status(403).json({ message: 'No tienes permisos para ver citaciones de este curso.' });
                }

                query.courseId = { $in: allowedCourseIds };
            } else if (['director', 'inspector_general', 'utp', 'admin', 'sostenedor'].includes(req.user.role)) {
                // Keep query as is (tenant only)
            } else if (req.user.role === 'apoderado' || req.user.role === 'student') {
                // If they are parents/students, they should only see their own
                // This might need more logic depending on how they are linked,
                // but usually these roles have their own logic in Dashboard.
                // For now, let's just restrict by profileId if applicable or keep simple.
            }

            const citaciones = await Citacion.find(query)
                .populate('estudianteId', 'nombres apellidos')
                .populate('profesorId', 'name email')
                .populate('apoderadoId', 'nombre apellidos correo telefono')
                .sort({ fecha: 1, hora: 1 });

            res.json(citaciones);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async updateStatus(req, res) {
        try {
            const { id } = req.params;
            const { estado, actaReunion, acuerdo, resultado, asistioApoderado } = req.body;
            const citacion = await Citacion.findOneAndUpdate(
                { _id: id, tenantId: req.user.tenantId },
                { estado, actaReunion, acuerdo, resultado, asistioApoderado },
                { new: true }
            );
            if (!citacion) return res.status(404).json({ message: 'Citación no encontrada' });
            res.json(citacion);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export default CitacionController;
