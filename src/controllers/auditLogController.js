import { AuditLog } from '../models/pgModels.js';
import { Tenant } from '../models/pgModels.js';

const GLOBAL_ROLES = ['superadmin', 'fiscalizador'];

class AuditLogController {
    static async getLogs(req, res) {
        try {
            const role = (req.user.role || '').toLowerCase();
            const isGlobalAdmin = GLOBAL_ROLES.includes(role) || req.user.email === 'yuri@einsmart.cl';
            const { global: globalParam, tenantId: filterTenantId, limit = 200 } = req.query;

            let query = {};

            if (isGlobalAdmin && globalParam === 'true') {
                // Global admin sees all — optionally filter by a specific tenant
                if (filterTenantId) {
                    query.tenantId = filterTenantId;
                }
            } else {
                // Regular user: only see own tenant logs
                query.tenantId = req.user.tenantId;
            }

            const logs = await AuditLog.find(query)
                
                
                .sort({ createdAt: -1 })
                .limit(Number(limit));

            res.status(200).json(logs);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export default AuditLogController;

