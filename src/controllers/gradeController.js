import Grade from '../models/gradeModel.js';
import NotificationService from '../services/notificationService.js';
import AuditLog from '../models/auditLogModel.js';

class GradeController {
    // Create a new grade
    static async createGrade(req, res) {
        try {
            const grade = new Grade({
                ...req.body,
                tenantId: req.user.tenantId
            });
            await grade.save();
            await grade.populate('estudianteId', 'nombre apellido');
            await grade.populate('evaluationId', 'title maxScore subject');

            // Send notification
            NotificationService.notifyNewGrade(
                grade.estudianteId._id,
                grade.score,
                grade.evaluationId.subject || 'Sin Asignatura',
                grade.evaluationId.title,
                grade.tenantId
            );

            res.status(201).json(grade);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    // Get all grades (Filtered by Tenant)
    static async getGrades(req, res) {
        try {
            const grades = await Grade.find({ tenantId: req.user.tenantId })
                .populate('estudianteId', 'nombre apellido')
                .populate('evaluationId', 'title maxScore');
            res.status(200).json(grades);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Get grades by student (Secure)
    static async getGradesByStudent(req, res) {
        try {
            const grades = await Grade.find({
                estudianteId: req.params.estudianteId,
                tenantId: req.user.tenantId
            })
                .populate('estudianteId', 'nombre apellido')
                .populate('evaluationId', 'title maxScore');
            res.status(200).json(grades);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Get grades by evaluation (Secure)
    static async getGradesByEvaluation(req, res) {
        try {
            const grades = await Grade.find({
                evaluationId: req.params.evaluationId,
                tenantId: req.user.tenantId
            })
                .populate('estudianteId', 'nombre apellido')
                .populate('evaluationId', 'title maxScore');
            res.status(200).json(grades);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Get grades by tenant (Deprecated or restricted to SuperAdmin)
    static async getGradesByTenant(req, res) {
        try {
            // Only allow if tenantId matches or user is SuperAdmin (handled by routes usually)
            const targetTenant = req.params.tenantId;
            if (req.user.role !== 'admin' && req.user.tenantId !== targetTenant) {
                return res.status(403).json({ message: 'Acceso denegado' });
            }

            const grades = await Grade.find({ tenantId: targetTenant })
                .populate('estudianteId', 'nombre apellido')
                .populate('evaluationId', 'title maxScore');
            res.status(200).json(grades);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Get a single grade by ID (Secure)
    static async getGradeById(req, res) {
        try {
            const grade = await Grade.findOne({
                _id: req.params.id,
                tenantId: req.user.tenantId
            })
                .populate('estudianteId', 'nombre apellido')
                .populate('evaluationId', 'title maxScore');
            if (!grade) {
                return res.status(404).json({ message: 'Calificación no encontrada' });
            }
            res.status(200).json(grade);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Update a grade by ID (Secure)
    static async updateGrade(req, res) {
        try {
            const grade = await Grade.findOneAndUpdate(
                { _id: req.params.id, tenantId: req.user.tenantId },
                req.body,
                { new: true }
            )
                .populate('estudianteId', 'nombre apellido')
                .populate('evaluationId', 'title maxScore');

            if (!grade) {
                return res.status(404).json({ message: 'Calificación no encontrada' });
            }

            // Log update
            await AuditLog.create({
                action: 'UPDATE_GRADE',
                entityId: grade._id,
                entityType: 'Grade',
                user: req.user.userId,
                details: { oldScore: grade.score, newScore: req.body.score },
                tenantId: req.user.tenantId
            });

            res.status(200).json(grade);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    // Delete a grade by ID (Secure)
    static async deleteGrade(req, res) {
        try {
            const grade = await Grade.findOneAndDelete({
                _id: req.params.id,
                tenantId: req.user.tenantId
            });

            if (!grade) {
                return res.status(404).json({ message: 'Calificación no encontrada' });
            }

            // Log deletion
            await AuditLog.create({
                action: 'DELETE_GRADE',
                entityId: grade._id,
                entityType: 'Grade',
                user: req.user.userId,
                details: { score: grade.score, student: grade.estudianteId, evaluation: grade.evaluationId },
                tenantId: req.user.tenantId
            });

            res.status(204).send();
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export default GradeController;
