import Attendance from '../models/attendanceModel.js';

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

            res.status(201).json(attendance);

        } catch (error) {
            console.error('Attendance error:', error);
            res.status(400).json({ message: error.message });
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
                tenantId: req.user.tenantId,
                status: 'confirmada'
            }).select('estudianteId');

            const enrolledIds = enrolledStudents.map(e => e.estudianteId.toString());

            const operations = students
                .filter(s => enrolledIds.includes(s.estudianteId.toString()))
                .map(s => ({
                    updateOne: {
                        filter: {
                            estudianteId: s.estudianteId,
                            fecha: new Date(fecha), // Normalizar fecha es importante (ignorando hora si es diario)
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

            // Allow filtering by date and student
            if (req.query.fecha) {
                query.fecha = new Date(req.query.fecha);
            }
            if (req.query.estudianteId && req.user.role !== 'student' && req.user.role !== 'apoderado') {
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

            // Basic match stage
            const matchStage = { tenantId: tenantId }; // Adjust for ObjectId if needed

            // Filter by date range
            if (startDate || endDate) {
                matchStage.fecha = {};
                if (startDate) matchStage.fecha.$gte = new Date(startDate);
                if (endDate) matchStage.fecha.$lte = new Date(endDate);
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
