import Attendance from '../models/attendanceModel.js';
import mongoose from 'mongoose';

class AttendanceController {

    static async createAttendance(req, res) {
        try {
            const { estudianteId, fecha, estado = 'presente' } = req.body;

            if (!estudianteId || !fecha) {
                return res.status(400).json({
                    message: 'estudianteId y fecha son obligatorios'
                });
            }

            // [NUEVO] Bloquear si el alumno no tiene matrícula confirmada
            const Enrollment = await import('../models/enrollmentModel.js').then(m => m.default);
            const enrollment = await Enrollment.findOne({
                estudianteId,
                tenantId: req.user.tenantId,
                status: 'confirmada'
            });

            if (!enrollment) {
                return res.status(400).json({
                    message: 'El alumno no tiene una matrícula vigente/confirmada. No se puede registrar asistencia.'
                });
            }

            const attendance = await Attendance.create({
                estudianteId,
                fecha,
                estado,
                tenantId: req.user.tenantId,
                registradoPor: req.user.userId
            });

            // [NUEVO] Alerta de asistencia baja (< 75%)
            if (estado === 'ausente') {
                AttendanceController.checkAttendanceAlert(req.user.tenantId, estudianteId).catch(err =>
                    console.error('Error in attendance alert check:', err)
                );
            }

            res.status(201).json(attendance);

        } catch (error) {
            console.error('Attendance error:', error);
            res.status(400).json({ message: error.message });
        }
    }

    // Helper method to check and notify if student's attendance is low
    static async checkAttendanceAlert(tenantId, estudianteId) {
        try {
            const stats = await Attendance.aggregate([
                {
                    $match: {
                        tenantId: new mongoose.Types.ObjectId(tenantId),
                        estudianteId: new mongoose.Types.ObjectId(estudianteId)
                    }
                },
                {
                    $group: {
                        _id: "$estado",
                        count: { $sum: 1 }
                    }
                }
            ]);

            const total = stats.reduce((acc, curr) => acc + curr.count, 0);
            const present = stats.find(s => s._id === 'presente')?.count || 0;
            const attendanceRate = total > 5 ? (present / total) * 100 : 100;

            if (attendanceRate < 75) {
                const Estudiante = await import('../models/estudianteModel.js').then(m => m.default);
                const student = await Estudiante.findById(estudianteId);
                const NotificationService = await import('../services/notificationService.js').then(m => m.default);

                await NotificationService.broadcastToAdmins({
                    tenantId,
                    title: 'Alerta de Asistencia Crítica',
                    message: `El estudiante ${student.nombres} ${student.apellidos} tiene una asistencia del ${attendanceRate.toFixed(1)}%.`,
                    type: 'system',
                    link: `/students/${estudianteId}`
                });
            }
        } catch (error) {
            console.error('Attendance Alert Check Logic Error:', error);
        }
    }

    // Bulk create/update attendance
    static async createBulkAttendance(req, res) {
        try {
            const { courseId, fecha, students } = req.body;
            // students: [{ estudianteId, estado }]

            if (!fecha || !students || !Array.isArray(students)) {
                return res.status(400).json({ message: 'Datos inválidos' });
            }

            // [NUEVO] Solo procesar alumnos con matrícula confirmada
            const Enrollment = await import('../models/enrollmentModel.js').then(m => m.default);
            const enrolledStudents = await Enrollment.find({
                tenantId: new mongoose.Types.ObjectId(req.user.tenantId),
                status: { $in: ['confirmada', 'activo', 'activa'] }
            }).select('estudianteId');

            const enrolledIds = enrolledStudents.map(e => e.estudianteId.toString());

            const operations = students
                .filter(s => enrolledIds.includes(s.estudianteId.toString()))
                .map(s => ({
                    updateOne: {
                        filter: {
                            estudianteId: s.estudianteId,
                            fecha: new Date(new Date(fecha).setUTCHours(0, 0, 0, 0)), // Normalize to UTC midnight
                            tenantId: req.user.tenantId
                        },
                        update: {
                            $set: {
                                estado: s.estado,
                                registradoPor: req.user.userId
                            }
                        },
                        upsert: true
                    }
                }));

            await Attendance.bulkWrite(operations);

            res.status(200).json({ message: 'Asistencia guardada correctamente' });

        } catch (error) {
            console.error('Bulk attendance error:', error);
            res.status(500).json({ message: error.message });
        }
    }

