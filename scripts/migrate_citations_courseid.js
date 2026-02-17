import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Citacion from '../src/models/citacionModel.js';
import Enrollment from '../src/models/enrollmentModel.js';

dotenv.config();

const migrate = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const citations = await Citacion.find({ courseId: { $exists: false } });
        console.log(`Found ${citations.length} citations to migrate.`);

        for (const cit of citations) {
            const enrollment = await Enrollment.findOne({
                estudianteId: cit.estudianteId,
                tenantId: cit.tenantId,
                status: { $in: ['confirmada', 'activo', 'activa'] }
            });

            if (enrollment) {
                cit.courseId = enrollment.courseId;
                await cit.save();
                console.log(`Migrated citation ${cit._id} with courseId ${enrollment.courseId}`);
            } else {
                console.warn(`No active enrollment found for student ${cit.estudianteId} in citation ${cit._id}`);
            }
        }

        console.log('Migration complete.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.disconnect();
    }
};

migrate();
