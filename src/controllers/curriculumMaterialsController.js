const CurriculumMaterial = require('../models/curriculumMaterialModel');

exports.create = async (req, res) => {
    try {
        const newMaterial = new CurriculumMaterial(req.body);
        await newMaterial.save();
        res.status(201).json(newMaterial);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Get all curriculum materials
exports.getAll = async (req, res) => {
    try {
        const materials = await CurriculumMaterial.find();
        res.status(200).json(materials);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update a curriculum material
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedMaterial = await CurriculumMaterial.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedMaterial) return res.status(404).json({ message: 'Material not found' });
        res.status(200).json(updatedMaterial);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete a curriculum material
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedMaterial = await CurriculumMaterial.findByIdAndDelete(id);
        if (!deletedMaterial) return res.status(404).json({ message: 'Material not found' });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};}
};

// Update a curriculum material by ID
exports.update = async (req, res) => {
    try {
        const updatedMaterial = await CurriculumMaterial.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedMaterial) return res.status(404).json({ message: 'Material not found' });
        res.status(200).json(updatedMaterial);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete a curriculum material by ID
exports.delete = async (req, res) => {
    try {
        const deletedMaterial = await CurriculumMaterial.findByIdAndDelete(req.params.id);
        if (!deletedMaterial) return res.status(404).json({ message: 'Material not found' });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get curriculum materials by course ID
exports.getByCourse = async (req, res) => {
    try {
        const materials = await CurriculumMaterial.find({ courseId: req.params.courseId });
        res.status(200).json(materials);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get curriculum materials by subject ID
exports.getBySubject = async (req, res) => {
    try {
        const materials = await CurriculumMaterial.find({ subjectId: req.params.subjectId });
        res.status(200).json(materials);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
    // Logic to create a curriculum material
};

exports.getAll = async (req, res) => {
    // Logic to get all curriculum materials
};

exports.update = async (req, res) => {
    // Logic to update a curriculum material by ID
};

exports.delete = async (req, res) => {
    // Logic to delete a curriculum material by ID
};

exports.getByCourse = async (req, res) => {
    // Logic to get curriculum materials by course ID
};

exports.getBySubject = async (req, res) => {
    // Logic to get curriculum materials by subject ID
};