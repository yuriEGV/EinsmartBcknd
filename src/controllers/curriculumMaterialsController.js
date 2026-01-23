import CurriculumMaterial from '../models/curriculumMaterialModel.js';

export const create = async (req, res) => {
    try {
        const newMaterial = new CurriculumMaterial(req.body);
        await newMaterial.save();
        res.status(201).json(newMaterial);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getAll = async (req, res) => {
    try {
        const materials = await CurriculumMaterial.find();
        res.status(200).json(materials);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const update = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedMaterial = await CurriculumMaterial.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedMaterial) return res.status(404).json({ message: 'Material not found' });
        res.status(200).json(updatedMaterial);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteOne = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedMaterial = await CurriculumMaterial.findByIdAndDelete(id);
        if (!deletedMaterial) return res.status(404).json({ message: 'Material not found' });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getByCourse = async (req, res) => {
    try {
        const materials = await CurriculumMaterial.find({ courseId: req.params.courseId });
        res.status(200).json(materials);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getBySubject = async (req, res) => {
    try {
        const materials = await CurriculumMaterial.find({ subjectId: req.params.subjectId });
        res.status(200).json(materials);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};