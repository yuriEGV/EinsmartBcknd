// controllers/courseController.js
import Course from '../models/courseModel.js';
import connectDB from '../config/db.js';

export default class CourseController {
    static async createCourse(req, res) {
        try {
            await connectDB();
            const { name, description, teacherId, level, letter, careerId, collaborators } = req.body;

            if (!name || !level || !letter || !teacherId) {
                return res.status(400).json({
                    message: 'name, level, letter y teacherId son obligatorios'
                });
            }

            if (!req.user || !req.user.tenantId) {
                return res.status(401).json({ message: 'Tenant no encontrado' });
            }

            // [LOGIC] Restricciones para profesores
            if (req.user.role === 'teacher') {
                const User = await import('../models/userModel.js').then(m => m.default);
                const teacher = await User.findById(req.user.userId);

                if (!teacher) return res.status(404).json({ message: 'Profesor no encontrado' });

                // 1. Limitar a 1 curso por año (si no es admin)
                const currentYear = new Date().getFullYear();
                const startOfYear = new Date(currentYear, 0, 1);
                const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

                const existingCoursesCount = await Course.countDocuments({
                    teacherId: req.user.userId,
                    tenantId: req.user.tenantId,
                    createdAt: { $gte: startOfYear, $lte: endOfYear }
                });

                if (existingCoursesCount >= 1) {
                    return res.status(403).json({
                        message: 'Como profesor, solo puedes crear un curso anualmente.'
                    });
                }

                // 2. Opcional: Validar especialidad vs nombre del curso (suave)
                if (teacher.specialization && !name.toLowerCase().includes(teacher.specialization.toLowerCase())) {
                    console.warn(`Aviso: El curso "${name}" no parece coincidir con la especialidad "${teacher.specialization}"`);
                }
            }

            const course = await Course.create({
                name: name.trim(),
                level,
                letter,
                description,
                teacherId,
                careerId: careerId || null,
                collaborators: collaborators || [],
                tenantId: req.user.tenantId
            });

            // AUTO-SEED: Create general formation subjects for the new course
            try {
                const Subject = await import('../models/subjectModel.js').then(m => m.default);
                const GENERAL_SUBJECTS = [
                    { name: 'Lengua y Literatura', description: 'Comunicación oral y escrita.' },
                    { name: 'Inglés', description: 'Comunicación en idioma extranjero.' },
                    { name: 'Filosofía', description: 'Reflexión crítica y ética.' },
                    { name: 'Matemática', description: 'Pensamiento lógico.' },
                    { name: 'Educación Física', description: 'Vida sana y actividad física.' },
                    { name: 'Química', description: 'Estudio de la materia.' },
                    { name: 'Física', description: 'Leyes del universo.' },
                    { name: 'Biología', description: 'Seres vivos y sus procesos.' },
                    { name: 'Educación Ciudadana', description: 'Derechos, deberes y participación.' }
                ];

                for (const sub of GENERAL_SUBJECTS) {
                    await Subject.create({
                        tenantId: req.user.tenantId,
                        courseId: course._id,
                        teacherId: teacherId, // usar el profesor jefe como docente por defecto
                        name: sub.name,
                        description: sub.description,
                        isTechnical: false
                    });
                }
                console.log(`[COURSE] Auto-seeded ${GENERAL_SUBJECTS.length} subjects for course: ${course.name}`);
            } catch (subErr) {
                console.error('[COURSE] Error auto-seeding subjects:', subErr.message);
                // Don't fail the course creation if subject seeding fails
            }

            return res.status(201).json(course);

        } catch (error) {
            console.error('Error createCourse:', error);
            return res.status(400).json({ message: 'Error creando el curso', error: error.message });
        }
    }

