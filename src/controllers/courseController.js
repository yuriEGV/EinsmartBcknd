// controllers/courseController.js
import Course from '../models/courseModel.js';
import connectDB from '../config/db.js';

export default class CourseController {
    static async createCourse(req, res) {
        try {
            // Logs críticos para debug en Vercel
            console.log('CREATE COURSE BODY:', req.body);
            console.log('CREATE COURSE USER:', req.user);

            const { name, description, teacherId } = req.body;

            // Validación de body
            if (!name || !description || !teacherId) {
                return res.status(400).json({
                    message: 'name, description y teacherId son obligatorios'
                });
            }

            // Validación de autenticación / tenant
            if (!req.user || !req.user.tenantId) {
                return res.status(401).json({
                    message: 'Tenant no encontrado en el token'
                });
            }

            // Crear curso asociado al tenant
            const course = await Course.create({
                name: name.trim(),
                description,
                teacherId,
                tenantId: req.user.tenantId
            });

            return res.status(201).json(course);

        } catch (error) {
            console.error('Error createCourse:', error);

            return res.status(400).json({
                message: 'Error creando el curso',
                error: error.message
            });
        }
    }

    static async getCourses(req, res) {
        try {
            await connectDB();
            let query = { tenantId: req.user.tenantId };

            // [STRICT ISOLATION] Students/Guardians only see their own courses
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
                const teacherSubjects = await Subject.find({
                    teacherId: req.user.userId,
                    tenantId: req.user.tenantId
                }).select('courseId');

                // Also include courses where they are head teacher
                const headCourses = await Course.find({
                    teacherId: req.user.userId,
                    tenantId: req.user.tenantId
                }).select('_id');

                const courseIds = [
                    ...new Set([
                        ...teacherSubjects.map(s => s.courseId.toString()),
                        ...headCourses.map(c => c._id.toString())
                    ])
                ];

                // FINAL CHECK: Ensure we have IDs, otherwise return nothing for this query
                if (courseIds.length > 0) {
                    query._id = { $in: courseIds };
                } else {
                    // Force zero results if no assignments
                    query._id = new mongoose.Types.ObjectId();
                }
            }
            else if (req.user.role === 'admin' && req.query.tenantId) {
                query.tenantId = req.query.tenantId;
            }

            const allCourses = await Course.find(query)
                .populate('teacherId', 'name email')
                .sort({ createdAt: -1 });

            // Deduplicate courses by name - keep only the most recent one for each name
            const uniqueCourses = [];
            const seenNames = new Set();

            for (const course of allCourses) {
                const normalizedName = course.name.trim().toLowerCase();
                if (!seenNames.has(normalizedName)) {
                    seenNames.add(normalizedName);
                    uniqueCourses.push(course);
                }
            }

            console.log(`COURSES: Found ${allCourses.length} total, returning ${uniqueCourses.length} unique for role ${req.user.role}`);
            return res.status(200).json(uniqueCourses);

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
            }).populate('teacherId', 'name email');

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
            const { name, description, teacherId } = req.body;

            const course = await Course.findOneAndUpdate(
                { _id: id, tenantId: req.user.tenantId },
                { name: name ? name.trim() : undefined, description, teacherId },
                { new: true, runValidators: true }
            ).populate('teacherId', 'name email');

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
