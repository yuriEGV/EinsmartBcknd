import Alternancia from '../models/alternanciaModel.js';
import Enrollment from '../models/enrollmentModel.js';
import Career from '../models/careerModel.js';

export const getAlternancias = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const alternancias = await Alternancia.find({ tenantId })
            .populate('estudianteId', 'firstName lastName rut')
            .populate('careerId', 'name')
            .populate('profesorSupervisor', 'name')
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
            .populate('careerId', 'name')
            .populate('profesorSupervisor', 'name');
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

        if (!data.careerId) {
            return res.status(400).json({ message: 'La Carrera es obligatoria para registrar una alternancia.' });
        }

        const activeEnrollment = await Enrollment.findOne({
            estudianteId: data.estudianteId,
            tenantId,
            status: { $in: ['activo', 'activa', 'confirmada'] }
        }).populate('courseId');

        if (!activeEnrollment || !activeEnrollment.courseId) {
            return res.status(400).json({ message: 'El estudiante no tiene una matrícula activa en ningún curso.' });
        }

        const studentCourse = activeEnrollment.courseId;

        if (studentCourse.careerId?.toString() !== data.careerId.toString()) {
            return res.status(400).json({ message: 'El estudiante no corresponde a la carrera seleccionada.' });
        }

        if (data.profesorSupervisor) {
            const career = await Career.findOne({ _id: data.careerId, tenantId });
            if (!career) return res.status(404).json({ message: 'La carrera no existe.' });

            const isTeacherInCareer = career.teachers.some(tId => tId.toString() === data.profesorSupervisor.toString());
            const isTeacherOfCourse = studentCourse.teacherId?.toString() === data.profesorSupervisor.toString();

            if (!isTeacherInCareer && !isTeacherOfCourse) {
                return res.status(400).json({ message: 'El profesor supervisor no corresponde a la carrera ni es profesor del curso del alumno.' });
            }
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

        const estudianteIdToCheck = updates.estudianteId || currentAlt.estudianteId;
        const careerIdToCheck = updates.careerId || currentAlt.careerId;
        const supervisorToCheck = updates.profesorSupervisor !== undefined ? updates.profesorSupervisor : currentAlt.profesorSupervisor;

        if (!careerIdToCheck) {
            return res.status(400).json({ message: 'La Carrera es obligatoria.' });
        }

        const activeEnrollment = await Enrollment.findOne({
            estudianteId: estudianteIdToCheck,
            tenantId,
            status: { $in: ['activo', 'activa', 'confirmada'] }
        }).populate('courseId');

        if (!activeEnrollment || !activeEnrollment.courseId) {
            return res.status(400).json({ message: 'El estudiante seleccionado no tiene una matrícula activa en ningún curso.' });
        }

        const studentCourse = activeEnrollment.courseId;

        if (studentCourse.careerId?.toString() !== careerIdToCheck.toString()) {
            return res.status(400).json({ message: 'El estudiante no corresponde a la carrera seleccionada.' });
        }

        if (supervisorToCheck) {
            const career = await Career.findOne({ _id: careerIdToCheck, tenantId });
            if (!career) return res.status(404).json({ message: 'La carrera no fue encontrada.' });

            const isTeacherInCareer = career.teachers?.some(tId => tId.toString() === supervisorToCheck.toString());
            const isTeacherOfCourse = studentCourse.teacherId?.toString() === supervisorToCheck.toString();

            if (!isTeacherInCareer && !isTeacherOfCourse) {
                return res.status(400).json({ message: 'El profesor supervisor no corresponde a la carrera seleccionada ni es profesor jefe del curso.' });
            }
        }

        const alternancia = await Alternancia.findByIdAndUpdate(
            id,
            updates,
            { new: true }
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
