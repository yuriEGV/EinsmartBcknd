import Schedule from '../models/scheduleModel.js';
import NotificationService from '../services/notificationService.js';

class ScheduleController {
    static async create(req, res) {
        try {
            const schedule = new Schedule({
                ...req.body,
                tenantId: req.user.tenantId
            });
            await schedule.save();

            // Notify Admins/Directors/Sostenedores
            await NotificationService.broadcastToAdmins({
                tenantId: req.user.tenantId,
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
            const { courseId, teacherId, dayOfWeek } = req.query;
            const query = { tenantId: req.user.tenantId };

            if (courseId) query.courseId = courseId;
            if (teacherId) query.teacherId = teacherId;
            if (dayOfWeek !== undefined) query.dayOfWeek = dayOfWeek;

            const schedules = await Schedule.find(query)
                .populate('courseId', 'name level letter')
                .populate('subjectId', 'name')
                .populate('teacherId', 'name')
                .sort({ dayOfWeek: 1, startTime: 1 });

            res.json(schedules);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            const schedule = await Schedule.findOneAndDelete({ _id: id, tenantId: req.user.tenantId });
            if (!schedule) return res.status(404).json({ message: 'Horario no encontrado' });

            // Notify Admins/Directors/Sostenedores
            await NotificationService.broadcastToAdmins({
                tenantId: req.user.tenantId,
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
            const { courseId } = req.params;
            const dayOfWeek = new Date().getDay();
            const schedules = await Schedule.find({
                tenantId: req.user.tenantId,
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
