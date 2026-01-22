import Grade from '../models/gradeModel.js';
import NotificationService from '../services/notificationService.js';
import AuditLog from '../models/auditLogModel.js';

class GradeController {
    // Create a new grade
    static async createGrade(req, res) {
        try {
            const { estudianteId, evaluationId, score, comments } = req.body;
            const tenantId = req.user.tenantId;

            // 1. Fetch Evaluation to get courseId
            const Evaluation = await import('../models/evaluationModel.js').then(m => m.default);
            const evaluation = await Evaluation.findOne({ _id: evaluationId, tenantId });
            if (!evaluation) {
                return res.status(404).json({ message: 'Evaluación no encontrada' });
            }

            // 2. Check if student is ENROLLED in this course
            const Enrollment = await import('../models/enrollmentModel.js').then(m => m.default);
            const enrollment = await Enrollment.findOne({
                estudianteId,
                courseId: evaluation.courseId,
                tenantId,
                status: 'confirmada' // Only confirmed enrollments can receive grades
            });

            if (!enrollment) {
                return res.status(400).json({
                    message: 'El estudiante no tiene una matrícula confirmada en este curso para recibir calificaciones.'
                });
            }

            const grade = new Grade({
                estudianteId,
                evaluationId,
                score,
                comments,
                tenantId
            });
            await grade.save();
            await grade.populate('estudianteId', 'nombres apellidos');
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

    // Get all grades (Filtered by Tenant and User)
    static async getGrades(req, res) {
        try {
            const query = { tenantId: req.user.tenantId };

            // If student, filter by their own profileId
            if (req.user.role === 'student' && req.user.profileId) {
                query.estudianteId = req.user.profileId;
            }
            // If guardian, filter by their linked student
            else if (req.user.role === 'apoderado' && req.user.profileId) {
                const Apoderado = await import('../models/apoderadoModel.js').then(m => m.default);
                const vinculation = await Apoderado.findById(req.user.profileId);
                if (vinculation) {
                    query.estudianteId = vinculation.estudianteId;
                } else {
                    return res.status(200).json([]);
                }
            }
            else if (req.user.role === 'student' || req.user.role === 'apoderado') {
                return res.status(200).json([]);
            }

            const grades = await Grade.find(query)
                .populate('estudianteId', 'nombres apellidos')
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
                .populate('estudianteId', 'nombres apellidos')
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
                .populate('estudianteId', 'nombres apellidos')
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
                .populate('estudianteId', 'nombres apellidos')
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
                .populate('estudianteId', 'nombres apellidos')
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
                .populate('estudianteId', 'nombres apellidos')
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
