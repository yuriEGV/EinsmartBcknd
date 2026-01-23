import mongoose from 'mongoose';

const curriculumMaterialSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('CurriculumMaterial', curriculumMaterialSchema);