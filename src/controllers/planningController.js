
import Planning from '../models/planningModel.js';
import mongoose from 'mongoose';

class PlanningController {
    static async create(req, res) {
        try {
            const planning = await Planning.create({
                ...req.body,
                teacherId: req.user.userId,
                tenantId: req.user.tenantId,
                status: 'draft'
            });
            res.status(201).json(planning);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    static async list(req, res) {
        try {
            const query = { tenantId: req.user.tenantId };

            if (req.query.subjectId) query.subjectId = req.query.subjectId;
            if (req.query.status) query.status = req.query.status;

            // Security: Restrict visibility based on role
            const adminRoles = ['admin', 'director', 'utp', 'sostenedor'];

            // If NOT an admin role, restrict to own planning (Teachers)
            if (!adminRoles.includes(req.user.role)) {
                query.teacherId = req.user.userId;
            }

            console.log(`[Planning List] User: ${req.user.userId} (${req.user.role}) - Query:`, query);

            const plannings = await Planning.find(query)
                .populate('subjectId', 'name')
                .populate('teacherId', 'name')
                .populate('objectives')
                .populate('rubricId')
                .sort({ createdAt: -1 });

            res.json(plannings);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            const planning = await Planning.findOne({ _id: id, tenantId: req.user.tenantId });

            if (!planning) return res.status(404).json({ message: 'Planificación no encontrada' });

            // Only original teacher can update draft/rejected plannings
            if (req.user.role === 'teacher' && planning.teacherId.toString() !== req.user.userId) {
                return res.status(403).json({ message: 'No autorizado' });
            }

            // Cannot update if approved unless admin
            if (planning.status === 'approved' && req.user.role === 'teacher') {
                return res.status(400).json({ message: 'No se puede editar una planificación ya aprobada' });
            }

            const updated = await Planning.findByIdAndUpdate(id, req.body, { new: true });
            res.json(updated);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    static async submit(req, res) {
        try {
            const { id } = req.params;
            const planning = await Planning.findOneAndUpdate(
                { _id: id, tenantId: req.user.tenantId, teacherId: req.user.userId },
                { status: 'submitted' },
                { new: true }
            );
            if (!planning) return res.status(404).json({ message: 'Planificación no encontrada' });
            res.json(planning);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    static async review(req, res) {
        try {
            const { id } = req.params;
            const { status, feedback } = req.body;

            if (!['approved', 'rejected'].includes(status)) {
                return res.status(400).json({ message: 'Estado de revisión inválido' });
            }

            const planning = await Planning.findOneAndUpdate(
                { _id: id, tenantId: req.user.tenantId },
                {
                    status,
                    feedback,
                    approvedBy: req.user.userId
                },
                { new: true }
            );

            if (!planning) return res.status(404).json({ message: 'Planificación no encontrada' });
            res.json(planning);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            const query = { _id: id, tenantId: req.user.tenantId };

            if (req.user.role === 'teacher') {
                query.teacherId = req.user.userId;
                query.status = { $in: ['draft', 'rejected'] };
            }

            const result = await Planning.findOneAndDelete(query);
            if (!result) return res.status(404).json({ message: 'No encontrado o no se puede eliminar' });
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export default PlanningController;
