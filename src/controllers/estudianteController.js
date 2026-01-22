import Estudiante from '../models/estudianteModel.js';

const createEstudiante = async (req, res) => {
  try {
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

const estudiantes = await Estudiante.find(query);
res.status(200).json(estudiantes);
  } catch (error) {
  res.status(500).json({ message: error.message });
}
};

const getEstudianteById = async (req, res) => {
  try {
    const query = {
      _id: req.params.id,
      tenantId: req.user.tenantId,
    };

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
    const estudiante = await Estudiante.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      req.body,
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
