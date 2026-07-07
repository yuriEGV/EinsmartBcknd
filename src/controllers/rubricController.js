import Rubric from '../models/rubricModel.js';
import NotificationService from '../services/notificationService.js';

class RubricController {
    static async create(req, res) {
        try {
            const rubric = await Rubric.create({
                ...req.body,
                teacherId: req.user.userId,
                tenantId: req.user.tenantId,
                status: (['admin', 'director', 'utp'].includes(req.user.role)) ? 'approved' : 'draft'
            });
            res.status(201).json(rubric);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    static async list(req, res) {
        try {
            const query = { tenantId: req.user.tenantId };

            // Security: Restrict visibility based on role
            const adminRoles = ['admin', 'director', 'utp', 'sostenedor'];

            // If NOT an admin role, restrict to own rubrics (Teachers)
            if (!adminRoles.includes(req.user.role)) {
                query.teacherId = req.user.userId;
            }

            console.log(`[Rubrics List] User: ${req.user.userId} (${req.user.role}) - Query:`, query);

            const rubrics = await Rubric.find(query)
                .populate('subjectId', 'name')
                .populate('teacherId', 'name')
                .sort({ createdAt: -1 });

            res.json(rubrics);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async getById(req, res) {
        try {
            const rubric = await Rubric.findOne({
                _id: req.params.id,
                tenantId: req.user.tenantId
            }).populate('subjectId', 'name');

            if (!rubric) return res.status(404).json({ message: 'Rúbrica no encontrada' });
            res.json(rubric);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async update(req, res) {
        try {
            const adminRoles = ['admin', 'director', 'utp'];
            const query = { _id: req.params.id, tenantId: req.user.tenantId };

            if (!adminRoles.includes(req.user.role)) {
                query.teacherId = req.user.userId;
            }

            const rubric = await Rubric.findOneAndUpdate(query, req.body, { new: true });
            if (!rubric) return res.status(404).json({ message: 'Rúbrica no encontrada o no autorizado' });
            res.json(rubric);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    static async delete(req, res) {
        try {
            const adminRoles = ['admin', 'director', 'utp'];
            const query = { _id: req.params.id, tenantId: req.user.tenantId };

            if (!adminRoles.includes(req.user.role)) {
                query.teacherId = req.user.userId;
            }

            const rubric = await Rubric.findOneAndDelete(query);
            if (!rubric) return res.status(404).json({ message: 'Rúbrica no encontrada o no autorizado' });
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async submit(req, res) {
        try {
            const rubric = await Rubric.findOneAndUpdate(
                { _id: req.params.id, tenantId: req.user.tenantId, teacherId: req.user.userId, status: { $in: ['draft', 'rejected'] } },
                { status: 'submitted' },
                { new: true }
            );
            if (!rubric) return res.status(404).json({ message: 'Rúbrica no encontrada o ya enviada.' });

            // Notify Admins/UTP
            await NotificationService.broadcastToAdmins({
                tenantId: req.user.tenantId,
                title: 'Nueva Rúbrica Recibida',
                message: `El docente ha enviado la rúbrica: "${rubric.title}" para revisión.`,
                type: 'rubric_submitted',
                link: '/academic'
            });

            res.json(rubric);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    static async review(req, res) {
        try {
            const { status, feedback } = req.body;
            const staffRoles = ['admin', 'director', 'utp'];
            if (!staffRoles.includes(req.user.role)) {
                return res.status(403).json({ message: 'No autorizado para revisar rúbricas.' });
            }

            const rubric = await Rubric.findOneAndUpdate(
                { _id: req.params.id, tenantId: req.user.tenantId },
                { status, feedback, approvedBy: req.user.userId },
                { new: true }
            );
            if (!rubric) return res.status(404).json({ message: 'Rúbrica no encontrada' });

            // Notify Teacher
            await NotificationService.createInternalNotification({
                tenantId: req.user.tenantId,
                userId: rubric.teacherId,
                title: status === 'approved' ? 'Rúbrica Aprobada' : 'Rúbrica Rechazada',
                message: status === 'approved'
                    ? `Tu rúbrica "${rubric.title}" ha sido aprobada.`
                    : `Tu rúbrica "${rubric.title}" necesita correcciones: ${feedback}`,
                type: status === 'approved' ? 'rubric_approved' : 'rubric_rejected',
                link: '/academic'
            });

            res.json(rubric);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }
}

export default RubricController;
