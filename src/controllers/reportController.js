import mongoose from 'mongoose';
import Report from '../models/reportModel.js';
import NotificationService from '../services/notificationService.js';

class ReportController {
    static async createReport(req, res) {
        try {
            const { tipo, formato, filtros } = req.body;
            const tenantId = req.user.tenantId;

            if (!tipo || !formato) {
                return res.status(400).json({
                    message: 'tipo y formato son obligatorios'
                });
            }

            const report = await Report.create({
                tenantId,
                type: tipo,        // ✅ MAPEO CORRECTO
                format: formato,   // ✅ MAPEO CORRECTO
                filters: filtros
            });

            res.status(201).json(report);

        } catch (error) {
            console.error('Report error:', error);
            res.status(500).json({ message: error.message });
        }
    }

    static async getStudentSummary(req, res) {
        try {
            const { studentId } = req.params;
            const tenantId = req.user.tenantId;

            // Role-based access control
            if (req.user.role === 'student' && req.user.profileId !== studentId) {
                return res.status(403).json({ message: 'Acceso denegado' });
            }

            if (req.user.role === 'apoderado' && req.user.profileId) {
                const Apoderado = await import('../models/apoderadoModel.js').then(m => m.default);
                const vinculation = await Apoderado.findById(req.user.profileId);
                if (!vinculation || vinculation.estudianteId.toString() !== studentId) {
                    return res.status(403).json({ message: 'Acceso denegado' });
                }
            } else if ((req.user.role === 'student' || req.user.role === 'apoderado') && !req.user.profileId) {
                return res.status(403).json({ message: 'Acceso denegado' });
            }

            const Estudiante = await import('../models/estudianteModel.js').then(m => m.default);
            const Grade = await import('../models/gradeModel.js').then(m => m.default);
            const Attendance = await import('../models/attendanceModel.js').then(m => m.default);
            const Anotacion = await import('../models/anotacionModel.js').then(m => m.default);

            const [student, grades, attendance, annotations] = await Promise.all([
                Estudiante.findById(studentId).select('nombres apellidos rut grado'),
                Grade.find({ estudianteId: studentId, tenantId }).populate({
                    path: 'evaluationId',
                    populate: { path: 'subjectId', select: 'name' }
                }),
                Attendance.find({ estudianteId: studentId, tenantId }).sort({ fecha: -1 }),
                Anotacion.find({ estudianteId: studentId, tenantId }).populate('creadoPor', 'name').sort({ createdAt: -1 })
            ]);

            if (!student) return res.status(404).json({ message: 'Estudiante no encontrado' });

            res.status(200).json({
                student,
                grades: grades.map(g => ({
                    title: g.evaluationId?.title || 'Evaluación',
                    subjectName: g.evaluationId?.subjectId?.name || 'Varios',
                    score: g.score,
                    maxScore: g.evaluationId?.maxScore,
                    date: g.evaluationId?.date || g.createdAt
                })),
                attendance: {
                    total: attendance.length,
                    present: attendance.filter(a => a.estado === 'presente').length,
                    absent: attendance.filter(a => a.estado === 'ausente').length,
                    history: attendance.slice(0, 10) // Last 10 days
                },
                annotations: annotations.map(a => ({
                    tipo: a.tipo,
                    titulo: a.titulo,
                    descripcion: a.descripcion,
                    fecha: a.fechaOcurrencia || a.createdAt,
                    autor: a.creadoPor?.name
                }))
            });
        } catch (error) {
            console.error('Student summary error:', error);
            res.status(500).json({ message: error.message });
        }
    }

    static async getWeeklyClassPerformance(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const ClassLog = await import('../models/classLogModel.js').then(m => m.default);

            // Calculate 7 days ago
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const performance = await ClassLog.aggregate([
                {
                    $match: {
                        tenantId: new mongoose.Types.ObjectId(tenantId),
                        isSigned: true,
                        signedAt: { $gte: sevenDaysAgo }
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'teacherId',
                        foreignField: '_id',
                        as: 'teacher'
                    }
                },
                {
                    $lookup: {
                        from: 'courses',
                        localField: 'courseId',
                        foreignField: '_id',
                        as: 'course'
                    }
                },
                {
                    $lookup: {
                        from: 'subjects',
                        localField: 'subjectId',
                        foreignField: '_id',
                        as: 'subject'
                    }
                },
                { $unwind: '$teacher' },
                { $unwind: '$course' },
                { $unwind: '$subject' },
                {
                    $group: {
                        _id: {
                            teacherId: '$teacherId',
                            teacherName: '$teacher.name',
                            courseName: '$course.name',
                            subjectName: '$subject.name'
                        },
                        totalMinutes: { $sum: '$duration' },
                        classesCount: { $sum: 1 },
                        avgDuration: { $avg: '$duration' }
                    }
                },
                { $sort: { '_id.teacherName': 1, totalMinutes: -1 } }
            ]);

            // Trigger notification to Sostenedors (automated weekly report)
            await NotificationService.notifyWeeklyPerformance(tenantId, performance);

            res.json(performance);
        } catch (error) {
            console.error('Weekly performance error:', error);
            res.status(500).json({ message: error.message });
        }
    }
}

export default ReportController;