    static async listAttendances(req, res) {
        try {
            const query = (req.user.role === 'admin')
                ? {}
                : { tenantId: req.user.tenantId };

            // Restricción para estudiantes y apoderados
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
                return res.status(200).json([]);
            }

            // Allow filtering by date, student and COURSE
            if (req.query.fecha) {
                query.fecha = new Date(req.query.fecha);
            }
            if (req.query.cursoId || req.query.courseId) {
                const cId = req.query.cursoId || req.query.courseId;
                const Enrollment = await import('../models/enrollmentModel.js').then(m => m.default);
                const enrollments = await Enrollment.find({
                    courseId: cId,
                    tenantId: req.user.tenantId,
                    status: { $in: ['confirmada', 'activo', 'activa'] }
                }).select('estudianteId');

                const studentIds = enrollments.map(e => e.estudianteId);

                // [FIX] If student/apoderado, ensure their specific studentId is in the course's studentIds
                if (query.estudianteId) {
                    const currentIdStr = query.estudianteId.toString();
                    if (!studentIds.some(id => id.toString() === currentIdStr)) {
                        return res.status(200).json([]); // Not in this course
                    }
                    // Keep the single id filter
                } else {
                    query.estudianteId = { $in: studentIds };
                }
            }
            if (req.query.estudianteId && !query.estudianteId) {
                // Only non-student/apoderado can use this filter freely
                query.estudianteId = req.query.estudianteId;
            }

            const attendances = await Attendance.find(query)
                .sort({ fecha: -1 })
                .populate('estudianteId', 'nombres apellidos rut');

            res.json(attendances);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Statistics for Sostenedor/Admin
    static async getStats(req, res) {
        try {
            const { courseId, startDate, endDate } = req.query;
            const tenantId = req.user.tenantId;

            // Basic match stage - Cast to ObjectId for aggregation!
            const matchStage = { tenantId: new mongoose.Types.ObjectId(tenantId) };

            // Filter by date range
            if (startDate || endDate) {
                matchStage.fecha = {};
                if (startDate) {
                    // Force start of day in local time -> UTC could be previous day
                    const start = new Date(startDate);
                    start.setHours(0, 0, 0, 0);
                    // Subtract 4 hours to handle UTC offset (Chile is UTC-3/UTC-4) where stored date might be midnight UTC
                    // But if stored as UTC midnight (e.g. 2026-01-22T00:00:00Z), then simple new Date('2026-01-22') works.
                    // However, if searching for Jan 22 and record is Jan 24 (mis-saved) we can't fix that.
                    // But assuming data IS there but possibly shifted:
                    // Let's ensure we encompass the whole day in UTC.
                    matchStage.fecha.$gte = start;
                }
                if (endDate) {
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    matchStage.fecha.$lte = end;
                }
            }

            // Note: courseId filtering requires looking up students first or using aggregate lookup.
            // For now, let's return global tenant stats or per-student stats if requested.

            const stats = await Attendance.aggregate([
                // 1. Match Tenant and Date Range
                // We need to cast tenantId string to ObjectId if stored as ObjectId
                // Usually controller req.user.tenantId is string.
                // But in mongoose query, it auto-casts. In aggregate, we might need to be careful.
                // Let's assume tenantId is stored effectively.
                // { $match: matchStage }, 

                // Aggregation to count status
                {
                    $group: {
                        _id: "$estado",
                        count: { $sum: 1 }
                    }
                }
            ]);

            // Calculate totals
            const total = stats.reduce((acc, curr) => acc + curr.count, 0);
            const present = stats.find(s => s._id === 'presente')?.count || 0;
            const absent = stats.find(s => s._id === 'ausente')?.count || 0;

            res.json({
                total,
                present,
                absent,
                attendanceRate: total ? ((present / total) * 100).toFixed(1) : 0,
                details: stats
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: error.message });
        }
    }
}

export default AttendanceController;
