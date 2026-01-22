import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
    {
        estudianteId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student',
            required: true
        },
        fecha: {
            type: Date,
            required: true
        },
        estado: {
            type: String,
            enum: ['presente', 'ausente', 'justificado'],
            default: 'presente'
        },
        tenantId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        registradoPor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    { timestamps: true }
);

export default mongoose.model('Attendance', attendanceSchema);
