import AdminDay from '../models/adminDayModel.js';
import User from '../models/userModel.js';
import connectDB from '../config/db.js';
import NotificationService from '../services/notificationService.js';

class AdminDayController {
    static async createRequest(req, res) {
        try {
            await connectDB();
            const { date, type, reason } = req.body;
            const tenantId = req.user.tenantId;
            const userId = req.user.userId;

            // Check if user has days left
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }

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

            // Broadcast to Admins
            await NotificationService.broadcastToAdmins({
                tenantId,
                title: 'Nueva Solicitud Administrativa',
                message: `El funcionario ${user.name} ha solicitado un día administrativo para el ${new Date(date).toLocaleDateString()}.`,
                type: 'admin_day_request',
                link: '/admin-days'
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
                userId: req.user.userId,
                tenantId: req.user.tenantId
            }).populate('userId', 'name role').sort({ date: -1 });

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
                    reviewedBy: req.user.userId,
                    reviewDate: new Date()
                },
                { new: true }
            );

            if (!request) return res.status(404).json({ message: 'Solicitud no encontrada' });

            // Notify User
            await NotificationService.createInternalNotification({
                tenantId: req.user.tenantId,
                userId: request.userId,
                title: 'Actualización de Día Administrativo',
                message: `Tu solicitud para el día ${new Date(request.date).toLocaleDateString()} ha sido ${status}.`,
                type: 'admin_day_update',
                link: '/admin-days'
            });

            // Optional: Broadcast update to other admins? Probably not necessary unless requested.

            res.json(request);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async getStats(req, res) {
        try {
            await connectDB();
            const userId = req.query.userId || req.user.userId;
            const tenantId = req.user.tenantId;

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }

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
