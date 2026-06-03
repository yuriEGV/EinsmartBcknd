import { Guardian as Apoderado } from '../models/pgModels.js';
import { validarRUT, formatearRUT } from '../utils/rutValidator.js';

class ApoderadoController {
    // Crear un nuevo apoderado
    static async createApoderado(req, res) {
        try {
            const { student_id, nombre, apellidos, direccion, telefono, correo, tipo, parentesco, rut } = req.body;

            if (!estudianteId || !nombre || !apellidos) {
                return res.status(400).json({
                    message: 'Estudiante, nombre y apellidos son obligatorios'
                });
            }

            let finalRut = rut;
            if (finalRut) {
                if (!validarRUT(finalRut)) {
                    return res.status(400).json({ message: 'El RUT del apoderado no es válido.' });
                }
                finalRut = formatearRUT(finalRut);
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
                rut: finalRut,
                tenant_id: req.user.tenantId
            });

            await apoderado.save();
            await apoderado;

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
                : { tenant_id: req.user.tenantId };

            const apoderados = await Apoderado.find(query)
                
                .sort({ createdAt: -1 });

            res.status(200).json(apoderados);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Obtener apoderados de un estudiante específico
    static async getApoderadosByEstudiante(req, res) {
        try {
            const { student_id } = req.params;
            const apoderados = await Apoderado.find({
                estudianteId,
                tenant_id: req.user.tenantId
            });

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
                tenant_id: req.user.tenantId
            });

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
            const updateData = req.body;
            if (updateData.rut) {
                if (!validarRUT(updateData.rut)) {
                    return res.status(400).json({ message: 'El RUT del apoderado no es válido.' });
                }
                updateData.rut = formatearRUT(updateData.rut);
            }

            const apoderado = await Apoderado.findOneAndUpdate(
                { _id: req.params.id, tenant_id: req.user.tenantId },
                updateData,
                { new: true, runValidators: true }
            );

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
                tenant_id: req.user.tenantId
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

