import AdminDay from '../models/adminDayModel.js';
import User from '../models/userModel.js';
import connectDB from '../config/db.js';

class AdminDayController {
    static async createRequest(req, res) {
        try {
            await connectDB();
            const { date, type, reason } = req.body;
            const tenantId = req.user.tenantId;
            const userId = req.user._id;

            // Check if user has days left
            const user = await User.findById(userId);
            const usedDays = await AdminDay.countDocuments({
                userId,
                tenantId,
                status: { $in: ['pendiente', 'aprobado'] }
            });

            const limit = user.adminDaysAllowed || 6;
            if (usedDays >= limit) {
                return res.status(400).json({ message: 'Has alcanzado el límite de días administrativos para este año.' });
            }

            const request = await AdminDay.create({
                tenantId,
                userId,
                date,
                type,
                reason
            });

            res.status(201).json(request);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async getMyRequests(req, res) {
        try {
            await connectDB();
            const requests = await AdminDay.find({
                userId: req.user._id,
                tenantId: req.user.tenantId
            }).sort({ date: -1 });

            res.json(requests);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async getAllRequests(req, res) {
        try {
            await connectDB();
            // Only admins or sostenedores can see all
            const requests = await AdminDay.find({
                tenantId: req.user.tenantId
            }).populate('userId', 'name role').sort({ createdAt: -1 });

            res.json(requests);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async updateStatus(req, res) {
        try {
            await connectDB();
            const { id } = req.params;
            const { status, rejectionReason } = req.body;

            const request = await AdminDay.findOneAndUpdate(
                { _id: id, tenantId: req.user.tenantId },
                {
                    status,
                    rejectionReason,
                    reviewedBy: req.user._id,
                    reviewDate: new Date()
                },
                { new: true }
            );

            if (!request) return res.status(404).json({ message: 'Solicitud no encontrada' });

            res.json(request);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async getStats(req, res) {
        try {
            await connectDB();
            const userId = req.query.userId || req.user._id;
            const tenantId = req.user.tenantId;

            const user = await User.findById(userId);
            const usedDays = await AdminDay.countDocuments({
                userId,
                tenantId,
                status: 'aprobado'
            });
            const pendingDays = await AdminDay.countDocuments({
                userId,
                tenantId,
                status: 'pendiente'
            });

            res.json({
                totalAllowed: user.adminDaysAllowed || 6,
                used: usedDays,
                pending: pendingDays,
                remaining: (user.adminDaysAllowed || 6) - usedDays
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export default AdminDayController;
