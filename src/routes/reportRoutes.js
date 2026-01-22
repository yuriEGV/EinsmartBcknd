import express from 'express';
import Report from '../models/reportModel.js';

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

/**
 * OBTENER REPORTE POR ID
 * GET /api/reports/:id
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
