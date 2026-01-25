import ClassLog from '../models/classLogModel.js';
import mongoose from 'mongoose';

class ClassLogController {
    static async create(req, res) {
        try {
            const { courseId, subjectId, date, topic, activities, objectives } = req.body;

            const log = new ClassLog({
                tenantId: req.user.tenantId,
                courseId,
                subjectId,
                teacherId: req.user.userId,
                date: date || new Date(),
                topic,
                activities,
                objectives
            });

            await log.save();
            res.status(201).json(log);
        } catch (error) {
            console.error('Error creating class log:', error);
            res.status(500).json({ message: error.message });
        }
    }

    static async list(req, res) {
        try {
            const { courseId, subjectId, startDate, endDate, isSigned } = req.query;
            const query = { tenantId: req.user.tenantId };

            if (isSigned !== undefined) query.isSigned = isSigned === 'true';

            if (courseId) query.courseId = courseId;
            if (subjectId) query.subjectId = subjectId;

            // Security: Teachers can only see their own logs unless they are admin
            if (req.user.role === 'teacher') {
                query.teacherId = req.user.userId;
            }

            if (startDate || endDate) {
                query.date = {};
                if (startDate) query.date.$gte = new Date(startDate);
                if (endDate) query.date.$lte = new Date(endDate);
            }

            const logs = await ClassLog.find(query)
                .populate('courseId', 'name')
                .populate('subjectId', 'name')
                .populate('teacherId', 'name')
                .sort({ date: -1 });

            res.json(logs);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async sign(req, res) {
        try {
            const { id } = req.params;
            const { pin } = req.body;

            // In a real scenario, compare pin with user's hashed pin
            // For now, simple flag
            const log = await ClassLog.findOne({ _id: id, tenantId: req.user.tenantId });

            if (!log) return res.status(404).json({ message: 'Registro no encontrado' });

            // Security: Only the assigned teacher or an admin can sign
            if (req.user.role === 'teacher' && log.teacherId.toString() !== req.user.userId.toString()) {
                return res.status(403).json({ message: 'No autorizado para firmar este registro' });
            }

            log.isSigned = true;
            log.signedAt = new Date();
            await log.save();

            res.json(log);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            const query = { _id: id, tenantId: req.user.tenantId };

            // Teachers can only delete their unsigned logs
            if (req.user.role === 'teacher') {
                query.teacherId = req.user.userId;
                query.isSigned = false;
            }

            const result = await ClassLog.findOneAndDelete(query);
            if (!result) return res.status(404).json({ message: 'Registro no encontrado o ya está firmado' });

            res.status(204).send();
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export default ClassLogController;
