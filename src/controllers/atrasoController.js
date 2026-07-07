import Atraso from '../models/atrasoModel.js';
import mongoose from 'mongoose';

// [BUG 2 FIX] Minutos legales de descuento por bloque según normativa MINEDUC Chile
// Corresponde al tiempo proporcional del bloque que se pierde por el atraso
const MINUTOS_LEGALES_BLOQUE = {
    'Bloque 1': 25,  // Bloque inicial: mayor impacto (inicio de jornada)
    'Bloque 2': 20,
    'Bloque 3': 15,
    'Bloque 4': 10,
    'Bloque 5': 10
};

/**
 * Agrega minutosLegales calculados según el bloque a un atraso
 */
const enrichAtraso = (atraso) => {
    const obj = atraso.toObject ? atraso.toObject() : { ...atraso };
    obj.minutosLegales = MINUTOS_LEGALES_BLOQUE[obj.bloque] || obj.minutosAtraso || 10;
    return obj;
};

export const getAtrasos = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { courseId } = req.query;
        const currentYear = req.user.academicYear || new Date().getFullYear();
        let query = { 
            tenantId,
            $or: [
                { academicYear: currentYear },
                { academicYear: { $exists: false } }
            ]
        };

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

        // [BUG 2 FIX] Enriquecer con minutosLegales por bloque
        res.status(200).json(atrasos.map(enrichAtraso));
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener atrasos', error: error.message });
    }
};

export const getAtrasosByEstudiante = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { estudianteId } = req.params;
        const atrasos = await Atraso.find({ tenantId, estudianteId })
            .populate('estudianteId', 'nombres apellidos rut')
            .populate('registradoPor', 'name')
            .sort({ fecha: -1 });
        // [BUG 2 FIX] Enriquecer con minutosLegales por bloque
        res.status(200).json(atrasos.map(enrichAtraso));
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
            registradoPor: userId,
            academicYear: req.user.academicYear || new Date().getFullYear()
        });

        const savedAtraso = await newAtraso.save();
        // [BUG 2 FIX] Enriquecer con minutosLegales por bloque
        res.status(201).json(enrichAtraso(savedAtraso));
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
