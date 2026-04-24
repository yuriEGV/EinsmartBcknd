import express from 'express';
import Report from '../models/reportModel.js';
import ReportController from '../controllers/reportController.js';

const router = express.Router();

const authorizedRoles = ['admin', 'sostenedor', 'director', 'utp', 'inspector_general', 'secretary', 'secretaria', 'secretario'];

const checkAuth = (req, res, next) => {
    if (authorizedRoles.includes(req.user.role)) {
        return next();
    }
    return res.status(403).json({ message: 'No tienes permisos para ver estos reportes.' });
};

/**
 * LISTAR REPORTES DEL TENANT
 * GET /api/reports
 */
router.get('/', async (req, res) => {
    try {
        const reports = await Report.find({
            tenantId: req.user.tenantId
        }).sort({ createdAt: -1 });

        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ⚠️ IMPORTANT: Specific routes MUST come before /:id to prevent Express
// from treating route names like 'teacher-time' as ObjectId parameters.

/**
 * GENERAR RESUMEN DE ESTUDIANTE (PARA IMPRESIÓN)
 * GET /api/reports/student/:studentId
 */
router.get('/student/:studentId', ReportController.getStudentSummary);

/**
 * RENDIMIENTO SEMANAL DE CLASES
 * GET /api/reports/performance
 */
router.get('/performance', checkAuth, ReportController.getWeeklyClassPerformance);

/**
 * REPORTE DE HORAS EN AULA POR PROFESOR
 * GET /api/reports/teacher-time?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
router.get('/teacher-time', checkAuth, ReportController.getTeacherTimeReport);

/**
 * RENDIMIENTO POR CURSO (PARA LIBRO DE CLASES / ESTADÍSTICAS)
 * GET /api/reports/course-performance/:courseId?subjectId=...
 */
router.get('/course-performance/:courseId', checkAuth, ReportController.getCoursePerformance);

/**
 * OBTENER REPORTE POR ID
 * GET /api/reports/:id
 * NOTE: This MUST be last, after all named routes above.
 */
router.get('/:id', async (req, res) => {
    try {
        const report = await Report.findOne({
            _id: req.params.id,
            tenantId: req.user.tenantId
        });

        if (!report) {
            return res.status(404).json({ message: 'Reporte no encontrado' });
        }

        res.json(report);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
