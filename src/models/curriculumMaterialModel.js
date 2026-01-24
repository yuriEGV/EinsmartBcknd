import mongoose from 'mongoose';

const curriculumMaterialSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    content: { type: String },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    objectives: { type: [String], default: [] },
    fileUrl: { type: String },
    fileName: { type: String },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('CurriculumMaterial', curriculumMaterialSchema);