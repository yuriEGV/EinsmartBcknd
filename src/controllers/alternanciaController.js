import Alternancia from '../models/alternanciaModel.js';
import Enrollment from '../models/enrollmentModel.js';
import Career from '../models/careerModel.js';
import Empresa from '../models/empresaModel.js';

export const getAlternancias = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const alternancias = await Alternancia.find({ tenantId })
            .populate('estudianteId', 'firstName lastName rut')
            .populate('empresa', 'razonSocial rut emailContacto')
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
            .populate('empresa', 'razonSocial rut tutor emailContacto')
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
