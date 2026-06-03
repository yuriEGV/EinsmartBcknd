import { Schedule } from '../models/pgModels.js';
import NotificationService from '../services/notificationService.js';
import { Enrollment } from '../models/pgModels.js';
import { Guardian as Apoderado } from '../models/pgModels.js';

class ScheduleController {
    static async create(req, res) {
        try {
            const schedule = new Schedule({
                ...req.body,
                tenant_id: req.user.tenantId
            });
            await schedule.save();

            // Notify Admins/Directors/Sostenedores
            await NotificationService.broadcastToAdmins({
                tenant_id: req.user.tenantId,
                title: 'Nuevo Horario Creado',
                message: `El usuario ${req.user.name} ha creado un nuevo bloque de horario.`,
                type: 'system',
                link: '/schedules'
            });

            res.status(201).json(schedule);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    static async list(req, res) {
        try {
            const { course_id, teacherId, dayOfWeek, date } = req.query;
            const query = { tenant_id: req.user.tenantId };
            
            // 1. Identify context
            let activeCourseId = courseId;
            let activeTeacherId = teacherId;

            if (req.user.role === 'student' || req.user.role === 'apoderado') {
                let studentId;
                if (req.user.role === 'student') {
                    studentId = req.user.profileId;
                } else {
                    const apoderado = await Apoderado.findById(req.user.profileId);
                    studentId = apoderado?.estudianteId;
                }

                if (!studentId) return res.status(403).json({ message: 'Perfil no vinculado' });

                const enrollment = await Enrollment.findOne({
                    student_id: studentId,
                    tenant_id: req.user.tenantId,
                    status: { $in: ['confirmada', 'activo', 'activa'] }
                });

                if (!enrollment) return res.status(404).json({ message: 'Matrícula no encontrada' });
                activeCourseId = enrollment.courseId;
                query.courseId = activeCourseId;
            } else if (req.user.role === 'teacher') {
                // If a teacher requests a specific course schedule, show the full course schedule instead of only their own classes
                if (courseId) {
                    activeCourseId = courseId;
                    activeTeacherId = undefined;
                } else {
                    activeTeacherId = req.user.userId;
                }
            }

            if (activeCourseId) query.courseId = activeCourseId;
            if (activeTeacherId) query.teacherId = activeTeacherId;
            if (dayOfWeek !== undefined) query.dayOfWeek = dayOfWeek;

            const schedules = await Schedule.find(query)
                
                
                
                .sort({ dayOfWeek: 1, blockId: 1, startTime: 1 });

            // 2. Integration with Calendar Events (Exams/Tests)
            // If we are looking for a specific week or day, we inject events
            let events = [];
            if (date) {
                const Event = Event;
                const targetDate = new Date(date);
                const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
                const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

                // Find events for this course or global
                const eventQuery = {
                    tenant_id: req.user.tenantId,
                    date: { $gte: startOfDay, $lte: endOfDay },
                    $or: [
                        { target: 'global' },
                        { target: 'curso', targetId: activeCourseId }
                    ]
                };
                
                events = await Event.find(eventQuery);
            }

            res.json({
                schedules,
                events,
                role: req.user.role
            });

        } catch (error) {
            console.error('Schedule List Error:', error);
            res.status(500).json({ message: error.message });
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            const schedule = await Schedule.findOneAndDelete({ _id: id, tenant_id: req.user.tenantId });
            if (!schedule) return res.status(404).json({ message: 'Horario no encontrado' });

            // Notify Admins/Directors/Sostenedores
            await NotificationService.broadcastToAdmins({
                tenant_id: req.user.tenantId,
                title: 'Horario Eliminado',
                message: `El usuario ${req.user.name} ha eliminado un bloque de horario.`,
                type: 'system',
                link: '/schedules'
            });

            res.status(204).send();
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async getByDay(req, res) {
        try {
            const { course_id } = req.params;
            const dayOfWeek = new Date().getDay();
            const schedules = await Schedule.find({
                tenant_id: req.user.tenantId,
                courseId,
                dayOfWeek
            }).sort({ startTime: 1 });
            res.json(schedules);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export default ScheduleController;
