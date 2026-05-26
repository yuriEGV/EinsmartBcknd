import mongoose from 'mongoose';
import os from 'os';
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
import ClassLog from '../models/classLogModel.js';
import Schedule from '../models/scheduleModel.js';
import Subject from '../models/subjectModel.js';

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
            const courseId = req.query.courseId ? new mongoose.Types.ObjectId(req.query.courseId) : null;

            // Build match criteria
            let matchCriteria = { tenantId: new mongoose.Types.ObjectId(tenantId) };

            // If courseId is provided, get students in that course first
            if (courseId) {
                const course = await Course.findById(courseId);
                if (course) {
                    // Find students whose grado matches the course name
                    const studentsInCourse = await Estudiante.find({
                        tenantId: new mongoose.Types.ObjectId(tenantId),
                        grado: { $regex: course.name, $options: 'i' }
                    });

                    const studentIdsInCourse = studentsInCourse.map(s => s._id);

                    if (studentIdsInCourse.length > 0) {
                        matchCriteria.estudianteId = { $in: studentIdsInCourse };
                    } else {
                        // No students in this course, return empty results
                        return res.status(200).json({
                            mostPositive: [],
                            mostNegative: [],
                            allStudents: []
                        });
                    }
                }
            }

            // Most positive annotations
            const positiveRankings = await Anotacion.aggregate([
                { $match: { ...matchCriteria, tipo: 'positiva' } },
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
                { $match: { ...matchCriteria, tipo: 'negativa' } },
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
                { $match: matchCriteria },
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

            let studentCount = 0;
            let courseCount = 0;

            if (req.user.role === 'teacher') {
                const Course = mongoose.model('Course');
                const Subject = mongoose.model('Subject');
                const Enrollment = mongoose.model('Enrollment');

                // 1. Find courses where teacher is Head Teacher
                const headCourses = await Course.find({ teacherId: req.user.userId, tenantId }).select('_id');
                // 2. Find courses where teacher teaches a Subject
                const subjectAssignments = await Subject.find({ teacherId: req.user.userId, tenantId }).select('courseId');

                const courseIds = new Set([
                    ...headCourses.map(c => c._id.toString()),
                    ...subjectAssignments.map(s => s.courseId.toString())
                ]);

                courseCount = courseIds.size;

                // 3. Count unique students in those courses
                if (courseCount > 0) {
                    const enrollments = await Enrollment.find({
                        courseId: { $in: Array.from(courseIds) },
                        tenantId
                    }).distinct('estudianteId');
                    studentCount = enrollments.length;
                }

            } else if (req.user.role === 'student' || req.user.role === 'alumno') {
                studentCount = 1;
                const Enrollment = mongoose.model('Enrollment');
                const enrollment = await Enrollment.findOne({
                    estudianteId: req.user.userId,
                    tenantId,
                    status: { $in: ['confirmada', 'activo', 'activa'] }
                });
                courseCount = enrollment ? 1 : 0;
            } else if (req.user.role === 'apoderado') {
                const Apoderado = mongoose.model('Apoderado');
                const Enrollment = mongoose.model('Enrollment');
                
                const apoderados = await Apoderado.find({ 
                    $or: [
                        { _id: req.user.profileId },
                        { correo: req.user.email }
                    ],
                    tenantId 
                });
                const studentIds = apoderados.map(a => a.estudianteId);
                studentCount = studentIds.length;

                const enrollments = await Enrollment.find({
                    estudianteId: { $in: studentIds },
                    tenantId,
                    status: { $in: ['confirmada', 'activo', 'activa'] }
                }).distinct('courseId');
                courseCount = enrollments.length;

            } else if (req.user.role === 'admin') {
                // [NEW] Global Admin stats for platform view (Einsmart Master)
                const [students, tenants, courses] = await Promise.all([
                    mongoose.model('Estudiante').countDocuments({}),
                    mongoose.model('Tenant').countDocuments({}),
                    mongoose.model('Course').countDocuments({})
                ]);
                return res.status(200).json({
                    studentCount: students,
                    tenantCount: tenants,
                    courseCount: courses,
                    isPlatformView: true
                });
            } else {
                // Admin/Director/Sostenedor see local school stats
                studentCount = await Estudiante.countDocuments({ tenantId: new mongoose.Types.ObjectId(tenantId) });

                const Course = mongoose.model('Course');
                courseCount = await Course.countDocuments({ tenantId: new mongoose.Types.ObjectId(tenantId) });
            }

            return res.status(200).json({
                studentCount,
                courseCount,
                isTenantActive: true
            });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    // Get ranking of debtors
    static async getDebtorRanking(req, res) {
        try {
            await connectDB();
            const tid = req.user.role === 'admin' ? req.query.tenantId || req.user.tenantId : req.user.tenantId;
            const tenantId = new mongoose.Types.ObjectId(tid);
            const courseId = req.query.courseId ? new mongoose.Types.ObjectId(req.query.courseId) : null;

            console.log('DEBTOR RANKING - Fetching for tenant:', tenantId, 'course:', courseId);

            // Match stage
            const matchStage = {
                tenantId,
                estado: { $in: ['pendiente', 'vencido'] } // Match with paymentModel.js enum
            };

            // If courseId is provided, filter by students in that course
            if (courseId) {
                const Enrollment = mongoose.model('Enrollment');
                const enrollments = await Enrollment.find({ courseId, tenantId }).select('estudianteId');
                const studentIds = enrollments.map(e => e.estudianteId);
                matchStage.estudianteId = { $in: studentIds };
            }

            const ranking = await Payment.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: '$estudianteId',
                        totalDebt: { $sum: '$amount' },
                        overdueCount: {
                            $sum: { $cond: [{ $eq: ['$estado', 'vencido'] }, 1, 0] }
                        },
                        pendingCount: {
                            $sum: { $cond: [{ $eq: ['$estado', 'pendiente'] }, 1, 0] }
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
                                                then: { $concat: ['$$principal.nombres', ' ', '$$principal.apellidos'] },
                                                else: { $concat: ['$$anyGuardian.nombres', ' ', '$$anyGuardian.apellidos'] }
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
                { $limit: 100 }
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

    // Get authority stats (High-level aggregated data for Sostenedor/Director/SuperAdmin)
    static async getAuthorityStats(req, res) {
        try {
            await connectDB();
            const tid = req.user.role === 'admin' ? req.query.tenantId || req.user.tenantId : req.user.tenantId;
            if (!tid) return res.status(400).json({ message: 'TenantId requerido' });

            const tenantId = new mongoose.Types.ObjectId(tid);

            // 1. Enrollment stats
            const studentCount = await Estudiante.countDocuments({ tenantId });

            // 2. Course count
            const Course = mongoose.model('Course');
            const courseCount = await Course.countDocuments({ tenantId });

            // 3. Average Attendance (Global)
            const attendanceStats = await mongoose.model('Attendance').aggregate([
                { $match: { tenantId } },
                {
                    $group: {
                        _id: '$estado',
                        count: { $sum: 1 }
                    }
                }
            ]);

            const totalAttendanceRecords = attendanceStats.reduce((acc, curr) => acc + curr.count, 0);
            const presentCount = attendanceStats.find(a => a._id === 'presente')?.count || 0;
            const globalAttendanceRate = totalAttendanceRecords > 0
                ? parseFloat(((presentCount / totalAttendanceRecords) * 100).toFixed(2))
                : 100;

            // 4. Global Grade Average
            const gradeStats = await Grade.aggregate([
                { $match: { tenantId } },
                {
                    $group: {
                        _id: null,
                        average: { $avg: '$score' },
                        total: { $sum: 1 }
                    }
                }
            ]);

            const globalGradeAverage = gradeStats.length > 0 ? parseFloat(gradeStats[0].average.toFixed(2)) : 0;

            // 5. Recent "Movements" (Just a count/summary for now)
            const recentEnrollments = await Estudiante.find({ tenantId }).sort({ createdAt: -1 }).limit(5);

            return res.status(200).json({
                studentCount,
                courseCount,
                globalAttendanceRate,
                globalGradeAverage,
                recentActivities: recentEnrollments.map(s => ({
                    type: 'new_enrollment',
                    title: 'Nueva Matrícula',
                    message: `Se ha matriculado a ${s.nombres} ${s.apellidos}`,
                    date: s.createdAt
                }))
            });

        } catch (error) {
            console.error('Authority Stats Error:', error);
            return res.status(500).json({ message: error.message });
        }
    }

    // Get Class Book Metrics (Effective Time in Classroom)
    // Get ranking of users with most medical licenses
    static async getMedicalLicenseRanking(req, res) {
        try {
            await connectDB();
            const tid = req.user.role === 'admin' ? req.query.tenantId || req.user.tenantId : req.user.tenantId;
            const tenantId = new mongoose.Types.ObjectId(tid);

            const MedicalLicense = mongoose.model('MedicalLicense');

            const ranking = await MedicalLicense.aggregate([
                { $match: { tenantId, estado: 'Aprobado' } },
                {
                    $group: {
                        _id: '$userId',
                        totalDays: { $sum: '$diasReposo' },
                        licenseCount: { $sum: 1 },
                        userType: { $first: '$userType' }
                    }
                },
                { $sort: { totalDays: -1 } },
                { $limit: 20 },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'userData'
                    }
                },
                {
                    $lookup: {
                        from: 'estudiantes',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'studentData'
                    }
                },
                {
                    $addFields: {
                        name: {
                            $cond: {
                                if: { $eq: ['$userType', 'Estudiante'] },
                                then: {
                                    $let: {
                                        vars: { s: { $arrayElemAt: ['$studentData', 0] } },
                                        in: { $concat: ['$$s.nombres', ' ', '$$s.apellidos'] }
                                    }
                                },
                                else: { $arrayElemAt: ['$userData.name', 0] }
                            }
                        }
                    }
                },
                {
                    $project: {
                        studentData: 0,
                        userData: 0
                    }
                }
            ]);

            return res.status(200).json(ranking);
        } catch (error) {
            console.error('Medical License Ranking Error:', error);
            return res.status(500).json({ message: error.message });
        }
    }

    // Get Class Book Metrics (Effective Time in Classroom + Teacher Efficiency)
    static async getClassBookMetrics(req, res) {
        try {
            await connectDB();
            const tid = req.user.role === 'admin' ? req.query.tenantId || req.user.tenantId : req.user.tenantId;
            const tenantId = new mongoose.Types.ObjectId(tid);
            const { startDate, endDate, range } = req.query;

            const matchCriteria = { tenantId };
            
            // Handle specific ranges (week, month, year)
            if (range) {
                const now = new Date();
                let start = new Date();
                if (range === 'week') start.setDate(now.getDate() - 7);
                else if (range === 'month') start.setMonth(now.getMonth() - 1);
                else if (range === 'year') start.setFullYear(now.getFullYear() - 1);
                
                matchCriteria.date = { $gte: start, $lte: now };
            } else if (startDate || endDate) {
                matchCriteria.date = {};
                if (startDate) matchCriteria.date.$gte = new Date(startDate);
                if (endDate) matchCriteria.date.$lte = new Date(endDate);
            }

            // 1. Calculate Effective Time per Course/Subject
            const classTimeMetrics = await ClassLog.aggregate([
                { $match: matchCriteria },
                {
                    $group: {
                        _id: {
                            courseId: '$courseId',
                            subjectId: '$subjectId',
                            date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                            bloqueHorario: '$bloqueHorario'
                        },
                        // Use effectiveDuration when signed, fallback to duration for unsigned
                        totalDuration: {
                            $sum: {
                                $cond: [
                                    { $gt: ['$effectiveDuration', 0] },
                                    '$effectiveDuration',
                                    { $ifNull: ['$duration', 0] }
                                ]
                            }
                        },
                        totalDelay: { $sum: '$delayMinutes' },
                        totalInterruption: { $sum: '$interruptionMinutes' },
                        classCount: { $sum: 1 }
                    }
                },
                {
                    $lookup: {
                        from: 'courses',
                        localField: '_id.courseId',
                        foreignField: '_id',
                        as: 'course'
                    }
                },
                {
                    $lookup: {
                        from: 'subjects',
                        localField: '_id.subjectId',
                        foreignField: '_id',
                        as: 'subject'
                    }
                },
                { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } },
                { $unwind: { path: '$subject', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        courseName: { $ifNull: ['$course.name', 'Desconocido'] },
                        subjectName: { $ifNull: ['$subject.name', 'Desconocido'] },
                        date: '$_id.date',
                        bloqueHorario: '$_id.bloqueHorario',
                        totalDuration: 1,
                        totalDelay: 1,
                        totalInterruption: 1,
                        classCount: 1
                    }
                }
            ]);

            // 2. Teachers with UNSIGNED class logs (critical alerts for Director/UTP)
            const unsignedClasses = await ClassLog.aggregate([
                {
                    $match: {
                        tenantId,
                        isSigned: false,
                        $or: [
                            { startTime: { $exists: true, $ne: null } },
                            { topic: { $exists: true, $ne: '' } }
                        ]
                    }
                },
                {
                    $group: {
                        _id: '$teacherId',
                        unsignedCount: { $sum: 1 },
                        lastUnsignedDate: { $max: '$date' }
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'teacher'
                    }
                },
                { $unwind: { path: '$teacher', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        teacherName: { $ifNull: ['$teacher.name', 'Profesor desconocido'] },
                        unsignedCount: 1,
                        lastUnsignedDate: 1
                    }
                },
                { $sort: { lastUnsignedDate: -1 } }
            ]);

            // 3. Global Coverage %
            const totalScheduled = await Schedule.countDocuments({ tenantId });
            const totalRealized = await ClassLog.countDocuments({ tenantId, isSigned: true });

            const globalCoverage = totalScheduled > 0
                ? parseFloat(((totalRealized / (totalScheduled * 4)) * 100).toFixed(2))
                : 100;

            // 4. Teacher Efficiency Ranking (Includes all teachers)
            const allTeachers = await User.find({ tenantId, role: 'teacher' }).select('_id name');
            const teacherStats = await ClassLog.aggregate([
                { $match: { ...matchCriteria, isSigned: true } },
                {
                    $group: {
                        _id: '$teacherId',
                        signedClasses: { $sum: 1 },
                        totalEffectiveMinutes: { $sum: '$effectiveDuration' },
                        totalLostMinutes: { $sum: { $add: ['$delayMinutes', '$interruptionMinutes'] } }
                    }
                }
            ]);

            const teacherEfficiency = allTeachers.map(teacher => {
                const stats = teacherStats.find(t => t._id.equals(teacher._id)) || {
                    signedClasses: 0,
                    totalEffectiveMinutes: 0,
                    totalLostMinutes: 0
                };
                
                const totalMins = stats.totalEffectiveMinutes + stats.totalLostMinutes;
                return {
                    teacherName: teacher.name,
                    signedClasses: stats.signedClasses,
                    totalEffectiveMinutes: stats.totalEffectiveMinutes,
                    totalLostMinutes: stats.totalLostMinutes,
                    efficiency: totalMins > 0 ? parseFloat(((stats.totalEffectiveMinutes / totalMins) * 100).toFixed(2)) : 100
                };
            }).sort((a, b) => b.signedClasses - a.signedClasses);

            return res.status(200).json({
                globalCoverage,
                classTimeMetrics,
                teacherEfficiency,
                unsignedClasses,
                stats: {
                    totalRealized,
                    totalLostGlobal: teacherStats.reduce((acc, curr) => acc + curr.totalLostMinutes, 0),
                    totalEffectiveGlobal: teacherStats.reduce((acc, curr) => acc + curr.totalEffectiveMinutes, 0)
                }
            });
        } catch (error) {
            console.error('Class Book Metrics Error:', error);
            return res.status(500).json({ message: error.message });
        }
    }
    // [MASTER ONLY] Get Node/System Health
    static async getSystemHealth(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Acceso restringido a Overlord' });
            }

            const uptime = os.uptime();
            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            const cpuLoad = os.loadavg(); // [1m, 5m, 15m]

            const dbStatus = mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado';
            
            // Count tenants and students globally
            const [tenantCount, studentCount] = await Promise.all([
                mongoose.model('Tenant').countDocuments({}),
                mongoose.model('Estudiante').countDocuments({})
            ]);

            return res.status(200).json({
                system: {
                    platform: os.platform(),
                    cpuCount: os.cpus().length,
                    cpuLoad: cpuLoad[0], // 1 min load
                    memoryUsage: ((totalMem - freeMem) / totalMem * 100).toFixed(2),
                    totalMemGB: (totalMem / (1024 ** 3)).toFixed(2),
                    uptime: Math.floor(uptime / 3600), // hours
                    dbStatus
                },
                node: {
                    tenantCount,
                    studentCount
                },
                timestamp: new Date()
            });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    // [MASTER ONLY] Get Global Platform Trends
    static async getGlobalTrends(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Acceso restringido' });
            }

            const trends = await mongoose.model('Estudiante').aggregate([
                {
                    $group: {
                        _id: {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { "_id.year": 1, "_id.month": 1 } },
                { $limit: 12 }
            ]);

            const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
            const formatted = trends.map(t => ({
                name: `${monthNames[t._id.month - 1]} ${t._id.year}`,
                value: t.count
            }));

            return res.status(200).json(formatted);
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    // [MASTER ONLY] Get Global Academic Performance across all institutions
    static async getGlobalAcademicPerformance(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Acceso restringido' });
            }

            const Tenant = mongoose.model('Tenant');
            const Estudiante = mongoose.model('Estudiante');
            const Grade = mongoose.model('Grade');
            const Attendance = mongoose.model('Attendance');
            const Course = mongoose.model('Course');

            const tenants = await Tenant.find();
            
            const results = await Promise.all(tenants.map(async (tenant) => {
                const tenantId = tenant._id;

                const [studentCount, courseCount] = await Promise.all([
                    Estudiante.countDocuments({ tenantId }),
                    Course.countDocuments({ tenantId })
                ]);

                const gradeStats = await Grade.aggregate([
                    { $match: { tenantId } },
                    { $group: { _id: null, avg: { $avg: "$score" } } }
                ]);
                const averageGrade = gradeStats.length > 0 ? parseFloat(gradeStats[0].avg.toFixed(2)) : 0;

                const attendanceStats = await Attendance.aggregate([
                    { $match: { tenantId } },
                    { $group: { _id: "$estado", count: { $sum: 1 } } }
                ]);
                const totalAttendance = attendanceStats.reduce((sum, s) => sum + s.count, 0);
                const presentCount = attendanceStats.find(a => a._id === 'presente')?.count || 0;
                const attendanceRate = totalAttendance > 0 ? parseFloat(((presentCount / totalAttendance) * 100).toFixed(2)) : 100;

                return {
                    id: tenant._id,
                    name: tenant.name,
                    domain: tenant.domain,
                    stats: {
                        studentCount,
                        courseCount,
                        averageGrade,
                        attendanceRate,
                        riskProfile: averageGrade < 4.5 || attendanceRate < 90 ? 'Atención Requerida' : 'Salud Educativa Óptima'
                    }
                };
            }));

            return res.status(200).json(results);
        } catch (error) {
            console.error('Global Academic Performance Error:', error);
            return res.status(500).json({ message: error.message });
        }
    }

    // Get ranking of student punctuality and attendance from class book logs
    static async getPunctualityRanking(req, res) {
        try {
            await connectDB();
            const tid = req.user.role === 'admin' ? req.query.tenantId || req.user.tenantId : req.user.tenantId;
            const tenantId = new mongoose.Types.ObjectId(tid);
            const courseId = req.query.courseId ? new mongoose.Types.ObjectId(req.query.courseId) : null;

            // 1. Build student match criteria
            let studentMatch = { tenantId };
            if (courseId) {
                const Enrollment = mongoose.model('Enrollment');
                const enrollments = await Enrollment.find({ courseId, tenantId }).select('estudianteId');
                const studentIds = enrollments.map(e => e.estudianteId);
                studentMatch._id = { $in: studentIds };
            }

            // Get all students matching criteria
            const students = await Estudiante.find(studentMatch).select('_id nombres apellidos grado');
            const studentIds = students.map(s => s._id);

            const Attendance = mongoose.model('Attendance');

            // 2. Aggregate Attendance data for these students
            const attendanceStats = await Attendance.aggregate([
                {
                    $match: {
                        tenantId,
                        estudianteId: { $in: studentIds }
                    }
                },
                {
                    $group: {
                        _id: '$estudianteId',
                        totalDays: { $sum: 1 },
                        presentDays: {
                            $sum: {
                                $cond: [{ $in: ['$estado', ['presente', 'atraso', 'retiro_anticipado']] }, 1, 0]
                            }
                        },
                        absentDays: {
                            $sum: {
                                $cond: [{ $eq: ['$estado', 'ausente'] }, 1, 0]
                            }
                        },
                        tardinessCount: {
                            $sum: {
                                $cond: [{ $eq: ['$estado', 'atraso'] }, 1, 0]
                            }
                        },
                        totalDelayMinutes: { $sum: { $ifNull: ['$minutosAtraso', 0] } }
                    }
                }
            ]);

            // Map and combine results
            const statsMap = new Map(attendanceStats.map(s => [s._id.toString(), s]));

            const ranking = students.map(student => {
                const stats = statsMap.get(student._id.toString()) || {
                    totalDays: 0,
                    presentDays: 0,
                    absentDays: 0,
                    tardinessCount: 0,
                    totalDelayMinutes: 0
                };

                const totalAtt = stats.presentDays + stats.absentDays;
                const attendanceRate = totalAtt > 0
                    ? parseFloat(((stats.presentDays / totalAtt) * 100).toFixed(1))
                    : 100.0;

                return {
                    studentId: student._id,
                    studentName: `${student.apellidos}, ${student.nombres}`,
                    grado: student.grado,
                    attendanceRate,
                    tardinessCount: stats.tardinessCount,
                    totalDelayMinutes: stats.totalDelayMinutes
                };
            });

            // Sort by: most delays first, then total minutes of delay, then attendance rate lowest
            ranking.sort((a, b) => b.tardinessCount - a.tardinessCount || b.totalDelayMinutes - a.totalDelayMinutes || a.attendanceRate - b.attendanceRate);

            return res.status(200).json(ranking);
        } catch (error) {
            console.error('Punctuality Ranking Error:', error);
            return res.status(500).json({ message: error.message });
        }
    }
}

export default AnalyticsController;
