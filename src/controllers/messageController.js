import Message from '../models/messageModel.js';
import User from '../models/userModel.js';

class MessageController {
    static async sendMessage(req, res) {
        try {
            const { receiverId, content, subject } = req.body;
            const senderId = req.user.userId;
            const tenantId = req.user.tenantId;

            if (!receiverId || !content) {
                return res.status(400).json({ message: 'Receptor y contenido son obligatorios' });
            }

            const message = new Message({
                tenantId,
                senderId,
                receiverId,
                content,
                subject
            });

            await message.save();
            res.status(201).json(message);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async getMessages(req, res) {
        try {
            const userId = req.user.userId;
            const messages = await Message.find({
                tenantId: req.user.tenantId,
                $or: [{ senderId: userId }, { receiverId: userId }]
            })
                .populate('senderId', 'name role')
                .populate('receiverId', 'name role')
                .sort({ createdAt: -1 });

            res.json(messages);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async getContacts(req, res) {
        try {
            // Students can find teachers and other students in their tenant
            const users = await User.find({
                tenantId: req.user.tenantId,
                _id: { $ne: req.user.userId },
                role: { $in: ['teacher', 'student', 'admin', 'sostenedor'] }
            }).select('name role email');

            res.json(users);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export default MessageController;
