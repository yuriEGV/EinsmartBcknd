
import Career from '../models/careerModel.js';
import NotificationService from '../services/notificationService.js';

export default class CareerController {
    static async createCareer(req, res) {
        try {
            const { name, description, type, code, teachers, headTeacher, profesorJefe } = req.body;
            const career = await Career.create({
                tenantId: req.user.tenantId,
                name,
                description,
                type,
                code,
                teachers,
                headTeacher,
                profesorJefe
            });

            // Notify Administrative team
            await NotificationService.notifyPlatformChange({
                tenantId: req.user.tenantId,
                title: 'Nueva Carrera Registrada',
                message: `Se ha creado la especialidad: ${name}.`,
                type: 'career',
                link: '/careers'
            });

            return res.status(201).json(career);
        } catch (error) {
            return res.status(400).json({ message: 'Error al crear carrera', error: error.message });
        }
    }

    static async getCareers(req, res) {
        try {
            const careers = await Career.find({ tenantId: req.user.tenantId })
                .populate('teachers', 'name email')
                .populate('headTeacher', 'name email')
                .populate('profesorJefe', 'name email');
            return res.status(200).json(careers);
        } catch (error) {
            return res.status(500).json({ message: 'Error al obtener carreras', error: error.message });
        }
    }

    static async updateCareer(req, res) {
        try {
            const { id } = req.params;
            const { name, description, type, code, teachers, headTeacher, profesorJefe } = req.body;

            const career = await Career.findOneAndUpdate(
                { _id: id, tenantId: req.user.tenantId },
                { name, description, type, code, teachers, headTeacher, profesorJefe },
                { new: true }
            )
                .populate('teachers', 'name email')
                .populate('headTeacher', 'name email')
                .populate('profesorJefe', 'name email');

            if (!career) return res.status(404).json({ message: 'Carrera no encontrada' });

            // Notify Administrative team
            await NotificationService.notifyPlatformChange({
                tenantId: req.user.tenantId,
                title: 'Carrera Actualizada',
                message: `Se han modificado los datos de la especialidad: ${name || career.name}.`,
                type: 'career',
                link: '/careers'
            });

            return res.status(200).json(career);
        } catch (error) {
            return res.status(400).json({ message: 'Error al actualizar carrera', error: error.message });
        }
    }

    static async deleteCareer(req, res) {
        try {
            const { id } = req.params;
            const career = await Career.findOneAndDelete({ _id: id, tenantId: req.user.tenantId });
            if (!career) return res.status(404).json({ message: 'Carrera no encontrada' });

            // Notify Administrative team
            await NotificationService.notifyPlatformChange({
                tenantId: req.user.tenantId,
                title: 'Carrera Eliminada',
                message: `Se ha eliminado la especialidad: ${career.name}.`,
                type: 'career',
                link: '/careers'
            });

            return res.status(204).send();
        } catch (error) {
            return res.status(500).json({ message: 'Error al eliminar carrera', error: error.message });
        }
    }
}
