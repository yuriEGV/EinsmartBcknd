import express from 'express';
import Report from '../models/reportModel.js';
import ReportController from '../controllers/reportController.js';

const router = express.Router();

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
router.get('/performance', ReportController.getWeeklyClassPerformance);

/**
 * REPORTE DE HORAS EN AULA POR PROFESOR
 * GET /api/reports/teacher-time?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
router.get('/teacher-time', ReportController.getTeacherTimeReport);

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
