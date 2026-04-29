import Alternancia from '../models/alternanciaModel.js';
import Enrollment from '../models/enrollmentModel.js';
import Career from '../models/careerModel.js';
import Empresa from '../models/empresaModel.js';
import AlternanciaLocation from '../models/alternanciaLocationModel.js';
import User from '../models/userModel.js';
import mongoose from 'mongoose';

export const getAlternancias = async (req, res) => {
    try {
        const { tenantId, userId, role } = req.user;
        let query = { tenantId };

        // Data Isolation: Teachers only see their assigned supervisions
        if (role === 'teacher') {
            query.profesorSupervisor = userId;
        }

        // Data Isolation: Company Tutors only see their assigned students
        if (role === 'tutor_empresa') {
            query.$or = [
                { tutorId: userId },
                { "maestroGuia.email": req.user.email }
            ];
        }

        console.log(`[DEBUG] getAlternancias - User: ${userId}, Role: ${role}, Query:`, JSON.stringify(query));

        const alternancias = await Alternancia.find(query)
            .populate('estudianteId', 'nombres apellidos rut photoUrl')
            .populate('empresa', 'razonSocial rut emailContacto')
            .populate('careerId', 'name headTeacher profesorJefe')
            .populate('profesorSupervisor', 'name')
            .populate('tutorId', 'name email')
            .populate('modulosDual.subjectId', 'name')
            .sort({ fechaInicio: -1 });
        res.status(200).json(alternancias);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener alternancias', error: error.message });
    }
};

export const getAlternanciaById = async (req, res) => {
    try {
        const { tenantId, userId, role } = req.user;
        const { id } = req.params;
        let query = { _id: id, tenantId };

        if (role === 'teacher') {
            query.profesorSupervisor = userId;
        }

        if (role === 'tutor_empresa') {
            query = {
                _id: id,
                tenantId,
                $or: [
                    { tutorId: userId },
                    { "maestroGuia.email": req.user.email }
                ]
            };
        }

        const alternancia = await Alternancia.findOne(query)
            .populate('estudianteId', 'nombres apellidos rut photoUrl')
            .populate('empresa', 'razonSocial rut tutor emailContacto')
            .populate('careerId', 'name headTeacher profesorJefe')
            .populate('profesorSupervisor', 'name')
            .populate('tutorId', 'name email')
            .populate('modulosDual.subjectId', 'name');
        if (!alternancia) return res.status(404).json({ message: 'Alternancia no encontrada o no tiene permisos para verla' });
        res.status(200).json(alternancia);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener alternancia', error: error.message });
    }
};

export const getAlternanciasByEstudiante = async (req, res) => {
    try {
        const { tenantId, role, userId } = req.user;
        const { estudianteId } = req.params;
        
        let query = { tenantId, estudianteId };
        if (role === 'teacher') {
            query.profesorSupervisor = userId;
        }

        if (role === 'tutor_empresa') {
            query.$or = [
                { tutorId: userId },
                { "maestroGuia.email": req.user.email }
            ];
        }

        const alternancias = await Alternancia.find(query)
            .populate('estudianteId', 'nombres apellidos rut photoUrl')
            .populate('empresa', 'razonSocial')
            .populate('careerId', 'name headTeacher profesorJefe')
            .populate('profesorSupervisor', 'name')
            .populate('tutorId', 'name email')
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

        console.log(`[DEBUG] updateAlternancia - ID: ${id}, Updates:`, JSON.stringify(updates));

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

        const isTutorEmpresa = role === 'tutor_empresa' && alternancia.tutorId?.toString() === userId.toString();
        const isSupervisor = (role === 'teacher' || role === 'admin' || role === 'utp' || role === 'director') && alternancia.profesorSupervisor?.toString() === userId.toString();

        if (role === 'student' || role === 'alumno') {
            bitacora.firmaEstudiante = 'FIRMADO_PIN';
        } else if (isTutorEmpresa) {
            bitacora.firmadoTutorEmpresa = true;
            bitacora.firmaTutorEmpresaContenido = 'FIRMADO_PIN';
            bitacora.firmadoTutor = true; // Sync for legacy
        } else if (isSupervisor) {
            bitacora.firmadoSupervisor = true;
            bitacora.firmaSupervisorContenido = 'FIRMADO_PIN';
        } else {
            // If admin is signing but not the supervisor, we could allow it or restrict it. 
            // The user requested "ambos profesores", so we should be specific.
            return res.status(403).json({ message: 'Usted no es el tutor o supervisor asignado a esta alternancia' });
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
                    { path: 'estudianteId', model: 'User', select: 'name nombres apellidos rut' }, 
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
