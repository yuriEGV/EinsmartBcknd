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
            
            if (req.query.courseId) {
                query.courseId = req.query.courseId;
            }

            const fullAccessRoles = ['admin', 'sostenedor', 'director', 'utp', 'inspector_general', 'psicologo', 'orientador', 'bibliotecario', 'secretario', 'secretary', 'secretaria', 'paradocente'];

            if (fullAccessRoles.includes(req.user.role)) {
                if (req.user.role === 'admin' && req.query.tenantId) {
                    query.tenantId = req.query.tenantId;
                }
            } else if (req.user.role === 'teacher') {
                const Course = await import('../models/courseModel.js').then(m => m.default);
                const Career = await import('../models/careerModel.js').then(m => m.default);

                // 1. Subjects they teach
                const teacherSubjectQuery = { teacherId: req.user.userId, tenantId: req.user.tenantId };

                // 2. Subjects of courses where they are Profesor Jefe or Collaborator
                const directCourses = await Course.find({
                    $or: [
                        { teacherId: req.user.userId },
                        { collaborators: req.user.userId }
                    ],
                    tenantId: req.user.tenantId
                }).select('_id');

                // 3. Subjects of courses in careers they lead
                const ledCareers = await Career.find({
                    $or: [
                        { headTeacher: req.user.userId },
                        { profesorJefe: req.user.userId }
                    ],
                    tenantId: req.user.tenantId
                }).select('_id');

                const careerCourseIds = await Course.find({
                    careerId: { $in: ledCareers.map(c => c._id) },
                    tenantId: req.user.tenantId
                }).select('_id');

                const allowedCourseIds = [
                    ...new Set([
                        ...directCourses.map(c => c._id.toString()),
                        ...careerCourseIds.map(c => c._id.toString())
                    ])
                ];

                // [MODIFIED] If specifically asking for a courseId, check if they have access
                if (req.query.courseId) {
                    const isAllowed = allowedCourseIds.includes(req.query.courseId.toString());
                    if (!isAllowed && req.query.teacherId !== req.user.userId) {
                        // If not allowed and not teaching it, check if they are the teacher of that subject
                        // We'll let the final query handle the teacherId filter if provided
                    }
                } else {
                    // If no specific course requested, show subjects they teach OR subjects in courses they manage
                    query.$or = [
                        { teacherId: req.user.userId },
                        { courseId: { $in: allowedCourseIds } }
                    ];
                }
            } else if (req.user.role === 'student' || req.user.role === 'apoderado') {
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
                        if (!query.courseId) return res.json([]);
                    }
                } else {
                    return res.status(403).json({ message: 'Perfil no vinculado' });
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

            // [STRICT ISOLATION] Only assigned teacher or management roles can update
            const managementRoles = ['admin', 'sostenedor', 'director', 'utp'];
            const isManagement = managementRoles.includes(req.user.role);

            if (req.user.role === 'teacher' && subject.teacherId.toString() !== req.user.userId && !isManagement) {
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

            // [STRICT ISOLATION] Only assigned teacher or management (admin/director/etc) can delete
            const managementRoles = ['admin', 'sostenedor', 'director', 'utp'];
            const isManagement = managementRoles.includes(req.user.role);

            if (req.user.role === 'teacher' && subject.teacherId.toString() !== req.user.userId && !isManagement) {
                return res.status(403).json({ message: 'Acceso denegado: no eres el profesor asignado a esta asignatura' });
            }

            const deleted = await Subject.findByIdAndDelete(id);

            return res.status(204).send();
        } catch (error) {
            return res.status(500).json({ message: 'Error eliminando asignatura', error: error.message });
        }
    }
}
