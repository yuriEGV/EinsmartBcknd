import Grade from '../models/gradeModel.js';
import NotificationService from '../services/notificationService.js';
import AuditLog from '../models/auditLogModel.js';

class GradeController {
    // Create a new grade
        try {
            if (req.user.role === 'inspector_general') {
                return res.status(403).json({ message: 'Los inspectores generales no tienen permiso para gestionar calificaciones.' });
            }

            const { estudianteId, evaluationId, score, comments } = req.body;
            const tenantId = req.user.tenantId;

            // 1. Fetch Evaluation to get courseId
            const Evaluation = await import('../models/evaluationModel.js').then(m => m.default);
            const Subject = await import('../models/subjectModel.js').then(m => m.default);
            const evaluation = await Evaluation.findOne({ _id: evaluationId, tenantId });
            if (!evaluation) {
                return res.status(404).json({ message: 'Evaluación no encontrada' });
            }

            // Check if Subject is validated by UTP
            const subject = await Subject.findById(evaluation.subjectId);
            if (subject && subject.utpValidated) {
                return res.status(403).json({ message: 'Este módulo técnico profesional ya ha sido firmado y cerrado oficialmente por UTP. Las calificaciones están bloqueadas.' });
            }

            // 2. Check if student is ENROLLED in this course
            const Enrollment = await import('../models/enrollmentModel.js').then(m => m.default);
            const enrollment = await Enrollment.findOne({
                estudianteId,
                courseId: evaluation.courseId,
                tenantId,
                status: { $in: ['confirmada', 'activo', 'activa'] }
            });

            if (!enrollment) {
                return res.status(400).json({
                    message: 'El estudiante no tiene una matrícula confirmada en este curso para recibir calificaciones.'
                });
            }

            // [NUEVO] Check for medical license on evaluation date
            const MedicalLicense = await import('../models/medicalLicenseModel.js').then(m => m.default);
            const activeLicense = await MedicalLicense.findOne({
                tenantId,
                userId: estudianteId,
                fechaInicio: { $lte: evaluation.date },
                fechaFin: { $gte: evaluation.date },
                estado: 'Aprobado'
            });

            const grade = new Grade({
                estudianteId,
                evaluationId,
                score,
                comments,
                status: (activeLicense || req.body.status === 'justified') ? 'justified' : (req.body.status || 'graded'),
                tenantId,
                academicYear: req.user.academicYear || new Date().getFullYear()
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

            // [NEW] Check if student is at risk (Grades + Annotations)
            NotificationService.checkAndNotifyAtRisk(grade.estudianteId._id, grade.tenantId);

            res.status(201).json(grade);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    // Get all grades (Filtered by Tenant and User)
    static async getGrades(req, res) {
        try {
            const { courseId, subjectId, studentId: studentIdParam } = req.query;
            const currentYear = req.user.academicYear || new Date().getFullYear();
            const query = { 
                tenantId: req.user.tenantId,
                $or: [
                    { academicYear: currentYear },
                    { academicYear: { $exists: false } }
                ]
            };

            // 1. Role-based filtering
            if (req.user.role === 'student' && req.user.profileId) {
                query.estudianteId = req.user.profileId;
            }
            else if (req.user.role === 'apoderado' && req.user.profileId) {
                const Apoderado = await import('../models/apoderadoModel.js').then(m => m.default);
                const vinculation = await Apoderado.findById(req.user.profileId);
                if (vinculation) {
                    query.estudianteId = vinculation.estudianteId;
                } else {
                    return res.status(200).json([]);
                }
            }
            else if (studentIdParam) {
                query.estudianteId = studentIdParam;
            }

            // 2. Context-based filtering (Course/Subject)
            if (courseId || subjectId) {
                const Evaluation = await import('../models/evaluationModel.js').then(m => m.default);
                const evalQuery = { tenantId: req.user.tenantId };
                if (courseId) evalQuery.courseId = courseId;
                if (subjectId) evalQuery.subjectId = subjectId;
                
                const evaluations = await Evaluation.find(evalQuery).select('_id');
                const evalIds = evaluations.map(e => e._id);
                
                // If subjectId provided but no evaluations found, return empty
                if (subjectId && evalIds.length === 0) {
                    return res.status(200).json([]);
                }

                if (evalIds.length > 0) {
                    query.evaluationId = { $in: evalIds };
                }
            }
            // Fallback for teachers if no specific course/subject filter is applied
            else if (req.user.role === 'teacher') {
                const Course = await import('../models/courseModel.js').then(m => m.default);
                const Subject = await import('../models/subjectModel.js').then(m => m.default);
                const Evaluation = await import('../models/evaluationModel.js').then(m => m.default);

                const headCourses = await Course.find({ teacherId: req.user.userId, tenantId: req.user.tenantId }).select('_id');
                const subjectAssignments = await Subject.find({ teacherId: req.user.userId, tenantId: req.user.tenantId }).select('courseId');

                const teacherCourseIds = [
                    ...headCourses.map(c => c._id),
                    ...subjectAssignments.map(s => s.courseId)
                ];

                const teacherEvaluations = await Evaluation.find({
                    courseId: { $in: teacherCourseIds },
                    tenantId: req.user.tenantId
                }).select('_id');

                query.evaluationId = { $in: teacherEvaluations.map(e => e._id) };
            }

            const grades = await Grade.find(query)
                .populate('estudianteId', 'nombres apellidos')
                .populate('evaluationId', 'title maxScore subject'); // Added subject population
            res.status(200).json(grades);
        } catch (error) {
            console.error('getGrades Error:', error);
            res.status(500).json({ message: error.message });
        }
    }

    // Get grades by student (Secure)
    static async getGradesByStudent(req, res) {
        try {
            const requestedStudentId = req.params.estudianteId;

            // Security: If student, check if they are requesting their own ID
            if (req.user.role === 'student' && req.user.profileId?.toString() !== requestedStudentId) {
                return res.status(403).json({ message: 'Acceso denegado: solo puedes ver tus propias calificaciones' });
            }

            // Security: If guardian, check if the student belongs to them
            if (req.user.role === 'apoderado' && req.user.profileId) {
                const Apoderado = await import('../models/apoderadoModel.js').then(m => m.default);
                const vinculation = await Apoderado.findOne({ _id: req.user.profileId, estudianteId: requestedStudentId });
                if (!vinculation) {
                    return res.status(403).json({ message: 'Acceso denegado: este estudiante no está vinculado a tu cuenta' });
                }
            }

            const grades = await Grade.find({
                estudianteId: requestedStudentId,
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
            const query = {
                evaluationId: req.params.evaluationId,
                tenantId: req.user.tenantId
            };

            // [FIX] Security: Students/Guardians can only see their own grades
            if (req.user.role === 'student' && req.user.profileId) {
                query.estudianteId = req.user.profileId;
            } else if (req.user.role === 'apoderado' && req.user.profileId) {
                const Apoderado = await import('../models/apoderadoModel.js').then(m => m.default);
                const vinculation = await Apoderado.findById(req.user.profileId);
                if (vinculation) {
                    query.estudianteId = vinculation.estudianteId;
                } else {
                    return res.status(200).json([]);
                }
            } else if (req.user.role === 'student' || req.user.role === 'apoderado') {
                return res.status(403).json({ message: 'Acceso denegado' });
            }

            const grades = await Grade.find(query)
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

            // Security: Students can only see their own
            if (req.user.role === 'student' && req.user.profileId?.toString() !== grade.estudianteId._id.toString()) {
                return res.status(403).json({ message: 'Acceso denegado' });
            }

            // Security: Guardians can only see their linked student
            if (req.user.role === 'apoderado' && req.user.profileId) {
                const Apoderado = await import('../models/apoderadoModel.js').then(m => m.default);
                const vinculation = await Apoderado.findOne({ _id: req.user.profileId, estudianteId: grade.estudianteId._id });
                if (!vinculation) {
                    return res.status(403).json({ message: 'Acceso denegado' });
                }
            }

            res.status(200).json(grade);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Update a grade by ID (Secure)
    static async updateGrade(req, res) {
        try {
            if (req.user.role === 'inspector_general') {
                return res.status(403).json({ message: 'Los inspectores generales no tienen permiso para gestionar calificaciones.' });
            }

            const grade = await Grade.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
            if (!grade) {
                return res.status(404).json({ message: 'Calificación no encontrada' });
            }

            // Check if Subject is UTP-validated
            const Evaluation = await import('../models/evaluationModel.js').then(m => m.default);
            const Subject = await import('../models/subjectModel.js').then(m => m.default);
            const evaluationObj = await Evaluation.findOne({ _id: grade.evaluationId, tenantId: req.user.tenantId });
            if (evaluationObj) {
                const subjectObj = await Subject.findById(evaluationObj.subjectId);
                if (subjectObj && subjectObj.utpValidated) {
                    return res.status(403).json({ message: 'Este módulo técnico profesional ya ha sido firmado y cerrado oficialmente por UTP. Las calificaciones están bloqueadas.' });
                }
            }

            // Perform actual update
            const updatedGrade = await Grade.findOneAndUpdate(
                { _id: req.params.id, tenantId: req.user.tenantId },
                req.body,
                { new: true }
            )
                .populate('estudianteId', 'nombres apellidos')
                .populate('evaluationId', 'title maxScore');

            // Log update
            await AuditLog.create({
                action: 'UPDATE_GRADE',
                entityId: grade._id,
                entityType: 'Grade',
                user: req.user.userId,
                details: { oldScore: grade.score, newScore: req.body.score },
                tenantId: req.user.tenantId
            });

            // Notify Admins
            await NotificationService.broadcastToAdmins({
                tenantId: req.user.tenantId,
                title: 'Cambio de Calificación',
                message: `Se ha modificado la nota de ${grade.estudianteId.nombres} ${grade.estudianteId.apellidos} en ${grade.evaluationId.title}. Nueva nota: ${req.body.score}`,
                type: 'grade_change',
                link: '/grades'
            });

            res.status(200).json(grade);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    // Delete a grade by ID (Secure)
    static async deleteGrade(req, res) {
        try {
            if (req.user.role === 'inspector_general') {
                return res.status(403).json({ message: 'Los inspectores generales no tienen permiso para gestionar calificaciones.' });
            }

            const grade = await Grade.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
            if (!grade) {
                return res.status(404).json({ message: 'Calificación no encontrada' });
            }

            // Check if Subject is UTP-validated
            const Evaluation = await import('../models/evaluationModel.js').then(m => m.default);
            const Subject = await import('../models/subjectModel.js').then(m => m.default);
            const evaluationObj = await Evaluation.findOne({ _id: grade.evaluationId, tenantId: req.user.tenantId });
            if (evaluationObj) {
                const subjectObj = await Subject.findById(evaluationObj.subjectId);
                if (subjectObj && subjectObj.utpValidated) {
                    return res.status(403).json({ message: 'Este módulo técnico profesional ya ha sido firmado y cerrado oficialmente por UTP. Las calificaciones están bloqueadas y no se pueden eliminar.' });
                }
            }

            await Grade.findOneAndDelete({
                _id: req.params.id,
                tenantId: req.user.tenantId
            });

            // Log deletion
            await AuditLog.create({
                action: 'DELETE_GRADE',
                entityId: grade._id,
                entityType: 'Grade',
                user: req.user.userId,
                details: { score: grade.score, student: grade.estudianteId, evaluation: grade.evaluationId },
                tenantId: req.user.tenantId
            });

            // Notify Admins
            await NotificationService.broadcastToAdmins({
                tenantId: req.user.tenantId,
                title: 'Eliminación de Calificación',
                message: `Se ha eliminado una nota de ${grade.score} para la evaluación ${grade.evaluationId.title}.`,
                type: 'grade_change',
                link: '/grades'
            });

            res.status(204).send();
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Bulk Create or Update Grades
    static async bulkUpsertGrades(req, res) {
        try {
            if (req.user.role === 'inspector_general') {
                return res.status(403).json({ message: 'Los inspectores generales no tienen permiso para gestionar calificaciones.' });
            }

            const { grades } = req.body; // Array of { estudianteId, evaluationId, score }
            const tenantId = req.user.tenantId;

            if (!Array.isArray(grades)) {
                return res.status(400).json({ message: 'Se requiere un array de calificaciones' });
            }

            if (grades.length === 0) {
                return res.status(200).json([]);
            }

            // Check if any evaluation belongs to a UTP-validated subject
            const Evaluation = await import('../models/evaluationModel.js').then(m => m.default);
            const Subject = await import('../models/subjectModel.js').then(m => m.default);
            const evalIds = [...new Set(grades.map(g => g.evaluationId).filter(Boolean))];
            const evals = await Evaluation.find({ _id: { $in: evalIds }, tenantId });
            const subjectIds = [...new Set(evals.map(e => e.subjectId).filter(Boolean))];
            const validatedSubjects = await Subject.find({ _id: { $in: subjectIds }, utpValidated: true });
            if (validatedSubjects.length > 0) {
                return res.status(403).json({ message: 'Este módulo técnico profesional ya ha sido firmado y cerrado oficialmente por UTP. Las calificaciones están bloqueadas.' });
            }

            console.log(`bulkUpsertGrades: processing ${grades.length} grades for tenant ${tenantId}`);

            const results = await Promise.all(grades.map(async (g) => {
                // Skip entries without a score value
                if (g.score === undefined || g.score === null || g.score === '') return null;

                // Skip invalid entries
                if (!g.estudianteId || !g.evaluationId) {
                    console.warn('bulkUpsertGrades: skipping entry with missing IDs', g);
                    return null;
                }

                const parsedScore = parseFloat(g.score);
                if (isNaN(parsedScore)) {
                    console.warn('bulkUpsertGrades: skipping entry with invalid score:', g.score);
                    return null;
                }

                return Grade.findOneAndUpdate(
                    { 
                        estudianteId: g.estudianteId, 
                        evaluationId: g.evaluationId, 
                        tenantId 
                    },
                    { 
                        $set: {
                            score: parsedScore,
                            status: g.status || 'graded',
                            tenantId,
                            academicYear: req.user.academicYear || new Date().getFullYear()
                        }
                    },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
            }));

            const filteredResults = results.filter(r => r !== null);
            console.log(`bulkUpsertGrades: saved ${filteredResults.length} grades successfully`);
            res.status(200).json(filteredResults);
        } catch (error) {
            console.error('bulkUpsertGrades Error:', error);
            res.status(400).json({ message: error.message });
        }
    }
}

export default GradeController;
