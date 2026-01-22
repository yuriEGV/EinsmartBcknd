import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Grade from '../models/gradeModel.js';
import Anotacion from '../models/anotacionModel.js';
import Estudiante from '../models/estudianteModel.js';
import Evaluation from '../models/evaluationModel.js';
// Course model is loaded via mongoose.model('Course') usually if registered, or import it.
import Course from '../models/courseModel.js';

class AnalyticsController {
    // Get student averages by subject and overall average
    static async getStudentAnalytics(req, res) {
        try {
            await connectDB();
            const tenantId = req.user.role === 'admin' ? req.query.tenantId || req.user.tenantId : req.user.tenantId;
            const courseId = req.query.courseId;

            // Build match criteria
            const matchCriteria = { tenantId };
            if (courseId) {
                matchCriteria.courseId = courseId;
            }

            // Aggregate grades by student and subject
            const studentAverages = await Grade.aggregate([
                {
                    $lookup: {
                        from: 'evaluations',
                        localField: 'evaluationId',
                        foreignField: '_id',
                        as: 'evaluation'
                    }
                },
                { $unwind: '$evaluation' },
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
                    $group: {
                        _id: '$_id.studentId',
                        studentName: { $first: '$studentName' },
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
            return res.status(500).json({ message: error.message });
        }
    }

    // Get top students by average (best students in the school/course)
    static async getTopStudents(req, res) {
        try {
            await connectDB();
            const tenantId = req.user.role === 'admin' ? req.query.tenantId || req.user.tenantId : req.user.tenantId;
            const limit = parseInt(req.query.limit) || 10;

            const topStudents = await Grade.aggregate([
                {
                    $lookup: {
                        from: 'evaluations',
                        localField: 'evaluationId',
                        foreignField: '_id',
                        as: 'evaluation'
                    }
                },
                { $unwind: '$evaluation' },
                { $match: { tenantId } },
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
                { $sort: { overallAverage: -1 } },
                { $limit: limit }
            ]);

            return res.status(200).json(topStudents);
        } catch (error) {
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
                { $match: { tenantId, tipo: 'positiva' } },
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
                { $match: { tenantId, tipo: 'negativa' } },
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
                { $match: { tenantId } },
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
                        tenantId,
                        estudianteId: studentId
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
                { $match: { tenantId, estudianteId: studentId } },
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
            const studentCount = await Estudiante.countDocuments({ tenantId });

            // Count courses (from Course model, assuming we have one, or distinct from Enrollments/Subjects)
            // Let's check courseModel. Only distinct courses.
            // Import Course dynamically or at top if available.
            // For now assume 'Course' model exists or we use distinct logic if not imported.
            // Better: Import Course model at top.

            // We need to import Course model first. I'll add the import below.
            const courseCount = await mongoose.model('Course').countDocuments({ tenantId });

            return res.status(200).json({
                studentCount,
                courseCount,
                isTenantActive: true // Simplification for now
            });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }
}

export default AnalyticsController;
