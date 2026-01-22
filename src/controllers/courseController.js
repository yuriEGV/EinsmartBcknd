// controllers/courseController.js
import Course from '../models/courseModel.js';

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
                name,
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
            const query = (req.user.role === 'admin' && req.query.tenantId)
                ? { tenantId: req.query.tenantId }
                : (req.user.role === 'admin' ? {} : { tenantId: req.user.tenantId });

            const courses = await Course.find(query)
                .populate('teacherId', 'name email')
                .sort({ createdAt: -1 });

            return res.status(200).json(courses);

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
            const { id } = req.params;
            const { name, description, teacherId } = req.body;

            const course = await Course.findOneAndUpdate(
                { _id: id, tenantId: req.user.tenantId },
                { name, description, teacherId },
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
