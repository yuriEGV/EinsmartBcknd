import CurriculumMaterial from '../models/curriculumMaterialModel.js';
import { saveStreamToFile } from '../services/storageService.js';
import { Readable } from 'stream';

export const create = async (req, res) => {
    try {
        const materialData = { ...req.body };

        // Parse objectives if it's stringified JSON
        if (typeof materialData.objectives === 'string') {
            try {
                materialData.objectives = JSON.parse(materialData.objectives);
            } catch (e) {
                materialData.objectives = [materialData.objectives];
            }
        }

        // Handle file upload
        if (req.file) {
            const stream = Readable.from(req.file.buffer);
            const { url } = await saveStreamToFile(stream, `${Date.now()}-${req.file.originalname}`);
            materialData.fileUrl = url;
            materialData.fileName = req.file.originalname;
        }

        const newMaterial = new CurriculumMaterial({
            ...materialData,
            uploadedBy: req.user.id,
            tenantId: req.user.tenantId
        });

        await newMaterial.save();
        res.status(201).json(newMaterial);
    } catch (error) {
        console.error('Create Curriculum Error:', error);
        res.status(400).json({ message: error.message });
    }
};

export const getAll = async (req, res) => {
    try {
        const materials = await CurriculumMaterial.find({ tenantId: req.user.tenantId })
            .populate('courseId', 'name')
            .populate('subjectId', 'name')
            .sort({ createdAt: -1 });
        res.status(200).json(materials);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const update = async (req, res) => {
    try {
        const { id } = req.params;
        const materialData = { ...req.body };

        if (typeof materialData.objectives === 'string') {
            try {
                materialData.objectives = JSON.parse(materialData.objectives);
            } catch (e) {
                materialData.objectives = [materialData.objectives];
            }
        }

        if (req.file) {
            const stream = Readable.from(req.file.buffer);
            const { url } = await saveStreamToFile(stream, `${Date.now()}-${req.file.originalname}`);
            materialData.fileUrl = url;
            materialData.fileName = req.file.originalname;
        }

        const updatedMaterial = await CurriculumMaterial.findOneAndUpdate(
            { _id: id, tenantId: req.user.tenantId },
            materialData,
            { new: true }
        );

        if (!updatedMaterial) return res.status(404).json({ message: 'Material not found' });
        res.status(200).json(updatedMaterial);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteOne = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedMaterial = await CurriculumMaterial.findOneAndDelete({ _id: id, tenantId: req.user.tenantId });
        if (!deletedMaterial) return res.status(404).json({ message: 'Material not found' });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getByCourse = async (req, res) => {
    try {
        const materials = await CurriculumMaterial.find({
            courseId: req.params.courseId,
            tenantId: req.user.tenantId
        }).populate('subjectId', 'name').sort({ createdAt: -1 });
        res.status(200).json(materials);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getBySubject = async (req, res) => {
    try {
        const materials = await CurriculumMaterial.find({
            subjectId: req.params.subjectId,
            tenantId: req.user.tenantId
        }).sort({ createdAt: -1 });
        res.status(200).json(materials);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};