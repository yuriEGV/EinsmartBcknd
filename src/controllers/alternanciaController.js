import Alternancia from '../models/alternanciaModel.js';

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

        const alternancia = await Alternancia.findOneAndUpdate(
            { _id: id, tenantId },
            updates,
            { new: true }
        );

        if (!alternancia) {
            return res.status(404).json({ message: 'Alternancia no encontrada' });
        }
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
