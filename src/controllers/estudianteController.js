import Estudiante from '../models/estudianteModel.js';
import connectDB from '../config/db.js';

const createEstudiante = async (req, res) => {
  try {
    await connectDB();
    const tenantId = req.user.tenantId;

    const estudiante = await Estudiante.create({
      ...req.body,
      tenantId
    });

    res.status(201).json(estudiante);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getEstudiantes = async (req, res) => {
  try {
    await connectDB();
    const query = (req.user.role === 'admin')
      ? {}
      : { tenantId: req.user.tenantId };

    // [NUEVO] Restricción por Perfil (Seguridad e Incongruencia)
    if (req.user.role === 'student' && req.user.profileId) {
      query._id = req.user.profileId;
    } else if (req.user.role === 'apoderado' && req.user.profileId) {
      const Apoderado = await import('../models/apoderadoModel.js').then(m => m.default);
      const vinculation = await Apoderado.findById(req.user.profileId);
      if (vinculation) {
        // Un apoderado puede tener múltiples alumnos vinculados en el futuro, 
        // pero por ahora usamos el estudianteId principal.
        query._id = vinculation.estudianteId;
      } else {
        return res.status(200).json([]);
      }
    } else if ((req.user.role === 'student' || req.user.role === 'apoderado') && !req.user.profileId) {
      return res.status(200).json([]);
    }

    // 3. Optional: Filter by specific course (for attendance/grades)
    if (req.query.cursoId) {
      const Enrollment = await import('../models/enrollmentModel.js').then(m => m.default);
      const enrollments = await Enrollment.find({
        courseId: req.query.cursoId,
        tenantId: req.user.tenantId,
        status: 'confirmada'
      }).select('estudianteId');

      const enrolledStudentIds = enrollments.map(e => e.estudianteId);

      if (query._id) {
        // Intersection if both filters exist
        // (Simplified for single ID vs array)
        if (Array.isArray(enrolledStudentIds) && !enrolledStudentIds.map(id => id.toString()).includes(query._id.toString())) {
          return res.status(200).json([]);
        }
      } else {
        query._id = { $in: enrolledStudentIds };
      }
    }

    const pipeline = [
      { $match: query },
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
    const { _id, guardian, tenantId, ...updateData } = req.body;

    const estudiante = await Estudiante.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      updateData,
      { new: true }
    );

    if (!estudiante)
      return res.status(404).json({ message: 'Estudiante no encontrado' });

    res.status(200).json(estudiante);
  } catch (error) {
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
    await Grade.deleteMany({ studentId: id, tenantId });

    // 4. Delete Attendance Records
    const Attendance = await import('../models/attendanceModel.js').then(m => m.default);
    await Attendance.deleteMany({ studentId: id, tenantId });

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
