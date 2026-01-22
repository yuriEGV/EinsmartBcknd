import AuditLog from '../models/auditLogModel.js';

class AuditLogController {
    static async getLogs(req, res) {
        try {
            // Admin (SuperAdmin) can see all logs, others only their tenant
            const query = (req.user.role === 'admin')
                ? {}
                : { tenantId: req.user.tenantId };

            const logs = await AuditLog.find(query)
                .populate('user', 'name email role')
                .sort({ createdAt: -1 });
            res.status(200).json(logs);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export default AuditLogController;
