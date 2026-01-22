import Report from '../models/reportModel.js';

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
}

export default ReportController;