    static async getCourses(req, res) {
        try {
            await connectDB();
            let query = { tenantId: req.user.tenantId };

            // [ROLES WITH FULL ACCESS TO TENANT]
            const fullAccessRoles = ['admin', 'sostenedor', 'director', 'utp', 'inspector_general', 'psicologo', 'orientador', 'bibliotecario'];

            if (req.user.role === 'student' && req.user.profileId) {
                const Enrollment = await import('../models/enrollmentModel.js').then(m => m.default);
                const enrollments = await Enrollment.find({
                    estudianteId: req.user.profileId,
                    tenantId: req.user.tenantId,
                    status: { $in: ['confirmada', 'activo', 'activa'] }
                });
                const courseIds = enrollments.map(e => e.courseId);
                query._id = { $in: courseIds };
            }
            else if (req.user.role === 'apoderado' && req.user.profileId) {
                const Apoderado = await import('../models/apoderadoModel.js').then(m => m.default);
                const Enrollment = await import('../models/enrollmentModel.js').then(m => m.default);

                const vinculation = await Apoderado.findById(req.user.profileId);
                if (vinculation) {
                    const enrollments = await Enrollment.find({
                        estudianteId: vinculation.estudianteId,
                        tenantId: req.user.tenantId,
                        status: { $in: ['confirmada', 'activo', 'activa'] }
                    });
                    const courseIds = enrollments.map(e => e.courseId);
                    query._id = { $in: courseIds };
                } else {
                    return res.status(200).json([]);
                }
            }
            else if (req.user.role === 'teacher') {
                const Subject = await import('../models/subjectModel.js').then(m => m.default);
                const Career = await import('../models/careerModel.js').then(m => m.default);

                // 1. Get subjects where they teach
                const teacherSubjects = await Subject.find({
                    teacherId: req.user.userId,
                    tenantId: req.user.tenantId
                }).select('courseId');

                // 2. Get courses where they are head teacher (Profesor Jefe) or collaborator
                const directCourses = await Course.find({
                    $or: [
                        { teacherId: req.user.userId },
                        { collaborators: req.user.userId }
                    ],
                    tenantId: req.user.tenantId
                }).select('_id');

                // 3. Get courses in careers they lead (Jefe de Carrera or Profesor Jefe de Carrera)
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

                const courseIds = [
                    ...new Set([
                        ...teacherSubjects.map(s => s.courseId.toString()),
                        ...directCourses.map(c => c._id.toString()),
                        ...careerCourseIds.map(c => c._id.toString())
                    ])
                ];

                if (courseIds.length > 0) {
                    query._id = { $in: courseIds };
                } else {
                    // Force zero results if no assignments found
                    return res.status(200).json([]);
                }
            }
            else if (fullAccessRoles.includes(req.user.role)) {
                if (req.user.role === 'admin' && req.query.tenantId) {
                    query.tenantId = req.query.tenantId;
                }
                // Others just inherit the tenantId filter
            }

            const allCourses = await Course.find(query)
                .populate('teacherId', 'name email rut')
                .populate('careerId', 'name')
                .populate('collaborators', 'name email')
                .sort({ createdAt: -1 });

            console.log(`[COURSES] Role: ${req.user.role} - Found: ${allCourses.length} courses for query:`, JSON.stringify(query));

            return res.status(200).json(allCourses);

        } catch (error) {
            console.error('Error getCourses:', error);
            return res.status(500).json({
                message: 'Error obteniendo cursos',
                error: error.message
            });
        }
    }

    static async getCoursesByTenant(req, res) {
        try {
            const { tenantId } = req.params;

            // Strict check: only SuperAdmin or the owner institutional user
            if (req.user.role !== 'admin' && req.user.tenantId !== tenantId) {
                return res.status(403).json({ message: 'Acceso denegado' });
            }

            const courses = await Course.find({ tenantId })
                .populate('teacherId', 'name email')
                .populate('careerId', 'name')
                .populate('collaborators', 'name email')
                .sort({ createdAt: -1 });

            return res.status(200).json(courses);

        } catch (error) {
            console.error('Error getCoursesByTenant:', error);
            return res.status(500).json({
                message: 'Error obteniendo cursos por tenant',
                error: error.message
            });
        }
    }

    static async getCourseById(req, res) {
        try {
            await connectDB();
            const { id } = req.params;

            const course = await Course.findOne({
                _id: id,
                tenantId: req.user.tenantId
            }).populate('teacherId', 'name email')
                .populate('careerId', 'name')
                .populate('collaborators', 'name email');

            if (!course) {
                return res.status(404).json({
                    message: 'Curso no encontrado'
                });
            }

            return res.status(200).json(course);

        } catch (error) {
            console.error('Error getCourseById:', error);
            return res.status(500).json({
                message: 'Error obteniendo curso',
                error: error.message
            });
        }
    }

    static async updateCourse(req, res) {
        try {
            await connectDB();
            const { id } = req.params;
            const { name, level, letter, description, teacherId, careerId, collaborators } = req.body;

            const course = await Course.findOneAndUpdate(
                { _id: id, tenantId: req.user.tenantId },
                {
                    name: name ? name.trim() : undefined,
                    level,
                    letter,
                    description,
                    teacherId,
                    careerId: careerId || null,
                    collaborators
                },
                { new: true, runValidators: true }
            ).populate('teacherId', 'name email')
                .populate('careerId', 'name')
                .populate('collaborators', 'name email');

            if (!course) {
                return res.status(404).json({
                    message: 'Curso no encontrado'
                });
            }

            return res.status(200).json(course);

        } catch (error) {
            console.error('Error updateCourse:', error);
            return res.status(400).json({
                message: 'Error actualizando curso',
                error: error.message
            });
        }
    }

    static async deleteCourse(req, res) {
        try {
            await connectDB();
            const { id } = req.params;

            const course = await Course.findOneAndDelete({
                _id: id,
                tenantId: req.user.tenantId
            });

            if (!course) {
                return res.status(404).json({
                    message: 'Curso no encontrado'
                });
            }

            // [NUEVO] Eliminar matrículas asociadas para evitar huérfanos "Sin Curso"
            const Enrollment = await import('../models/enrollmentModel.js').then(m => m.default);
            await Enrollment.deleteMany({ courseId: id, tenantId: req.user.tenantId });

            return res.status(204).send();

        } catch (error) {
            console.error('Error deleteCourse:', error);
            return res.status(500).json({
                message: 'Error eliminando curso',
                error: error.message
            });
        }
    }
}
