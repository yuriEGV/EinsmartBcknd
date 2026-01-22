
import Subject from '../models/subjectModel.js';

export default class SubjectController {

    // Create new Subject
    static async createSubject(req, res) {
        try {
            const { name, courseId, teacherId } = req.body;

            // Allow teachers to create subjects, but force tenantId
            if (!name || !courseId || !teacherId) {
                return res.status(400).json({ message: 'Todos los campos son obligatorios' });
            }

            const subject = await Subject.create({
                name,
                courseId,
                teacherId,
                tenantId: req.user.tenantId
            });

            return res.status(201).json(subject);
        } catch (error) {
            console.error('Error createSubject:', error);
            return res.status(500).json({ message: 'Error creando asignatura', error: error.message });
        }
    }

    // Get all subjects (filtered by tenant)
    static async getSubjects(req, res) {
        try {
            const query = { tenantId: req.user.tenantId };

            // Optional filters
            if (req.query.courseId) query.courseId = req.query.courseId;
            if (req.query.teacherId) query.teacherId = req.query.teacherId;

            const subjects = await Subject.find(query)
                .populate('courseId', 'name')
                .populate('teacherId', 'name email')
                .sort({ name: 1 });

            return res.json(subjects);
        } catch (error) {
            return res.status(500).json({ message: 'Error obteniendo asignaturas', error: error.message });
        }
    }

    // Update Subject
    static async updateSubject(req, res) {
        try {
            const { id } = req.params;
            const updated = await Subject.findOneAndUpdate(
                { _id: id, tenantId: req.user.tenantId },
                req.body,
                { new: true }
            );

            if (!updated) return res.status(404).json({ message: 'Asignatura no encontrada' });

            return res.json(updated);
        } catch (error) {
            return res.status(500).json({ message: 'Error actualizando asignatura', error: error.message });
        }
    }

    // Delete Subject
    static async deleteSubject(req, res) {
        try {
            const { id } = req.params;
            const deleted = await Subject.findOneAndDelete({
                _id: id,
                tenantId: req.user.tenantId
            });

            if (!deleted) return res.status(404).json({ message: 'Asignatura no encontrada' });

            return res.status(204).send();
        } catch (error) {
            return res.status(500).json({ message: 'Error eliminando asignatura', error: error.message });
        }
    }
}
