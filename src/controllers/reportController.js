import Report from '../models/reportModel.js';

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
                Grade.find({ estudianteId: studentId, tenantId }).populate('evaluationId'),
                Attendance.find({ estudianteId: studentId, tenantId }).sort({ fecha: -1 }),
                Anotacion.find({ estudianteId: studentId, tenantId }).populate('creadoPor', 'name').sort({ fecha: -1 })
            ]);

            if (!student) return res.status(404).json({ message: 'Estudiante no encontrado' });

            res.status(200).json({
                student,
                grades: grades.map(g => ({
                    title: g.evaluationId?.title || 'Sin título',
                    score: g.score,
                    maxScore: g.evaluationId?.maxScore,
                    date: g.date
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
}

export default ReportController;
