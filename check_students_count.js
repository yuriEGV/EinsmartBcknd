import mongoose from 'mongoose';
import connectDB from './src/config/db.js';
import Enrollment from './src/models/enrollmentModel.js';

await connectDB();
const courseId = '69b00decd9a865783bebca5b';
const count = await Enrollment.countDocuments({
  courseId,
  status: { $in: ['confirmada', 'activo', 'activa', 'pre-matricula', 'inscrito'] }
});
console.log('Total enrollments for course:', count);

const enrollments = await Enrollment.find({
  courseId,
  status: { $in: ['confirmada', 'activo', 'activa', 'pre-matricula', 'inscrito'] }
});

for (let e of enrollments.slice(0, 2)) {
    const studentEnrollments = await Enrollment.find({ estudianteId: e.estudianteId }).sort({createdAt: -1});
    console.log(`Student ${e.estudianteId} has ${studentEnrollments.length} enrollments. First courseId: ${studentEnrollments[0].courseId}, this courseId: ${e.courseId}`);
}
process.exit(0);
