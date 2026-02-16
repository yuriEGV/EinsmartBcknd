import Citacion from '../models/citacionModel.js';
import User from '../models/userModel.js';
import mongoose from 'mongoose';

class CitacionController {
    static async create(req, res) {
        try {
            const { estudianteId } = req.body;

            // Auto-lookup the apoderado for this student
            const student = await mongoose.model('Estudiante').findById(estudianteId);
            if (!student) return res.status(404).json({ message: 'Estudiante no encontrado' });
            if (!student.apoderadoId) return res.status(400).json({ message: 'El estudiante no tiene un apoderado asignado. No se puede crear la citación.' });

            const citacion = new Citacion({
                ...req.body,
                apoderadoId: student.apoderadoId,
                tenantId: req.user.tenantId,
                profesorId: req.user.userId
            });
            await citacion.save();
            res.status(201).json(citacion);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async list(req, res) {
        try {
            const { courseId } = req.query;
            const query = { tenantId: req.user.tenantId };

            // If we want to filter by course, we'll need to join with estudiantes
            // For now, let's keep it simple and filter by professor if not admin
            if (req.user.role === 'teacher') {
                query.profesorId = req.user.userId;
            }

            const citaciones = await Citacion.find(query)
                .populate('estudianteId', 'nombres apellidos')
                .populate('profesorId', 'name')
                .sort({ fecha: 1, hora: 1 });

            res.json(citaciones);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async updateStatus(req, res) {
        try {
            const { id } = req.params;
            const { estado, actaReunion } = req.body;
            const citacion = await Citacion.findOneAndUpdate(
                { _id: id, tenantId: req.user.tenantId },
                { estado, actaReunion },
                { new: true }
            );
            if (!citacion) return res.status(404).json({ message: 'Citación no encontrada' });
            res.json(citacion);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export default CitacionController;
