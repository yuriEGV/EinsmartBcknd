import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Grade from '../models/gradeModel.js';
import Anotacion from '../models/anotacionModel.js';
import Estudiante from '../models/estudianteModel.js';
import Evaluation from '../models/evaluationModel.js';
// Course model is loaded via mongoose.model('Course') usually if registered, or import it.
import Course from '../models/courseModel.js';
import Payment from '../models/paymentModel.js';
import NotificationService from '../services/notificationService.js'; // Assuming it's needed or just for hygiene
import '../models/courseModel.js'; // Ensure registered

class AnalyticsController {
    // Get student averages by subject and overall average
    static async getStudentAnalytics(req, res) {
        try {
            await connectDB();
            const tid = req.user.role === 'admin' ? req.query.tenantId || req.user.tenantId : req.user.tenantId;
            const tenantId = new mongoose.Types.ObjectId(tid);
            const courseId = req.query.courseId ? new mongoose.Types.ObjectId(req.query.courseId) : null;

            // Build match criteria for grades
            const matchCriteria = { tenantId };
            if (courseId) {
                // If courseId is provided, we filter by it. 
                // Note: Grade model doesn't have courseId directly, but Evaluation does.
            }

            // Aggregate grades by student and subject
            const studentAverages = await Grade.aggregate([
                { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } }, // Filter by tenant first for performance
                {
                    $lookup: {
                        from: 'evaluations',
                        localField: 'evaluationId',
                        foreignField: '_id',
                        as: 'evaluation'
                    }
                },
                { $unwind: '$evaluation' },
                // Filter by course if specified
                ...(courseId ? [{ $match: { 'evaluation.courseId': courseId } }] : []),
                {
                    $lookup: {
                        from: 'estudiantes',
                        localField: 'estudianteId',
                        foreignField: '_id',
                        as: 'student'
                    }
                },
                { $unwind: '$student' },
                {
                    $group: {
                        _id: {
                            studentId: '$estudianteId',
                            subject: '$evaluation.subject'
                        },
                        studentName: { $first: { $concat: ['$student.nombres', ' ', '$student.apellidos'] } },
                        subject: { $first: '$evaluation.subject' },
                        averageScore: { $avg: '$score' },
                        gradeCount: { $sum: 1 },
                        maxScore: { $first: '$evaluation.maxScore' }
                    }
                },
                {
                    $lookup: {
                        from: 'apoderados',
                        localField: '_id.studentId',
                        foreignField: 'estudianteId',
                        as: 'guardian'
                    }
                },
                {
                    $group: {
                        _id: '$_id.studentId',
                        studentName: { $first: '$studentName' },
                        guardianName: {
                            $first: {
                                $let: {
                                    vars: { g: { $arrayElemAt: ['$guardian', 0] } },
                                    in: { $concat: ['$$g.nombres', ' ', '$$g.apellidos'] }
                                }
                            }
                        },
                        subjectAverages: {
                            $push: {
                                subject: '$subject',
                                average: '$averageScore',
                                gradeCount: '$gradeCount',
                                maxScore: '$maxScore',
                                percentage: { $multiply: [{ $divide: ['$averageScore', '$maxScore'] }, 100] }
                            }
                        }
                    }
                },
                {
                    $addFields: {
                        overallAverage: { $avg: '$subjectAverages.average' },
                        passingStatus: {
                            $cond: [
                                { $gte: [{ $avg: '$subjectAverages.average' }, 4.0] },
                                'Aprueba',
                                'En Riesgo'
                            ]
                        }
                    }
                },
                { $sort: { overallAverage: -1 } }
            ]);

            return res.status(200).json(studentAverages);
        } catch (error) {
            console.error('Analytics Error:', error);
            return res.status(500).json({ message: error.message });
        }
    }

    // Get top students by average (best students in the school/course)
    static async getTopStudents(req, res) {
        try {
            await connectDB();
            const tid = req.user.role === 'admin' ? req.query.tenantId || req.user.tenantId : req.user.tenantId;
            const tenantId = new mongoose.Types.ObjectId(tid);
            const limit = parseInt(req.query.limit) || 10;

            const topStudents = await Grade.aggregate([
                { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
                {
                    $lookup: {
                        from: 'evaluations',
                        localField: 'evaluationId',
                        foreignField: '_id',
                        as: 'evaluation'
                    }
                },
                { $unwind: '$evaluation' },
                {
                    $lookup: {
                        from: 'estudiantes',
                        localField: 'estudianteId',
                        foreignField: '_id',
                        as: 'student'
                    }
                },
                { $unwind: '$student' },
                {
                    $group: {
                        _id: '$estudianteId',
                        studentName: { $first: { $concat: ['$student.nombres', ' ', '$student.apellidos'] } },
                        email: { $first: '$student.email' },
                        grado: { $first: '$student.grado' },
                        overallAverage: { $avg: '$score' },
                        totalGrades: { $sum: 1 }
                    }
                },
                {
                    $lookup: {
                        from: 'apoderados',
                        localField: '_id',
                        foreignField: 'estudianteId',
                        as: 'guardian'
                    }
                },
                {
                    $addFields: {
                        guardianName: {
                            $let: {
                                vars: { g: { $arrayElemAt: ['$guardian', 0] } },
                                in: { $concat: ['$$g.nombres', ' ', '$$g.apellidos'] }
                            }
                        }
                    }
                },
                { $sort: { overallAverage: -1 } },
                { $limit: limit }
            ]);

            return res.status(200).json(topStudents);
        } catch (error) {
            console.error('Top Students Error:', error);
            return res.status(500).json({ message: error.message });
        }
    }

    // Get annotation rankings (most positive and most negative)
    static async getAnnotationRankings(req, res) {
        try {
            await connectDB();
            const tenantId = req.user.role === 'admin' ? req.query.tenantId || req.user.tenantId : req.user.tenantId;

            // Most positive annotations
            const positiveRankings = await Anotacion.aggregate([
                { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), tipo: 'positiva' } },
                {
                    $lookup: {
                        from: 'estudiantes',
                        localField: 'estudianteId',
                        foreignField: '_id',
                        as: 'student'
                    }
                },
                { $unwind: '$student' },
                {
                    $group: {
                        _id: '$estudianteId',
                        studentName: { $first: { $concat: ['$student.nombres', ' ', '$student.apellidos'] } },
                        grado: { $first: '$student.grado' },
                        positiveCount: { $sum: 1 }
                    }
                },
                { $sort: { positiveCount: -1 } },
                { $limit: 10 }
            ]);

            // Most negative annotations
            const negativeRankings = await Anotacion.aggregate([
                { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), tipo: 'negativa' } },
                {
                    $lookup: {
                        from: 'estudiantes',
                        localField: 'estudianteId',
                        foreignField: '_id',
                        as: 'student'
                    }
                },
                { $unwind: '$student' },
                {
                    $group: {
                        _id: '$estudianteId',
                        studentName: { $first: { $concat: ['$student.nombres', ' ', '$student.apellidos'] } },
                        grado: { $first: '$student.grado' },
                        negativeCount: { $sum: 1 }
                    }
                },
                { $sort: { negativeCount: -1 } },
                { $limit: 10 }
            ]);

            // Combined view (all students with both counts)
            const combinedRankings = await Anotacion.aggregate([
                { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
                {
                    $lookup: {
                        from: 'estudiantes',
                        localField: 'estudianteId',
                        foreignField: '_id',
                        as: 'student'
                    }
                },
                { $unwind: '$student' },
                {
                    $group: {
                        _id: '$estudianteId',
                        studentName: { $first: { $concat: ['$student.nombres', ' ', '$student.apellidos'] } },
                        grado: { $first: '$student.grado' },
                        positiveCount: {
                            $sum: { $cond: [{ $eq: ['$tipo', 'positiva'] }, 1, 0] }
                        },
                        negativeCount: {
                            $sum: { $cond: [{ $eq: ['$tipo', 'negativa'] }, 1, 0] }
                        },
                        totalAnnotations: { $sum: 1 }
                    }
                },
                {
                    $addFields: {
                        behaviorScore: {
                            $subtract: ['$positiveCount', '$negativeCount']
                        }
                    }
                },
                { $sort: { behaviorScore: -1 } }
            ]);

            return res.status(200).json({
                mostPositive: positiveRankings,
                mostNegative: negativeRankings,
                allStudents: combinedRankings
            });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    // Get detailed student performance (for individual student view)
    static async getStudentPerformance(req, res) {
        try {
            await connectDB();
            const { studentId } = req.params;
            const tenantId = req.user.tenantId;

            // Grade averages by subject
            const gradesBySubject = await Grade.aggregate([
                {
                    $lookup: {
                        from: 'evaluations',
                        localField: 'evaluationId',
                        foreignField: '_id',
                        as: 'evaluation'
                    }
                },
                { $unwind: '$evaluation' },
                {
                    $match: {
                        tenantId: new mongoose.Types.ObjectId(tenantId),
                        estudianteId: new mongoose.Types.ObjectId(studentId)
                    }
                },
                {
                    $group: {
                        _id: '$evaluation.subject',
                        average: { $avg: '$score' },
                        gradeCount: { $sum: 1 },
                        maxScore: { $first: '$evaluation.maxScore' }
                    }
                }
            ]);

            // Annotation counts
            const annotations = await Anotacion.aggregate([
                { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), estudianteId: new mongoose.Types.ObjectId(studentId) } },
                {
                    $group: {
                        _id: '$tipo',
                        count: { $sum: 1 }
                    }
                }
            ]);

            const annotationCounts = {
                positiva: annotations.find(a => a._id === 'positiva')?.count || 0,
                negativa: annotations.find(a => a._id === 'negativa')?.count || 0
            };

            // Overall average
            const overallAvg = gradesBySubject.length > 0
                ? gradesBySubject.reduce((sum, s) => sum + s.average, 0) / gradesBySubject.length
                : 0;

            return res.status(200).json({
                studentId,
                subjectAverages: gradesBySubject,
                overallAverage: overallAvg,
                passingStatus: overallAvg >= 4.0 ? 'Aprueba' : 'En Riesgo',
                annotations: annotationCounts
            });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }
    // Get dashboard stats (counts)
    static async getDashboardStats(req, res) {
        try {
            await connectDB();
            const tenantId = req.user.tenantId;

            // Count students
            const studentCount = await Estudiante.countDocuments({ tenantId: new mongoose.Types.ObjectId(tenantId) });

            // Count courses
            const Course = mongoose.model('Course');
            const courseCount = await Course.countDocuments({ tenantId: new mongoose.Types.ObjectId(tenantId) });

            return res.status(200).json({
                studentCount,
                courseCount,
                isTenantActive: true // Simplification for now
            });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    // Get ranking of debtors
    static async getDebtorRanking(req, res) {
        try {
            await connectDB();
            const tenantId = new mongoose.Types.ObjectId(req.user.tenantId);

            console.log('DEBTOR RANKING - Fetching for tenant:', tenantId);

            const ranking = await Payment.aggregate([
                {
                    $match: {
                        tenantId,
                        status: { $in: ['pending', 'rejected'] } // Pending = unpaid debts, rejected = failed payments
                    }
                },
                {
                    $group: {
                        _id: '$estudianteId',
                        totalDebt: { $sum: '$amount' },
                        overdueCount: {
                            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
                        },
                        pendingCount: {
                            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                        },
                        lastPaymentDate: { $max: '$createdAt' }
                    }
                },
                {
                    $lookup: {
                        from: 'estudiantes',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'student'
                    }
                },
                { $unwind: '$student' },
                {
                    $lookup: {
                        from: 'apoderados',
                        localField: 'student._id',
                        foreignField: 'estudianteId',
                        as: 'guardians'
                    }
                },
                {
                    $addFields: {
                        guardianName: {
                            $cond: {
                                if: { $gt: [{ $size: '$guardians' }, 0] },
                                then: {
                                    $let: {
                                        vars: {
                                            principal: {
                                                $arrayElemAt: [
                                                    { $filter: { input: '$guardians', as: 'g', cond: { $eq: ['$$g.tipo', 'principal'] } } },
                                                    0
                                                ]
                                            },
                                            anyGuardian: { $arrayElemAt: ['$guardians', 0] }
                                        },
                                        in: {
                                            $cond: {
                                                if: { $ne: ['$$principal', null] },
                                                then: { $concat: ['$$principal.nombre', ' ', '$$principal.apellidos'] },
                                                else: { $concat: ['$$anyGuardian.nombre', ' ', '$$anyGuardian.apellidos'] }
                                            }
                                        }
                                    }
                                },
                                else: 'Sin Apoderado'
                            }
                        },
                        studentName: { $concat: ['$student.nombres', ' ', '$student.apellidos'] }
                    }
                },
                { $sort: { totalDebt: -1 } },
                { $limit: 50 }
            ]);

            console.log('DEBTOR RANKING - Found', ranking.length, 'debtors');
            return res.status(200).json(ranking);
        } catch (error) {
            console.error('Debtor Ranking Error:', error);
            return res.status(500).json({ message: error.message });
        }
    }

    static async getPerformanceTrends(req, res) {
        try {
            await connectDB();
            const tid = req.user.role === 'admin' ? req.query.tenantId || req.user.tenantId : req.user.tenantId;
            const tenantId = new mongoose.Types.ObjectId(tid);

            // Group grades by month
            const trends = await Grade.aggregate([
                { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
                {
                    $group: {
                        _id: {
                            month: { $month: '$createdAt' },
                            year: { $year: '$createdAt' }
                        },
                        averageScore: { $avg: '$score' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]);

            // Format for charts: { month: 'Mar', average: 5.4 }
            const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
            const formattedTrends = trends.map(t => ({
                month: `${monthNames[t._id.month - 1]} ${t._id.year}`,
                average: parseFloat(t.averageScore.toFixed(2)),
                count: t.count
            }));

            return res.status(200).json(formattedTrends);
        } catch (error) {
            console.error('Trends Error:', error);
            return res.status(500).json({ message: error.message });
        }
    }
}

export default AnalyticsController;
