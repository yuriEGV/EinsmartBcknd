import Atraso from '../models/atrasoModel.js';
import mongoose from 'mongoose';

export const getAtrasos = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { courseId } = req.query;
        let query = { tenantId };

        if (courseId) {
            const Enrollment = await import('../models/enrollmentModel.js').then(m => m.default);
            const enrollments = await Enrollment.find({ courseId, tenantId }).select('estudianteId');
            const studentIds = enrollments.map(e => e.estudianteId);
            query.estudianteId = { $in: studentIds };
        }

        const atrasos = await Atraso.find(query)
            .populate('estudianteId', 'nombres apellidos rut')
            .populate('registradoPor', 'name')
            .sort({ fecha: -1 });
        res.status(200).json(atrasos);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener atrasos', error: error.message });
    }
};

export const getAtrasosByEstudiante = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { estudianteId } = req.params;
        const atrasos = await Atraso.find({ tenantId, estudianteId })
            .populate('registradoPor', 'name')
            .sort({ fecha: -1 });
        res.status(200).json(atrasos);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener atrasos del estudiante', error: error.message });
    }
};

export const createAtraso = async (req, res) => {
    try {
        const { tenantId, _id: userId } = req.user;
        const { estudianteId, fecha, bloque, minutosAtraso, motivo, estado } = req.body;

        const newAtraso = new Atraso({
            tenantId,
            estudianteId,
            fecha,
            bloque,
            minutosAtraso,
            motivo,
            estado: estado || 'injustificado',
            registradoPor: userId
        });

        const savedAtraso = await newAtraso.save();
        res.status(201).json(savedAtraso);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear atraso', error: error.message });
    }
};

export const updateAtraso = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;
        const updates = req.body;

        const atraso = await Atraso.findOneAndUpdate(
            { _id: id, tenantId },
            updates,
            { new: true }
        );

        if (!atraso) {
            return res.status(404).json({ message: 'Atraso no encontrado' });
        }
        res.status(200).json(atraso);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar atraso', error: error.message });
    }
};

export const deleteAtraso = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;

        const deletedAtraso = await Atraso.findOneAndDelete({ _id: id, tenantId });
        if (!deletedAtraso) {
            return res.status(404).json({ message: 'Atraso no encontrado' });
        }
        res.status(200).json({ message: 'Atraso eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar atraso', error: error.message });
    }
};
