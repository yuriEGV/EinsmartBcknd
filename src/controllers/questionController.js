import Question from '../models/questionModel.js';
import mongoose from 'mongoose';

class QuestionController {
    static async create(req, res) {
        try {
            const staffRoles = ['admin', 'sostenedor', 'teacher', 'director', 'utp'];
            if (!staffRoles.includes(req.user.role)) {
                return res.status(403).json({ message: 'No tienes permisos para crear preguntas.' });
            }
            const { subjectId, questionText, type, options, difficulty, tags } = req.body;

            // Integrity check: fetch actual grade from subject
            const Subject = await import('../models/subjectModel.js').then(m => m.default);
            const subject = await Subject.findById(subjectId).populate('courseId');
            const grade = subject?.courseId?.name || subject?.grade || req.body.grade;

            // Security check: Teacher = pending, Director/UTP/Admin = approved
            const isAdmin = ['admin', 'director', 'utp'].includes(req.user.role);
            const status = isAdmin ? 'approved' : 'pending';

            const question = new Question({
                tenantId: req.user.tenantId,
                subjectId,
                grade,
                questionText,
                type,
                options,
                difficulty,
                tags,
                status,
                createdBy: req.user.userId
            });

            await question.save();

            // Notify Admins if pending
            if (status === 'pending') {
                const NotificationService = await import('../services/notificationService.js').then(m => m.default);
                await NotificationService.broadcastToAdmins({
                    tenantId: req.user.tenantId,
                    title: 'Nueva Pregunta para Revisar',
                    message: `El docente ${req.user.name} ha añadido una pregunta al banco que requiere aprobación.`,
                    type: 'system',
                    link: '/academic'
                });
            }

            res.status(201).json(question);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async list(req, res) {
        try {
            const { subjectId, grade, type, difficulty } = req.query;
            const query = { tenantId: req.user.tenantId };

            if (subjectId) {
                if (mongoose.Types.ObjectId.isValid(subjectId)) {
                    query.subjectId = subjectId;
                } else {
                    // Search by subject name if not a valid ID
                    const Subject = await import('../models/subjectModel.js').then(m => m.default);
                    const subjects = await Subject.find({ name: subjectId, tenantId: req.user.tenantId });
                    query.subjectId = { $in: subjects.map(s => s._id) };
                }
            }
            if (grade) query.grade = grade;
            if (type) query.type = type;
            if (difficulty) query.difficulty = difficulty;

            const questions = await Question.find(query)
                .populate('subjectId', 'name')
                .populate('createdBy', 'name')
                .sort({ createdAt: -1 });

            res.json(questions);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async update(req, res) {
        try {
            const staffRoles = ['admin', 'sostenedor', 'teacher', 'director', 'utp'];
            if (!staffRoles.includes(req.user.role)) {
                return res.status(403).json({ message: 'No tienes permisos para modificar preguntas.' });
            }
            const { id } = req.params;
            const question = await Question.findOneAndUpdate(
                { _id: id, tenantId: req.user.tenantId },
                req.body,
                { new: true }
            );
            if (!question) return res.status(404).json({ message: 'Pregunta no encontrada' });
            res.json(question);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async delete(req, res) {
        try {
            const staffRoles = ['admin', 'sostenedor', 'teacher', 'director', 'utp'];
            if (!staffRoles.includes(req.user.role)) {
                return res.status(403).json({ message: 'No tienes permisos para eliminar preguntas.' });
            }
            const { id } = req.params;
            const question = await Question.findOneAndDelete({ _id: id, tenantId: req.user.tenantId });
            if (!question) return res.status(404).json({ message: 'Pregunta no encontrada' });
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export default QuestionController;
