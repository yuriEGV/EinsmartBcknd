
import Rubric from '../models/rubricModel.js';

class RubricController {
    static async create(req, res) {
        try {
            const rubric = await Rubric.create({
                ...req.body,
                teacherId: req.user.userId,
                tenantId: req.user.tenantId
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
            const rubric = await Rubric.findOneAndUpdate(
                { _id: req.params.id, tenantId: req.user.tenantId, teacherId: req.user.userId },
                req.body,
                { new: true }
            );
            if (!rubric) return res.status(404).json({ message: 'Rúbrica no encontrada o no autorizado' });
            res.json(rubric);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    static async delete(req, res) {
        try {
            const rubric = await Rubric.findOneAndDelete({
                _id: req.params.id,
                tenantId: req.user.tenantId,
                teacherId: req.user.userId
            });
            if (!rubric) return res.status(404).json({ message: 'Rúbrica no encontrada o no autorizado' });
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export default RubricController;
