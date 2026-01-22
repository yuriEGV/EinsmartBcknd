import Event from '../models/eventModel.js';

class EventController {
    static async createEvent(req, res) {
        try {
            const event = new Event({
                ...req.body,
                creadoPor: req.user.userId,
                tenantId: req.user.tenantId
            });
            await event.save();
            res.status(201).json(event);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    static async getEvents(req, res) {
        try {
            const query = (req.user.role === 'admin')
                ? {}
                : { tenantId: req.user.tenantId };

            const events = await Event.find(query)
                .sort({ date: 1 });
            res.status(200).json(events);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async deleteEvent(req, res) {
        try {
            const event = await Event.findOneAndDelete({
                _id: req.params.id,
                tenantId: req.user.tenantId
            });
            if (!event) return res.status(404).json({ message: 'Evento no encontrado' });
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export default EventController;
