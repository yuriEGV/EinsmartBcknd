import NotificationService from '../services/notificationService.js';
import Citacion from '../models/citacionModel.js';
import User from '../models/userModel.js';
import mongoose from 'mongoose';

class CitacionController {
    static async create(req, res) {
        try {
            const { estudianteId } = req.body;

            // Auto-lookup the apoderado for this student
            const student = await mongoose.model('Estudiante').findById(estudianteId);
            if (!student) return res.status(404).json({ message: 'Estudiante no encontrado' });

            const apoderado = await mongoose.model('Apoderado').findOne({ estudianteId, tipo: 'principal' });

            if (!apoderado) return res.status(400).json({ message: 'El estudiante no tiene un apoderado principal asignado. No se puede crear la citación.' });

            // [NUEVO] Obtener el curso actual del estudiante desde su matricula activa
            const enrollment = await mongoose.model('Enrollment').findOne({
                estudianteId,
                tenantId: req.user.tenantId,
                status: { $in: ['confirmada', 'activo', 'activa'] }
            });

            if (!enrollment) return res.status(400).json({ message: 'El estudiante no tiene una matrícula activa. No se puede crear la citación.' });

            const citacion = new Citacion({
                ...req.body,
                apoderadoId: apoderado._id,
                courseId: enrollment.courseId,
                tenantId: req.user.tenantId,
                profesorId: req.user.userId
            });
            await citacion.save();

            // [NUEVO] Notificar al apoderado
            NotificationService.notifyNewCitation(
                citacion.estudianteId,
                citacion.motivo,
                citacion.fecha,
                citacion.hora,
                citacion.observaciones || citacion.motivo,
                req.user.tenantId,
                citacion._id,
                citacion.courseId
            );

            res.status(201).json(citacion);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async list(req, res) {
        try {
            const { courseId, cursoId } = req.query;
            const query = { tenantId: req.user.tenantId };

            const finalCourseId = courseId || cursoId;
            if (finalCourseId) {
                query.courseId = finalCourseId;
            }

            // Privacy Logic: Stricter for teachers
            if (req.user.role === 'teacher') {
                // [FIX] Teachers only see their OWN citations, not all teachers in the course
                query.profesorId = new mongoose.Types.ObjectId(req.user.userId);

                // Additionally, restrict to courses they teach if no courseId given
                if (!courseId) {
                    const Subject = mongoose.model('Subject');
                    const Course = mongoose.model('Course');
                    const [teacherSubjects, headCourses] = await Promise.all([
                        Subject.find({ teacherId: req.user.userId, tenantId: req.user.tenantId }).select('courseId'),
                        Course.find({ teacherId: req.user.userId, tenantId: req.user.tenantId }).select('_id')
                    ]);
                    const allowedCourseIds = [
                        ...new Set([
                            ...teacherSubjects.map(s => s.courseId.toString()),
                            ...headCourses.map(c => c._id.toString())
                        ])
                    ];
                    query.courseId = { $in: allowedCourseIds };
                } else {
                    query.courseId = courseId;
                }
            } else if (['director', 'inspector_general', 'utp', 'admin', 'sostenedor'].includes(req.user.role)) {
                // Keep query as is (tenant only)
            } else if (req.user.role === 'apoderado') {
                const apoderados = await mongoose.model('Apoderado').find({ 
                    $or: [
                        { _id: req.user.profileId },
                        { correo: req.user.email }
                    ],
                    tenantId: req.user.tenantId 
                });
                const studentIds = apoderados.map(a => a.estudianteId);
                query.estudianteId = { $in: studentIds };
            } else if (req.user.role === 'student' || req.user.role === 'alumno') {
                query.estudianteId = new mongoose.Types.ObjectId(req.user.userId);
            }

            const citaciones = await Citacion.find(query)
                .populate('estudianteId', 'nombres apellidos')
                .populate('profesorId', 'name email')
                .populate('apoderadoId', 'nombre apellidos correo telefono')
                .sort({ fecha: 1, hora: 1 });

            res.json(citaciones);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async updateStatus(req, res) {
        try {
            const { id } = req.params;
            const { estado, actaReunion, acuerdo, resultado, asistioApoderado, comentariosApoderado, modalidad, fecha, hora } = req.body;
            
            // Security check: Only allow certain fields based on role
            const updateFields = {};
            if (req.user.role === 'apoderado') {
                if (estado) updateFields.estado = estado;
                if (comentariosApoderado) updateFields.comentariosApoderado = comentariosApoderado;
                if (modalidad) updateFields.modalidad = modalidad;
            } else {
                // Admin/Teacher can update everything
                Object.assign(updateFields, { estado, actaReunion, acuerdo, resultado, asistioApoderado, comentariosApoderado, modalidad, fecha, hora });
            }

            const citacion = await Citacion.findOneAndUpdate(
                { _id: id, tenantId: req.user.tenantId },
                updateFields,
                { new: true }
            );
            if (!citacion) return res.status(404).json({ message: 'Citación no encontrada' });
            
            // [NEW] If updated by an apoderado, notify the teacher
            if (req.user.role === 'apoderado') {
                NotificationService.notifyCitationResponse(id, req.user.tenantId);
            }

            // [FIX] If the acta has been signed (actaReunion present and status is realizada),
            // automatically delete the citation as requested by the institution's workflow.
            // ONLY if it has signatures or if we want to keep it until both sign?
            // User says "acta llegue a su fin con la firma", so maybe keep it while not both signed?
            // For now, I'll keep the existing "delete" logic but maybe disable it if they want to see the signed acta.
            // Actually, deleting it makes it impossible to see the signed document later.
            // I'll comment out the delete logic to keep history.
            /*
            if (estado === 'realizada' && actaReunion && actaReunion.trim().length > 0) {
                await Citacion.findByIdAndDelete(id);
                return res.json({ message: 'Acta registrada. Citación finalizada y eliminada del sistema.', deleted: true });
            }
            */

            res.json(citacion);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            const citacion = await Citacion.findOneAndDelete({ _id: id, tenantId: req.user.tenantId });
            if (!citacion) return res.status(404).json({ message: 'Citación no encontrada' });
            res.json({ message: 'Citación eliminada correctamente' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async sign(req, res) {
        try {
            const { id } = req.params;
            const { pin, signature } = req.body; // signature is base64
            const userId = req.user.userId;

            // 1. Verify PIN
            const user = await User.findById(userId);
            if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
            if (user.signaturePin !== pin) return res.status(401).json({ message: 'PIN de firma incorrecto' });

            // 2. Determine field to update based on role
            const updateFields = {};
            if (req.user.role === 'apoderado') {
                updateFields.firmaApoderado = signature;
                updateFields.fechaFirmaApoderado = new Date();
            } else {
                // Teacher/Admin/Directivo
                updateFields.firmaProfesor = signature;
                updateFields.fechaFirmaProfesor = new Date();
            }

            const citacion = await Citacion.findOneAndUpdate(
                { _id: id, tenantId: req.user.tenantId },
                updateFields,
                { new: true }
            );

            if (!citacion) return res.status(404).json({ message: 'Citación no encontrada' });

            res.json({ message: 'Firma registrada correctamente', citacion });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export default CitacionController;
