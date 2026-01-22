import Apoderado from '../models/apoderadoModel.js';

class ApoderadoController {
    // Crear un nuevo apoderado
    static async createApoderado(req, res) {
        try {
            const { estudianteId, nombre, apellidos, direccion, telefono, correo, tipo, parentesco } = req.body;

            if (!estudianteId || !nombre || !apellidos) {
                return res.status(400).json({
                    message: 'Estudiante, nombre y apellidos son obligatorios'
                });
            }

            const apoderado = new Apoderado({
                estudianteId,
                nombre,
                apellidos,
                direccion: direccion || '',
                telefono: telefono || '',
                correo: correo || '',
                tipo: tipo || 'principal',
                parentesco: parentesco || '',
                tenantId: req.user.tenantId
            });

            await apoderado.save();
            await apoderado.populate('estudianteId', 'nombre apellido grado');

            res.status(201).json({
                message: 'Apoderado creado exitosamente',
                apoderado
            });
        } catch (error) {
            console.error('❌ Error al crear apoderado:', error);
            if (error.code === 11000) {
                return res.status(400).json({
                    message: 'Ya existe un apoderado principal para este estudiante'
                });
            }
            res.status(500).json({ message: 'Error al crear apoderado', error: error.message });
        }
    }

    // Obtener todos los apoderados del tenant
    static async getApoderados(req, res) {
        try {
            const query = (req.user.role === 'admin')
                ? {}
                : { tenantId: req.user.tenantId };

            const apoderados = await Apoderado.find(query)
                .populate('estudianteId', 'nombre apellido grado')
                .sort({ createdAt: -1 });

            res.status(200).json(apoderados);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Obtener apoderados de un estudiante específico
    static async getApoderadosByEstudiante(req, res) {
        try {
            const { estudianteId } = req.params;
            const apoderados = await Apoderado.find({
                estudianteId,
                tenantId: req.user.tenantId
            }).populate('estudianteId', 'nombre apellido grado');

            res.status(200).json(apoderados);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Obtener un apoderado específico
    static async getApoderadoById(req, res) {
        try {
            const apoderado = await Apoderado.findOne({
                _id: req.params.id,
                tenantId: req.user.tenantId
            }).populate('estudianteId', 'nombre apellido grado');

            if (!apoderado) {
                return res.status(404).json({ message: 'Apoderado no encontrado' });
            }

            res.status(200).json(apoderado);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Actualizar apoderado
    static async updateApoderado(req, res) {
        try {
            const apoderado = await Apoderado.findOneAndUpdate(
                { _id: req.params.id, tenantId: req.user.tenantId },
                req.body,
                { new: true, runValidators: true }
            ).populate('estudianteId', 'nombre apellido grado');

            if (!apoderado) {
                return res.status(404).json({
                    message: 'Apoderado no encontrado o no pertenece a tu tenant'
                });
            }

            res.status(200).json(apoderado);
        } catch (error) {
            if (error.code === 11000) {
                return res.status(400).json({
                    message: 'Ya existe un apoderado principal para este estudiante'
                });
            }
            res.status(400).json({ message: error.message });
        }
    }

    // Eliminar apoderado
    static async deleteApoderado(req, res) {
        try {
            const apoderado = await Apoderado.findOneAndDelete({
                _id: req.params.id,
                tenantId: req.user.tenantId
            });

            if (!apoderado) {
                return res.status(404).json({
                    message: 'Apoderado no encontrado o no pertenece a tu tenant'
                });
            }

            res.status(204).send();
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export default ApoderadoController;

