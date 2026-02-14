import Subject from '../models/subjectModel.js';
import Enrollment from '../models/enrollmentModel.js';
import Apoderado from '../models/apoderadoModel.js';

export default class SubjectController {

    // Create new Subject
    static async createSubject(req, res) {
        try {
            const { name, courseId, teacherId } = req.body;

            // Allow teachers to create subjects, but force tenantId
            if (!name || !courseId || !teacherId) {
                return res.status(400).json({ message: 'Todos los campos son obligatorios' });
            }

            const subject = await Subject.create({
                name,
                courseId,
                teacherId,
                tenantId: req.user.tenantId
            });

            return res.status(201).json(subject);
        } catch (error) {
            console.error('Error createSubject:', error);
            return res.status(500).json({ message: 'Error creando asignatura', error: error.message });
        }
    }

    // Get all subjects (filtered by tenant)
    static async getSubjects(req, res) {
        try {
            const query = { tenantId: req.user.tenantId };

            // Optional filters
            if (req.query.courseId) query.courseId = req.query.courseId;
            if (req.query.teacherId) query.teacherId = req.query.teacherId;

            const adminRoles = ['admin', 'director', 'utp', 'sostenedor', 'teacher'];

            // If admin, no restrictions (can see all subjects in tenant)
            // If NOT an admin/staff, apply restricted filters
            if (!adminRoles.includes(req.user.role)) {
                // [MODIFIED] If they are asking for a specific course, we let staff (teachers) see them 
                // to enable schedule management and shared visibility, but keep strict isolation for students/guardians.
                if (req.user.role === 'teacher' && !req.query.courseId) {
                    query.teacherId = req.user.userId;
                }

                // [STRICT ISOLATION] Students and Guardians only see their enrolled subjects
                if (req.user.role === 'student' || req.user.role === 'apoderado') {
                    let studentId;
                    if (req.user.role === 'student') {
                        studentId = req.user.profileId;
                    } else {
                        const apoderado = await Apoderado.findById(req.user.profileId);
                        studentId = apoderado?.estudianteId;
                    }

                    if (studentId) {
                        const enrollment = await Enrollment.findOne({
                            estudianteId: studentId,
                            tenantId: req.user.tenantId,
                            status: { $in: ['confirmada', 'activo', 'activa'] }
                        });
                        if (enrollment) {
                            query.courseId = enrollment.courseId;
                        } else {
                            // No enrollment found, return empty list or specific error?
                            // For UX, return empty list if not specifically filtered by courseId already
                            if (!query.courseId) return res.json([]);
                        }
                    } else {
                        return res.status(403).json({ message: 'Perfil no vinculado' });
                    }
                }
            }

            console.log(`[Subjects] User: ${req.user.userId} (${req.user.role}) - Query:`, query);

            const subjects = await Subject.find(query)
                .populate('courseId', 'name')
                .populate('teacherId', 'name email')
                .sort({ name: 1 });

            return res.json(subjects);
        } catch (error) {
            return res.status(500).json({ message: 'Error obteniendo asignaturas', error: error.message });
        }
    }

    // Update Subject
    static async updateSubject(req, res) {
        try {
            const { id } = req.params;
            const subject = await Subject.findOne({ _id: id, tenantId: req.user.tenantId });
            if (!subject) return res.status(404).json({ message: 'Asignatura no encontrada' });

            // [STRICT ISOLATION] Only assigned teacher or admin can update
            if (req.user.role === 'teacher' && subject.teacherId.toString() !== req.user.userId) {
                return res.status(403).json({ message: 'Acceso denegado: no eres el profesor asignado a esta asignatura' });
            }

            const updated = await Subject.findByIdAndUpdate(
                id,
                req.body,
                { new: true }
            );

            return res.json(updated);
        } catch (error) {
            return res.status(500).json({ message: 'Error actualizando asignatura', error: error.message });
        }
    }

    // Delete Subject
    static async deleteSubject(req, res) {
        try {
            const { id } = req.params;
            const subject = await Subject.findOne({ _id: id, tenantId: req.user.tenantId });
            if (!subject) return res.status(404).json({ message: 'Asignatura no encontrada' });

            // [STRICT ISOLATION] Only assigned teacher or admin can delete
            if (req.user.role === 'teacher' && subject.teacherId.toString() !== req.user.userId) {
                return res.status(403).json({ message: 'Acceso denegado: no eres el profesor asignado a esta asignatura' });
            }

            const deleted = await Subject.findByIdAndDelete(id);

            return res.status(204).send();
        } catch (error) {
            return res.status(500).json({ message: 'Error eliminando asignatura', error: error.message });
        }
    }
}
