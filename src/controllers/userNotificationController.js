import UserNotification from '../models/userNotificationModel.js';
import connectDB from '../config/db.js';

class UserNotificationController {
    // Get notifications for the logged-in user
    static async getMyNotifications(req, res) {
        try {
            await connectDB();
            const notifications = await UserNotification.find({
                tenantId: req.user.tenantId,
                userId: req.user.userId
            })
                .sort({ createdAt: -1 })
                .limit(50);

            res.status(200).json(notifications);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Mark notification as read
    static async markAsRead(req, res) {
        try {
            await connectDB();
            const { id } = req.params;
            const notification = await UserNotification.findOneAndUpdate(
                { _id: id, userId: req.user.userId, tenantId: req.user.tenantId },
                { isRead: true },
                { new: true }
            );

            if (!notification) {
                return res.status(404).json({ message: 'Notificación no encontrada' });
            }

            res.status(200).json(notification);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Mark all as read
    static async markAllAsRead(req, res) {
        try {
            await connectDB();
            await UserNotification.updateMany(
                { userId: req.user.userId, tenantId: req.user.tenantId, isRead: false },
                { isRead: true }
            );

            res.status(200).json({ message: 'Todas las notificaciones marcadas como leídas' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export default UserNotificationController;
