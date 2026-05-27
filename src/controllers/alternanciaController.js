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

        // Data Isolation: Teachers see their assigned supervisions OR alternancias for careers they lead (jefe de carrera)
        if (role === 'teacher') {
            const careersHeaded = await Career.find({
                $or: [
                    { headTeacher: userId },
                    { profesorJefe: userId }
                ],
                tenantId
            }).select('_id');
            const careerIds = careersHeaded.map(c => c._id);
            
            if (careerIds.length > 0) {
                query.$or = [
                    { profesorSupervisor: userId },
                    { careerId: { $in: careerIds } }
                ];
            } else {
                query.profesorSupervisor = userId;
            }
        }

        // Data Isolation: Students only see their own alternancias
        if (role === 'student' || role === 'alumno') {
            query.estudianteId = userId;
        }

        // Data Isolation: Guardians only see their children's alternancias
        if (role === 'apoderado') {
            const apoderados = await mongoose.model('Apoderado').find({ 
                $or: [
                    { _id: req.user.profileId },
                    { correo: req.user.email }
                ],
                tenantId 
            });
            const studentIds = apoderados.map(a => a.estudianteId);
            query.estudianteId = { $in: studentIds };
        }

        // Data Isolation: Company Tutors only see their assigned students
        if (role === 'tutor_empresa') {
            query.$or = [
                { tutorId: userId },
                { "maestroGuia.email": req.user.email }
            ];
        }

        // Feature: Filter by CourseId for Reports
        const { courseId } = req.query;
        if (courseId) {
            const enrollments = await Enrollment.find({
                courseId,
                tenantId,
                status: { $in: ['confirmada', 'activo', 'activa'] }
            }).select('estudianteId');
            const enrolledStudentIds = enrollments.map(e => e.estudianteId);
            
            if (query.estudianteId) {
                // Intersect if already filtered by role
                const currentIds = Array.isArray(query.estudianteId.$in) ? query.estudianteId.$in : [query.estudianteId];
                const intersection = currentIds.filter(id => enrolledStudentIds.some(eid => eid.equals(id)));
                query.estudianteId = { $in: intersection };
            } else {
                query.estudianteId = { $in: enrolledStudentIds };
            }
        }

        console.log(`[DEBUG] getAlternancias - User: ${userId}, Role: ${role}, Query:`, JSON.stringify(query));

        const alternancias = await Alternancia.find(query)
            .populate('estudianteId', 'nombres apellidos rut photoUrl')
            .populate('empresa', 'razonSocial rut emailContacto')
            .populate('careerId', 'name headTeacher profesorJefe')
            .populate('profesorSupervisor', 'nombres apellidos name email')
            .populate('tutorId', 'nombres apellidos name email')
            .populate('modulosDual.subjectId', 'name')
            .sort({ fechaInicio: -1 });

        // [PRO FEATURE] Detect active medical licenses for each student
        const MedicalLicense = mongoose.model('MedicalLicense');
        const enrichedAlternancias = await Promise.all(alternancias.map(async (alt) => {
            const doc = alt.toObject();
            const activeLicense = await MedicalLicense.findOne({
                userId: alt.estudianteId?._id,
                tenantId,
                fechaInicio: { $lte: new Date() },
                fechaFin: { $gte: new Date() },
                estado: 'Aprobado'
            });
            return {
                ...doc,
                hasActiveLicense: !!activeLicense,
                licenseDetails: activeLicense || null
            };
        }));

        res.status(200).json(enrichedAlternancias);
    } catch (error) {
        console.error('Error in getAlternancias:', error);
        res.status(500).json({ message: 'Error al obtener alternancias', error: error.message });
    }
};

