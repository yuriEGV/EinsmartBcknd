import Alternancia from '../models/alternanciaModel.js';
import Enrollment from '../models/enrollmentModel.js';
import Career from '../models/careerModel.js';
import Empresa from '../models/empresaModel.js';
import AlternanciaLocation from '../models/alternanciaLocationModel.js';
import User from '../models/userModel.js';
import mongoose from 'mongoose';

export const getAlternancias = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const alternancias = await Alternancia.find({ tenantId })
            .populate('estudianteId', 'firstName lastName rut')
            .populate('empresa', 'razonSocial rut emailContacto')
            .populate('careerId', 'name')
            .populate('profesorSupervisor', 'name')
            .populate('modulosDual.subjectId', 'name')
            .sort({ fechaInicio: -1 });
        res.status(200).json(alternancias);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener alternancias', error: error.message });
    }
};

export const getAlternanciaById = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;
        const alternancia = await Alternancia.findOne({ _id: id, tenantId })
            .populate('estudianteId', 'firstName lastName rut')
            .populate('empresa', 'razonSocial rut tutor emailContacto')
            .populate('careerId', 'name')
            .populate('profesorSupervisor', 'name')
            .populate('modulosDual.subjectId', 'name');
        if (!alternancia) return res.status(404).json({ message: 'Alternancia no encontrada' });
        res.status(200).json(alternancia);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener alternancia', error: error.message });
    }
};

export const getAlternanciasByEstudiante = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { estudianteId } = req.params;
        const alternancias = await Alternancia.find({ tenantId, estudianteId })
            .populate('empresa', 'razonSocial')
            .populate('careerId', 'name')
            .populate('profesorSupervisor', 'name')
            .sort({ fechaInicio: -1 });
        res.status(200).json(alternancias);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener alternancias del estudiante', error: error.message });
    }
};

export const createAlternancia = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const data = req.body;

        if (!data.empresa) {
            return res.status(400).json({ message: 'La Selección de la Empresa es obligatoria.' });
        }
        
        if (['Pasantía', 'Práctica Profesional'].includes(data.tipo) && !data.seguroEscolar) {
            // Optional strict check, or handle in frontend. Let's strictly enforce if required:
            // return res.status(400).json({ message: 'El Seguro Escolar es obligatorio para Pasantías y Prácticas.' });
        }

        const newAlternancia = new Alternancia({
            ...data,
            tenantId
        });

        const savedAlternancia = await newAlternancia.save();
        res.status(201).json(savedAlternancia);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear alternancia', error: error.message });
    }
};

export const updateAlternancia = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;
        const updates = req.body;

        const currentAlt = await Alternancia.findOne({ _id: id, tenantId });
        if (!currentAlt) return res.status(404).json({ message: 'Alternancia no encontrada' });

        const alternancia = await Alternancia.findByIdAndUpdate(
            id,
            updates,
            { new: true, runValidators: true }
        );

        res.status(200).json(alternancia);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar alternancia', error: error.message });
    }
};

export const deleteAlternancia = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;

        const deletedAlternancia = await Alternancia.findOneAndDelete({ _id: id, tenantId });
        if (!deletedAlternancia) {
            return res.status(404).json({ message: 'Alternancia no encontrada' });
        }
        res.status(200).json({ message: 'Alternancia eliminada correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar alternancia', error: error.message });
    }
};

export const addBitacoraEntry = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;
        const entryData = req.body;
        const alternancia = await Alternancia.findOne({ _id: id, tenantId });
        if (!alternancia) return res.status(404).json({ message: 'Alternancia no encontrada' });

        alternancia.bitacora.push({ ...entryData, fecha: new Date() });
        await alternancia.save();
        res.status(201).json(alternancia);
    } catch (error) {
        res.status(500).json({ message: 'Error al agregar bitácora', error: error.message });
    }
};

export const signBitacoraEntry = async (req, res) => {
    try {
        const { tenantId, userId, role } = req.user;
        const { id, bitacoraId } = req.params;
        const { pin } = req.body;

        const [alternancia, user] = await Promise.all([
            Alternancia.findOne({ _id: id, tenantId }),
            User.findById(userId)
        ]);

        if (!alternancia) return res.status(404).json({ message: 'Alternancia no encontrada' });
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        if (user.signaturePin !== pin) {
            return res.status(401).json({ message: 'PIN de firma digital inválido' });
        }

        const bitacora = alternancia.bitacora.id(bitacoraId);
        if (!bitacora) return res.status(404).json({ message: 'Entrada de bitácora no encontrada' });

        if (role === 'student' || role === 'alumno') {
            bitacora.firmaEstudiante = 'FIRMADO_PIN';
        } else {
            bitacora.firmadoTutor = true;
            bitacora.firmaTutorContenido = 'FIRMADO_PIN';
        }

        await alternancia.save();
        res.status(200).json(alternancia);
    } catch (error) {
        res.status(500).json({ message: 'Error al firmar bitácora', error: error.message });
    }
};

export const recordLocation = async (req, res) => {
    try {
        const { tenantId, userId, role } = req.user;
        const { id } = req.params;
        const { lat, lng, accuracy } = req.body;

        const newLocation = new AlternanciaLocation({
            tenantId,
            alternanciaId: id,
            userId,
            role,
            lat,
            lng,
            accuracy
        });

        await newLocation.save();

        res.status(201).json({ message: 'Ubicación registrada' });
    } catch (error) {
        res.status(500).json({ message: 'Error al registrar GPS', error: error.message });
    }
};

export const getActiveLocations = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

        const locations = await AlternanciaLocation.aggregate([
            { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), timestamp: { $gte: twoHoursAgo } } },
            { $sort: { timestamp: -1 } },
            {
                 $group: {
                     _id: "$alternanciaId",
                     userId: { $first: "$userId" },
                     role: { $first: "$role" },
                     lat: { $first: "$lat" },
                     lng: { $first: "$lng" },
                     accuracy: { $first: "$accuracy" },
                     timestamp: { $first: "$timestamp" }
                 }
            }
        ]);

        const populated = await AlternanciaLocation.populate(locations, [
            { 
                path: '_id', 
                model: 'Alternancia', 
                select: 'estudianteId empresa', 
                populate: [
                    { path: 'estudianteId', model: 'User', select: 'name firstName lastName rut' }, 
                    { path: 'empresa', model: 'Empresa', select: 'razonSocial' }
                ] 
            },
            { path: 'userId', model: 'User', select: 'name role' }
        ]);

        res.status(200).json(populated);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener ubicaciones activas', error: error.message });
    }
};
