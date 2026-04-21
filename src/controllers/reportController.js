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
                const Apo = await import('../models/apoderadoModel.js').then(m => m.default);
                const v = await Apo.findById(req.user.profileId);
                if (!v || v.estudianteId.toString() !== studentId) {
                    return res.status(403).json({ message: 'Acceso denegado' });
                }
            } else if ((req.user.role === 'student' || req.user.role === 'apoderado') && !req.user.profileId) {
                return res.status(403).json({ message: 'Acceso denegado' });
            }

            // Lazy-load all required models
            const [Estudiante, Grade, Attendance, Anotacion, MedicalLicense, Atraso, Apoderado, ClassLog, Tenant, Enrollment] = await Promise.all([
                import('../models/estudianteModel.js').then(m => m.default),
                import('../models/gradeModel.js').then(m => m.default),
                import('../models/attendanceModel.js').then(m => m.default),
                import('../models/anotacionModel.js').then(m => m.default),
                import('../models/medicalLicenseModel.js').then(m => m.default),
                import('../models/atrasoModel.js').then(m => m.default),
                import('../models/apoderadoModel.js').then(m => m.default),
                import('../models/classLogModel.js').then(m => m.default),
                import('../models/tenantModel.js').then(m => m.default),
                import('../models/enrollmentModel.js').then(m => m.default),
            ]);

            const [student, grades, attendance, annotations, licenses, atrasos, tenant] = await Promise.all([
                Estudiante.findById(studentId),
                Grade.find({ estudianteId: studentId, tenantId })
                    .populate({ path: 'evaluationId', populate: { path: 'subjectId', select: 'name' } })
                    .sort({ createdAt: 1 }),
                Attendance.find({ estudianteId: studentId, tenantId }).sort({ fecha: -1 }),
                Anotacion.find({ estudianteId: studentId, tenantId }).populate('creadoPor', 'name').sort({ createdAt: -1 }),
                MedicalLicense.find({ userId: studentId, tenantId, userType: 'Estudiante' }).sort({ fechaInicio: -1 }),
                Atraso.find({ estudianteId: studentId, tenantId }).populate('registradoPor', 'name').sort({ fecha: -1 }),
                Tenant.findById(tenantId),
            ]);

            if (!student) return res.status(404).json({ message: 'Estudiante no encontrado' });

            // Guardian & enrollment
            const [guardian, enrollment] = await Promise.all([
                Apoderado.findOne({ estudianteId: studentId, tenantId }),
                Enrollment.findOne({ estudianteId: studentId, tenantId, status: { $in: ['confirmada', 'activo', 'activa'] } })
                    .populate('courseId', 'name'),
            ]);

            // Class logs for this student's course
            let classLogs = [];
            if (enrollment?.courseId?._id) {
                classLogs = await ClassLog.find({ courseId: enrollment.courseId._id, tenantId, isSigned: true })
                    .populate('teacherId', 'name')
                    .populate('subjectId', 'name')
                    .sort({ date: -1 })
                    .limit(50);
            }

            // Minutos legales por bloque (normativa MINEDUC Chile)
            const MINUTOS_LEGALES_BLOQUE = {
                'Bloque 1': 25, 'Bloque 2': 20, 'Bloque 3': 15,
                'Bloque 4': 10, 'Bloque 5': 10
            };

            // Group grades by subject with per-subject averages
            const subjectMap = {};
            grades.forEach(g => {
                const subjectName = g.evaluationId?.subjectId?.name || g.evaluationId?.subject || 'General';
                if (!subjectMap[subjectName]) subjectMap[subjectName] = { grades: [], total: 0, count: 0 };
                subjectMap[subjectName].grades.push({
                    title: g.evaluationId?.title || 'Evaluación',
                    score: g.score,
                    maxScore: g.evaluationId?.maxScore || 7,
                    date: g.evaluationId?.date || g.createdAt,
                    status: g.status,
                });
                subjectMap[subjectName].total += g.score;
                subjectMap[subjectName].count += 1;
            });
            const gradesBySubject = Object.entries(subjectMap).map(([subject, data]) => ({
                subject,
                grades: data.grades,
                average: data.count > 0 ? parseFloat((data.total / data.count).toFixed(1)) : null,
                totalEvaluations: data.count,
            }));

            // Overall average
            const allScores = grades.map(g => g.score);
            const overallAverage = allScores.length > 0
                ? parseFloat((allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1))
                : null;

            // Attendance stats
            const totalPresent = attendance.filter(a => a.estado === 'presente').length;
            const totalAbsent = attendance.filter(a => a.estado === 'ausente').length;
            const totalTardinessAtt = attendance.filter(a => a.estado === 'atraso').length;
            const attendancePercent = attendance.length > 0
                ? parseFloat(((totalPresent / attendance.length) * 100).toFixed(1)) : 100;

            res.status(200).json({
                school: {
                    name: tenant?.name || 'Colegio',
                    address: tenant?.address || '',
                    phone: tenant?.phone || '',
                    contactEmail: tenant?.contactEmail || '',
                    logoUrl: tenant?.theme?.logoUrl || null,
                    academicYear: tenant?.academicYear || new Date().getFullYear().toString(),
                },
                student: {
                    _id: student._id,
                    nombres: student.nombres,
                    apellidos: student.apellidos,
                    rut: student.rut,
                    email: student.email,
                    fechaNacimiento: student.fechaNacimiento,
                    grado: enrollment?.courseId?.name || student.grado,
                    direccion: student.direccion || student.address || '',
                    telefono: student.telefono || student.phone || '',
                    salud: typeof student.salud === 'object' ? (student.salud?.seguro || '') : (student.salud || ''),
                    nacionalidad: student.nacionalidad || 'Chilena',
                    fotoUrl: student.fotoUrl || student.photoUrl || null,
                },
                guardian: guardian ? {
                    nombre: guardian.nombre,
                    apellidos: guardian.apellidos,
                    rut: guardian.rut,
                    telefono: guardian.telefono,
                    email: guardian.email,
                    parentesco: guardian.parentesco,
                } : null,
                gradesBySubject,
                overallAverage,
                // Flat grades list (legacy support)
                grades: grades.map(g => ({
                    title: g.evaluationId?.title || 'Evaluación',
                    subjectName: g.evaluationId?.subjectId?.name || 'Varios',
                    score: g.score,
                    maxScore: g.evaluationId?.maxScore,
                    date: g.evaluationId?.date || g.createdAt,
                    status: g.status,
                })),
                attendance: {
                    total: attendance.length,
                    present: totalPresent,
                    absent: totalAbsent,
                    tardinessAtt: totalTardinessAtt,
                    percent: attendancePercent,
                    history: attendance.slice(0, 15),
                },
                annotations: annotations.map(a => ({
                    tipo: a.tipo,
                    titulo: a.titulo,
                    descripcion: a.descripcion,
                    fecha: a.fechaOcurrencia || a.createdAt,
                    autor: a.creadoPor?.name,
                })),
                licenses: licenses.map(lic => ({
                    _id: lic._id,
                    tipo: lic.tipo,
                    fechaInicio: lic.fechaInicio,
                    fechaFin: lic.fechaFin,
                    diasReposo: lic.diasReposo,
                    estado: lic.estado,
                    observaciones: lic.observaciones,
                    esElectronica: lic.esElectronica,
                })),
                atrasos: atrasos.map(a => ({
                    _id: a._id,
                    fecha: a.fecha,
                    bloque: a.bloque,
                    minutosAtraso: a.minutosAtraso,
                    minutosLegales: MINUTOS_LEGALES_BLOQUE[a.bloque] || a.minutosAtraso,
                    estado: a.estado,
                    motivo: a.motivo,
                    registradoPor: a.registradoPor?.name,
                })),
                classLogs: classLogs.map(log => ({
                    date: log.date,
                    topic: log.topic,
                    activities: log.activities,
                    bloqueHorario: log.bloqueHorario,
                    teacher: log.teacherId?.name,
                    subject: log.subjectId?.name,
                    isSigned: log.isSigned,
                    effectiveDuration: log.effectiveDuration || log.duration || 0,
                })),
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
    static async getTeacherTimeReport(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const ClassLog = await import('../models/classLogModel.js').then(m => m.default);
            const { startDate, endDate } = req.query;

            const match = {
                tenantId: typeof tenantId === 'string' ? new mongoose.Types.ObjectId(tenantId) : tenantId,
                isSigned: true
            };

            if (startDate || endDate) {
                match.signedAt = {};
                if (startDate) match.signedAt.$gte = new Date(startDate);
                if (endDate) match.signedAt.$lte = new Date(endDate);
            }

            const performance = await ClassLog.aggregate([
                { $match: match },
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
                {
                    $unwind: {
                        path: '$teacher',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $unwind: {
                        path: '$course',
                        preserveNullAndEmptyArrays: true
                    }
                },
                // Filtrar registros sin profesor o curso válido (datos huérfanos)
                { $match: { 'teacher._id': { $exists: true }, 'course._id': { $exists: true } } },
                {
                    $unwind: {
                        path: '$subject',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $group: {
                        _id: {
                            teacherId: '$teacherId',
                            teacherName: '$teacher.name',
                            courseName: '$course.name',
                            subjectName: { $ifNull: ['$subject.name', 'Sin asignatura'] }
                        },
                        // Sumar minutos efectivos (effectiveDuration tiene prioridad sobre duration)
                        totalMinutos: {
                            $sum: {
                                $cond: [
                                    { $gt: ['$effectiveDuration', 0] },
                                    '$effectiveDuration',
                                    '$duration'
                                ]
                            }
                        },
                        totalClases: { $sum: 1 }
                    }
                },
                {
                    $group: {
                        _id: {
                            teacherId: '$_id.teacherId',
                            teacherName: '$_id.teacherName'
                        },
                        totalMinutosAllCourses: { $sum: '$totalMinutos' },
                        totalClasesAllCourses: { $sum: '$totalClases' },
                        courses: {
                            $push: {
                                courseName: '$_id.courseName',
                                subjectName: '$_id.subjectName',
                                minutos: '$totalMinutos',
                                // [BUG 5 FIX] Calcular horas efectivas por curso
                                horasEfectivas: { $divide: ['$totalMinutos', 60] },
                                clases: '$totalClases'
                            }
                        }
                    }
                },
                {
                    $addFields: {
                        // [BUG 5 FIX] Horas efectivas totales del profesor
                        horasEfectivasTotal: { $divide: ['$totalMinutosAllCourses', 60] }
                    }
                },
                { $sort: { 'totalMinutosAllCourses': -1 } }
            ]);

            res.json(performance);
        } catch (error) {
            console.error('Teacher time report error:', error);
        }
    }

    static async getCoursePerformance(req, res) {
        try {
            const { courseId } = req.params;
            const { subjectId } = req.query;
            const tenantId = req.user.tenantId;

            const [Grade, Evaluation, Enrollment, Estudiante] = await Promise.all([
                import('../models/gradeModel.js').then(m => m.default),
                import('../models/evaluationModel.js').then(m => m.default),
                import('../models/enrollmentModel.js').then(m => m.default),
                import('../models/estudianteModel.js').then(m => m.default),
            ]);

            // 1. Fetch Students in Course
            const enrollments = await Enrollment.find({ 
                courseId, 
                tenantId, 
                status: { $in: ['confirmada', 'activo', 'activa'] } 
            }).populate('estudianteId', 'nombres apellidos');
            
            const studentIds = enrollments.map(e => e.estudianteId._id);
            if (studentIds.length === 0) return res.json({ stats: null, studentAverages: [] });

            // 2. Fetch Evaluations
            const evalQuery = { courseId, tenantId };
            if (subjectId) evalQuery.subjectId = subjectId;
            const evaluations = await Evaluation.find(evalQuery).select('_id title weight subjectId');
            const evalIds = evaluations.map(e => e._id);

            // 3. Fetch Grades
            const grades = await Grade.find({
                tenantId,
                estudianteId: { $in: studentIds },
                evaluationId: { $in: evalIds }
            });

            // 4. Group by Student to calculate per-student subject average
            const studentStats = {};
            studentIds.forEach(id => {
                studentStats[id.toString()] = { total: 0, count: 0, grades: [] };
            });

            grades.forEach(g => {
                const sId = g.estudianteId.toString();
                if (studentStats[sId]) {
                    studentStats[sId].total += g.score;
                    studentStats[sId].count += 1;
                    studentStats[sId].grades.push(g.score);
                }
            });

            const studentAverages = enrollments.map(e => {
                const stats = studentStats[e.estudianteId._id.toString()];
                return {
                    estudianteId: e.estudianteId._id,
                    name: `${e.estudianteId.apellidos}, ${e.estudianteId.nombres}`,
                    average: stats.count > 0 ? parseFloat((stats.total / stats.count).toFixed(1)) : null,
                    count: stats.count
                };
            });

            // 5. Global Stats
            const allScores = grades.map(g => g.score);
            const courseAverage = allScores.length > 0 
                ? parseFloat((allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1)) 
                : null;
            
            const passingCount = allScores.filter(s => s >= 4.0).length;
            const approvalRate = allScores.length > 0 ? Math.round((passingCount / allScores.length) * 100) : 0;

            // Distribution
            const distribution = {
                excellent: allScores.filter(s => s >= 6.0).length,
                good: allScores.filter(s => s >= 5.0 && s < 6.0).length,
                sufficient: allScores.filter(s => s >= 4.0 && s < 5.0).length,
                insufficient: allScores.filter(s => s < 4.0).length
            };

            res.json({
                stats: {
                    courseAverage,
                    approvalRate,
                    totalEvaluations: evalIds.length,
                    totalGrades: allScores.length,
                    distribution
                },
                studentAverages
            });

        } catch (error) {
            console.error('getCoursePerformance error:', error);
            res.status(500).json({ message: error.message });
        }
    }
}

export default ReportController;
