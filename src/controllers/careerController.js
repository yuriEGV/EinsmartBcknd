
import Career from '../models/careerModel.js';

export default class CareerController {
    static async createCareer(req, res) {
        try {
            const { name, description, type, code, teachers, headTeacher } = req.body;
            const career = await Career.create({
                tenantId: req.user.tenantId,
                name,
                description,
                type,
                code,
                teachers,
                headTeacher
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
                .populate('headTeacher', 'name email');
            return res.status(200).json(careers);
        } catch (error) {
            return res.status(500).json({ message: 'Error al obtener carreras', error: error.message });
        }
    }

    static async updateCareer(req, res) {
        try {
            const { id } = req.params;
            const { name, description, type, code, teachers, headTeacher } = req.body;

            const career = await Career.findOneAndUpdate(
                { _id: id, tenantId: req.user.tenantId },
                { name, description, type, code, teachers, headTeacher },
                { new: true }
            )
                .populate('teachers', 'name email')
                .populate('headTeacher', 'name email');

            if (!career) return res.status(404).json({ message: 'Carrera no encontrada' });
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
            return res.status(204).send();
        } catch (error) {
            return res.status(500).json({ message: 'Error al eliminar carrera', error: error.message });
        }
    }
}
