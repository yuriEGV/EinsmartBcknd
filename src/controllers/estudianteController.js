import Estudiante from '../models/estudianteModel.js';
import connectDB from '../config/db.js';
import mongoose from 'mongoose';

const createEstudiante = async (req, res) => {
  try {
    await connectDB();
    const tenantId = req.user.tenantId;

    const { guardian, ...estudianteData } = req.body;

    const estudiante = await Estudiante.create({
      ...estudianteData,
      tenantId
    });

    if (guardian) {
      const Apoderado = await import('../models/apoderadoModel.js').then(m => m.default);
      await Apoderado.create({
        ...guardian,
        estudianteId: estudiante._id,
        tenantId
      });
    }

    res.status(201).json(estudiante);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getEstudiantes = async (req, res) => {
  try {
    await connectDB();
    console.log('GET ESTUDIANTES - User Role:', req.user.role, 'TenantId:', req.user.tenantId);

    // Base query: Admin sees all, others are filtered by tenant
    const query = {};

    if (req.user.role !== 'admin') {
      // Aggregation does not auto-cast string to ObjectId, so we must do it manually
      query.tenantId = new mongoose.Types.ObjectId(req.user.tenantId);
    }

    // RESTRICTIVE FILTERS: Apply to student/apoderado AND teachers
    const restrictiveRoles = ['student', 'apoderado', 'teacher'];
    const isTeacher = req.user.role === 'teacher';

    if (restrictiveRoles.includes(req.user.role)) {
      if (req.user.role === 'student' && req.user.profileId) {
        query._id = req.user.profileId;
      } else if (req.user.role === 'apoderado' && req.user.profileId) {
        const Apoderado = await import('../models/apoderadoModel.js').then(m => m.default);
        const vinculation = await Apoderado.findById(req.user.profileId);
        if (vinculation) {
          query._id = vinculation.estudianteId;
        } else {
          console.log('GET ESTUDIANTES - Apoderado without vinculation, returning empty');
          return res.status(200).json([]);
        }
      } else if (isTeacher) {
        // Teachers see students from courses they teach OR where they are head teacher
        const Subject = await import('../models/subjectModel.js').then(m => m.default);
        const Enrollment = await import('../models/enrollmentModel.js').then(m => m.default);
        const Course = await import('../models/courseModel.js').then(m => m.default);

        // Find all courses where this teacher has subjects OR is head teacher
        const [teacherSubjects, headCourses] = await Promise.all([
          Subject.find({
            teacherId: new mongoose.Types.ObjectId(req.user.userId),
            tenantId: new mongoose.Types.ObjectId(req.user.tenantId)
          }).select('courseId'),
          Course.find({
            teacherId: new mongoose.Types.ObjectId(req.user.userId),
            tenantId: new mongoose.Types.ObjectId(req.user.tenantId)
          }).select('_id')
        ]);

        const courseIds = [
          ...new Set([
            ...teacherSubjects.map(s => s.courseId.toString()),
            ...headCourses.map(c => c._id.toString())
          ])
        ];

        console.log('GET ESTUDIANTES - Teacher courses:', courseIds);

        if (courseIds.length === 0) {
          console.log('GET ESTUDIANTES - Teacher has no assigned courses, returning empty');
          return res.status(200).json([]);
        }

        const enrollments = await Enrollment.find({
          courseId: { $in: courseIds },
          tenantId: req.user.tenantId,
          status: { $in: ['confirmada', 'activo', 'activa'] }
        }).select('estudianteId');

        const allowedStudentIds = enrollments.map(e => e.estudianteId);
        query._id = { $in: allowedStudentIds };
        console.log(`GET ESTUDIANTES - Teacher filter: found ${allowedStudentIds.length} allowed students across ${courseIds.length} courses`);
      } else if (!req.user.profileId) {
        // Student or guardian without profileId = no access
        console.log('GET ESTUDIANTES - Student/Guardian without profileId, returning empty');
        return res.status(200).json([]);
      }
    }

    // Optional: Filter by specific course (for attendance/grades)
    if (req.query.cursoId) {
      const Enrollment = await import('../models/enrollmentModel.js').then(m => m.default);
      const enrollments = await Enrollment.find({
        courseId: req.query.cursoId,
        tenantId: req.user.tenantId,
        status: { $in: ['confirmada', 'activo', 'activa', 'pre-matricula'] }
      }).select('estudianteId');

      const enrolledStudentIds = enrollments.map(e => e.estudianteId);
      console.log('GET ESTUDIANTES - Course filter:', req.query.cursoId, 'Found:', enrolledStudentIds.length, 'enrolled');

      if (query._id && query._id.$in) {
        // Teacher case: query._id is already { $in: [allowedIds] }
        const allowedIdsStrings = query._id.$in.map(id => id.toString());
        const filteredIds = enrolledStudentIds
          .filter(id => allowedIdsStrings.includes(id.toString()))
          .map(id => new mongoose.Types.ObjectId(id));

        query._id = { $in: filteredIds };
        console.log(`GET ESTUDIANTES - Teacher + Course filter: intersection found ${filteredIds.length} students`);
      } else if (query._id) {
        // Single student case (student/apoderado)
        if (!enrolledStudentIds.some(id => id.toString() === query._id.toString())) {
          console.log('GET ESTUDIANTES - Student not enrolled in course, returning empty');
          return res.status(200).json([]);
        }
      } else {
        query._id = { $in: enrolledStudentIds.map(id => new mongoose.Types.ObjectId(id)) };
      }
    }

    console.log('GET ESTUDIANTES - Final Query:', JSON.stringify(query));

    const pipeline = [
      { $match: query },
      { $sort: { apellidos: 1, nombres: 1 } },
      {
        $lookup: {
          from: 'apoderados',
          localField: '_id',
          foreignField: 'estudianteId',
          as: 'guardian'
        }
      },
      {
        $addFields: {
          guardian: { $arrayElemAt: ['$guardian', 0] }
        }
      }
    ];

    const estudiantes = await Estudiante.aggregate(pipeline);
    console.log('GET ESTUDIANTES - Results:', estudiantes.length, 'students found');
    res.status(200).json(estudiantes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getEstudianteById = async (req, res) => {
  try {
    await connectDB();
    const query = {
      _id: req.params.id,
      tenantId: req.user.tenantId,
    };
    // ... logic remains same

    // Role-based restriction
    if (req.user.role === 'student' && req.user.profileId !== req.params.id) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    if (req.user.role === 'apoderado' && req.user.profileId) {
      const Apoderado = await import('../models/apoderadoModel.js').then(m => m.default);
      const vinculation = await Apoderado.findById(req.user.profileId);
      if (!vinculation || vinculation.estudianteId.toString() !== req.params.id) {
        return res.status(403).json({ message: 'Acceso denegado' });
      }
    } else if ((req.user.role === 'student' || req.user.role === 'apoderado') && !req.user.profileId) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const estudiante = await Estudiante.findOne(query);

    if (!estudiante)
      return res.status(404).json({ message: 'Estudiante no encontrado' });

    res.status(200).json(estudiante);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateEstudiante = async (req, res) => {
  try {
    await connectDB();
    console.log('UPDATE ESTUDIANTE - Params ID:', req.params.id);
    console.log('UPDATE ESTUDIANTE - Request Body:', JSON.stringify(req.body));
    console.log('UPDATE ESTUDIANTE - User TenantId:', req.user.tenantId);

    const { _id, guardian, tenantId, ...updateData } = req.body;

    // 1. Update Student
    const estudiante = await Estudiante.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!estudiante) {
      console.log('UPDATE ESTUDIANTE - Not found or wrong tenant');
      return res.status(404).json({ message: 'Estudiante no encontrado' });
    }

    // 2. Update Guardian (Fusion logic)
    if (guardian) {
      const Apoderado = await import('../models/apoderadoModel.js').then(m => m.default);
      await Apoderado.findOneAndUpdate(
        { estudianteId: estudiante._id, tenantId: req.user.tenantId },
        guardian,
        { new: true, runValidators: true, upsert: true } // Upsert in case it doesn't exist for some reason
      );
    }

    console.log('UPDATE ESTUDIANTE - Success:', estudiante._id);
    res.status(200).json(estudiante);
  } catch (error) {
    console.error('UPDATE ESTUDIANTE - Error:', error.message);
    res.status(400).json({ message: error.message });
  }
};

const deleteEstudiante = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const estudiante = await Estudiante.findOne({ _id: id, tenantId });

    if (!estudiante) {
      return res.status(404).json({ message: 'Estudiante no encontrado' });
    }

    // 1. Delete Enrollments
    const Enrollment = await import('../models/enrollmentModel.js').then(m => m.default);
    await Enrollment.deleteMany({ estudianteId: id, tenantId });

    // 2. Delete Payments
    const Payment = await import('../models/paymentModel.js').then(m => m.default);
    await Payment.deleteMany({ estudianteId: id, tenantId });

    // 3. Delete Grades
    const Grade = await import('../models/gradeModel.js').then(m => m.default);
    await Grade.deleteMany({ estudianteId: id, tenantId });

    // 4. Delete Attendance Records
    const Attendance = await import('../models/attendanceModel.js').then(m => m.default);
    await Attendance.deleteMany({ estudianteId: id, tenantId });

    // 5. Delete Annotations
    const Anotacion = await import('../models/anotacionModel.js').then(m => m.default);
    await Anotacion.deleteMany({ estudianteId: id, tenantId });

    // 6. Delete Payment Promises
    const PaymentPromise = await import('../models/paymentPromiseModel.js').then(m => m.default);
    await PaymentPromise.deleteMany({ studentId: id, tenantId });

    // 7. Unlink or Delete Apoderado
    const Apoderado = await import('../models/apoderadoModel.js').then(m => m.default);
    // Find apoderados linked to this student
    const apoderadosCoords = await Apoderado.find({ estudianteId: id, tenantId });

    for (const apo of apoderadosCoords) {
      // Check if this apoderado has other students. 
      // Since our schema currently links 1:1 via estudianteId (based on previous simplistic model), 
      // we effectively delete the relationship record. 
      // If "Apoderado" is a unique person entity linked to multiple students via array, we would pull.
      // But looking at the schema: estudianteId is a single Ref. So one Apoderado record = one link.
      await Apoderado.findByIdAndDelete(apo._id);

      // Also delete User account if it exists and is only for this profileId? 
      // Maybe too aggressive. Let's keep the User for now, or just leave it. 
      // Ideally we check if User.profileId matches.
    }

    // Finally delete student
    await Estudiante.findByIdAndDelete(id);

    res.status(200).json({ message: 'Estudiante y datos relacionados eliminados correctamente' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ message: error.message });
  }
};

export default {
  createEstudiante,
  getEstudiantes,
  getEstudianteById,
  updateEstudiante,
  deleteEstudiante,
};