export const getAlternanciaById = async (req, res) => {
    try {
        const { tenantId, userId, role } = req.user;
        const { id } = req.params;
        let query = { _id: id, tenantId };

        if (role === 'teacher') {
            const careersHeaded = await Career.find({
                $or: [
                    { headTeacher: userId },
                    { profesorJefe: userId }
                ],
                tenantId
            }).select('_id');
            const careerIds = careersHeaded.map(c => c._id);
            
            query = {
                _id: id,
                tenantId,
                $or: [
                    { profesorSupervisor: userId },
                    { careerId: { $in: careerIds } }
                ]
            };
        }

        if (role === 'student' || role === 'alumno') {
            query.estudianteId = userId;
        }

        if (role === 'apoderado') {
            const apoderados = await mongoose.model('Apoderado').find({ 
                $or: [
                    { _id: req.user.profileId },
                    { correo: req.user.email }
                ],
                tenantId 
            });
            const studentIds = apoderados.map(a => a.estudianteId);
            query.estudianteId = { $in: studentIds };
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
            const careersHeaded = await Career.find({
                $or: [
                    { headTeacher: userId },
                    { profesorJefe: userId }
                ],
                tenantId
            }).select('_id');
            const careerIds = careersHeaded.map(c => c._id);
            
            query.$or = [
                { profesorSupervisor: userId },
                { careerId: { $in: careerIds } }
            ];
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
        const { tenantId, userId, role } = req.user;
        const data = req.body;

        if (role === 'teacher') {
            const isCareerTeacher = await Career.findOne({
                tenantId,
                $or: [
                    { headTeacher: userId },
                    { profesorJefe: userId }
                ]
            });
            if (!isCareerTeacher) {
                return res.status(403).json({ message: 'Acceso denegado: Solo profesores jefes de formación técnica/carreras pueden gestionar alternancias.' });
            }
        }

        if (!data.empresa) {
            return res.status(400).json({ message: 'La Selección de la Empresa es obligatoria.' });
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
        const { tenantId, userId, role } = req.user;
        const { id } = req.params;
        const updates = req.body;

        if (role === 'teacher') {
            const isCareerTeacher = await Career.findOne({
                tenantId,
                $or: [
                    { headTeacher: userId },
                    { profesorJefe: userId }
                ]
            });
            if (!isCareerTeacher) {
                return res.status(403).json({ message: 'Acceso denegado: Solo profesores jefes de formación técnica/carreras pueden gestionar alternancias.' });
            }
        }

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
        const { tenantId, userId, role } = req.user;
        const { id } = req.params;

        if (role === 'teacher') {
            const isCareerTeacher = await Career.findOne({
                tenantId,
                $or: [
                    { headTeacher: userId },
                    { profesorJefe: userId }
                ]
            });
            if (!isCareerTeacher) {
                return res.status(403).json({ message: 'Acceso denegado: Solo profesores jefes de formación técnica/carreras pueden gestionar alternancias.' });
            }
        }

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

        const isTutorEmpresa = role === 'tutor_empresa' && (
            alternancia.tutorId?.toString() === userId.toString() ||
            alternancia.maestroGuia?.email === req.user.email
        );
        
        // Admins, Directors, and UTP can sign even if they aren't the designated supervisor
        const isAdminPower = role === 'admin' || role === 'director' || role === 'utp' || role === 'inspector_general';
        const isSupervisor = (role === 'teacher' || isAdminPower) && alternancia.profesorSupervisor?.toString() === userId.toString();

        if (role === 'student' || role === 'alumno') {
            bitacora.firmaEstudiante = 'FIRMADO_PIN';
        } else if (isTutorEmpresa) {
            bitacora.firmadoTutorEmpresa = true;
            bitacora.firmaTutorEmpresaContenido = 'FIRMADO_PIN';
            bitacora.firmadoTutor = true; 
        } else if (isSupervisor || isAdminPower) {
            bitacora.firmadoSupervisor = true;
            bitacora.firmaSupervisorContenido = 'FIRMADO_PIN';
        } else {
            return res.status(403).json({ message: 'Usted no tiene permisos para firmar esta bitácora' });
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

export const getHorariosProfesores = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { courseId } = req.query;

        if (!courseId) {
            return res.status(400).json({ message: 'El ID del curso es obligatorio.' });
        }

        const enrollments = await Enrollment.find({
            courseId,
            tenantId,
            status: { $in: ['confirmada', 'activo', 'activa'] }
        }).populate('profesorId', 'nombres apellidos name email horarios horariosAula')
         .populate('courseId', 'name codigo');

        const horarios = enrollments.map(e => ({
            _id: e.profesorId._id,
            profesor: e.profesorId.name || `${e.profesorId.nombres} ${e.profesorId.apellidos}`,
            email: e.profesorId.email,
            curso: e.courseId.name,
            horarios: e.profesorId.horarios || [],
            horariosAula: e.profesorId.horariosAula || []
        }));

        // Remove duplicates by profesor ID
        const uniqueHorarios = Array.from(new Map(horarios.map(h => [h._id.toString(), h])).values());

        res.status(200).json(uniqueHorarios);
    } catch (error) {
        console.error('Error en getHorariosProfesores:', error);
        res.status(500).json({ message: 'Error al obtener horarios de profesores', error: error.message });
    }
};

export const getDocentesDisponiblesPorCarrera = async (req, res) => {
    try {
        const { tenantId, userId } = req.user;
        const { careerId } = req.query;

        if (!careerId) {
            return res.status(400).json({ message: 'El ID de la carrera es obligatorio.' });
        }

        const career = await Career.findOne({ _id: careerId, tenantId })
            .populate('cursos', '_id')
            .exec();

        if (!career) {
            return res.status(404).json({ message: 'Carrera no encontrada' });
        }

        const courseIds = career.cursos?.map(c => c._id) || [];

        const enrollments = await Enrollment.find({
            courseId: { $in: courseIds },
            tenantId,
            status: { $in: ['confirmada', 'activo', 'activa'] }
        }).populate('profesorId', 'nombres apellidos name email role').distinct('profesorId');

        const docentes = enrollments.filter(prof => prof.role === 'teacher' || prof.role === 'docente');

        res.status(200).json(docentes);
    } catch (error) {
        console.error('Error en getDocentesDisponiblesPorCarrera:', error);
        res.status(500).json({ message: 'Error al obtener docentes disponibles', error: error.message });
    }
};
