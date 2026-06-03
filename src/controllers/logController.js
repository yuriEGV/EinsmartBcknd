import { ClassBookLog } from '../models/pgModels.js';

class LogController {
    static async logAccess(req, res) {
        try {
            const { course_id, action, details } = req.body;
            const log = new ClassBookLog({
                tenant_id: req.user.tenantId,
                userId: req.user.userId,
                courseId,
                action,
                details
            });
            await log.save();
            res.status(201).json(log);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async getLogs(req, res) {
        try {
            const { course_id, limit = 50 } = req.query;
            const query = { tenant_id: req.user.tenantId };

            if (courseId) {
                query.courseId = courseId;
            }

            const logs = await ClassBookLog.find(query)
                
                
                .sort({ createdAt: -1 })
                .limit(parseInt(limit));

            res.json(logs);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export default LogController;
