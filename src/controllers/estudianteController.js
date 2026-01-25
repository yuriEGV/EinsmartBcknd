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

    // 3. Optional: Filter by specific course (for attendance/grades)
    if (req.query.cursoId) {
      const Enrollment = await import('../models/enrollmentModel.js').then(m => m.default);
      const enrollments = await Enrollment.find({
        courseId: req.query.cursoId,
        tenantId: req.user.tenantId,
        status: 'confirmada'
      }).select('estudianteId');

      const enrolledStudentIds = enrollments.map(e => e.estudianteId);
      query._id = { $in: enrolledStudentIds };
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
    const estudiante = await Estudiante.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });

    if (!estudiante)
      return res.status(404).json({ message: 'Estudiante no encontrado' });

    res.status(204).send();
  } catch (error) {
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
