import EventRequest from '../models/eventRequestModel.js';
import NotificationService from '../services/notificationService.js';
import connectDB from '../config/db.js';

class EventRequestController {
    static async createRequest(req, res) {
        try {
            if (req.user.role === 'student') {
                return res.status(403).json({ message: 'Los alumnos no pueden proponer eventos.' });
            }
            await connectDB();
            const { title, description, date, location } = req.body;
            const tenantId = req.user.tenantId;
            const userId = req.user.userId;

            const request = await EventRequest.create({
                tenantId,
                userId,
                title,
                description,
                date,
                location
            });

            // Broadcast notification to Admins
            await NotificationService.broadcastToAdmins({
                tenantId,
                title: 'Nueva Solicitud de Evento',
                message: `El profesor ${req.user.name} ha solicitado organizar un evento: ${title}`,
                type: 'event_request',
                link: '/events'
            });

            res.status(201).json(request);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async getMyRequests(req, res) {
        try {
            await connectDB();
            const requests = await EventRequest.find({
                userId: req.user.userId,
                tenantId: req.user.tenantId
            }).sort({ createdAt: -1 });

            res.json(requests);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async getAllRequests(req, res) {
        try {
            await connectDB();
            // Admins/Directors can see all requests for their tenant
            const requests = await EventRequest.find({
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

            const request = await EventRequest.findOneAndUpdate(
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

            // Notify Teacher (User)
            await NotificationService.createInternalNotification({
                tenantId: req.user.tenantId,
                userId: request.userId,
                title: 'Actualización de Solicitud de Evento',
                message: `Tu solicitud para el evento "${request.title}" ha sido ${status}.`,
                type: 'event_update',
                link: '/events'
            });

            res.json(request);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async deleteRequest(req, res) {
        try {
            await connectDB();
            const { id } = req.params;
            // Only can delete if pending or if it's their own
            const request = await EventRequest.findOneAndDelete({
                _id: id,
                tenantId: req.user.tenantId,
                $or: [
                    { userId: req.user.userId, status: 'pendiente' },
                    { _id: { $exists: true } && (req.user.role === 'admin' || req.user.role === 'sostenedor' || req.user.role === 'director' ? {} : { _id: null }) }
                ]
            });

            if (!request) return res.status(404).json({ message: 'No se pudo eliminar la solicitud' });
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export default EventRequestController;
