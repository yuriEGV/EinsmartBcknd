import Anotacion from '../models/anotacionModel.js';
import mongoose from 'mongoose';
import NotificationService from '../services/notificationService.js';

class AnotacionController {
    // Crear una nueva anotación
    static async createAnotacion(req, res) {
        try {
            const { estudianteId, tipo, titulo, descripcion, fechaOcurrencia, medidas, archivos } = req.body;

            if (!estudianteId || !tipo || !titulo || !descripcion) {
                return res.status(400).json({
                    message: 'Estudiante, tipo, título y descripción son obligatorios'
                });
            }

            if (!['positiva', 'negativa'].includes(tipo)) {
                return res.status(400).json({
                    message: 'El tipo debe ser "positiva" o "negativa"'
                });
            }

            const anotacion = new Anotacion({
                estudianteId,
                tipo,
                titulo,
                descripcion,
                fechaOcurrencia: fechaOcurrencia ? new Date(fechaOcurrencia) : new Date(),
                medidas: medidas || '',
                archivos: archivos || [],
                creadoPor: req.user.userId,
                tenantId: req.user.tenantId
            });

            await anotacion.save();
            await anotacion.populate('estudianteId', 'nombre apellido grado');
            await anotacion.populate('creadoPor', 'name email role');

            // Send notification
            NotificationService.notifyNewAnnotation(
                anotacion.estudianteId._id,
                anotacion.tipo,
                anotacion.titulo,
                anotacion.descripcion,
                anotacion.tenantId
            );

            res.status(201).json({
                message: 'Anotación creada exitosamente',
                anotacion
            });
        } catch (error) {
            console.error('❌ Error al crear anotación (FULL):', error);
            res.status(500).json({
                message: 'Error al crear anotación',
                error: error.message,
                details: error.name === 'ValidationError' ? error.errors : undefined
            });
        }
    }

    // Obtener todas las anotaciones del tenant
    static async getAnotaciones(req, res) {
        try {
            const { tipo, estudianteId } = req.query;
            const query = (req.user.role === 'admin')
                ? {}
                : { tenantId: req.user.tenantId };

            if (tipo) {
                query.tipo = tipo;
            }

            if (estudianteId) {
                query.estudianteId = estudianteId;
            }

            const anotaciones = await Anotacion.find(query)
                .populate('estudianteId', 'nombre apellido grado')
                .populate('creadoPor', 'name email role')
                .sort({ fecha: -1 });

            res.status(200).json(anotaciones);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Obtener anotaciones de un estudiante específico
    static async getAnotacionesByEstudiante(req, res) {
        try {
            const { estudianteId } = req.params;
            const { tipo } = req.query;

            const query = {
                estudianteId,
                tenantId: req.user.tenantId
            };

            if (tipo) {
                query.tipo = tipo;
            }

            const anotaciones = await Anotacion.find(query)
                .populate('estudianteId', 'nombre apellido grado')
                .populate('creadoPor', 'name email role')
                .sort({ fecha: -1 });

            res.status(200).json(anotaciones);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Obtener una anotación específica
    static async getAnotacionById(req, res) {
        try {
            const anotacion = await Anotacion.findOne({
                _id: req.params.id,
                tenantId: req.user.tenantId
            })
                .populate('estudianteId', 'nombre apellido grado')
                .populate('creadoPor', 'name email role');

            if (!anotacion) {
                return res.status(404).json({ message: 'Anotación no encontrada' });
            }

            res.status(200).json(anotacion);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Actualizar anotación
    static async updateAnotacion(req, res) {
        try {
            // No permitir cambiar el creador
            const { creadoPor, ...updateData } = req.body;

            const anotacion = await Anotacion.findOneAndUpdate(
                { _id: req.params.id, tenantId: req.user.tenantId },
                updateData,
                { new: true, runValidators: true }
            )
                .populate('estudianteId', 'nombre apellido grado')
                .populate('creadoPor', 'name email role');

            if (!anotacion) {
                return res.status(404).json({
                    message: 'Anotación no encontrada o no pertenece a tu tenant'
                });
            }

            res.status(200).json(anotacion);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    // Eliminar anotación
    static async deleteAnotacion(req, res) {
        try {
            const anotacion = await Anotacion.findOneAndDelete({
                _id: req.params.id,
                tenantId: req.user.tenantId
            });

            if (!anotacion) {
                return res.status(404).json({
                    message: 'Anotación no encontrada o no pertenece a tu tenant'
                });
            }

            res.status(204).send();
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Obtener estadísticas de anotaciones de un estudiante
    static async getEstadisticasByEstudiante(req, res) {
        try {
            const { estudianteId } = req.params;
            const estadisticas = await Anotacion.aggregate([
                {
                    $match: {
                        estudianteId: new mongoose.Types.ObjectId(estudianteId),
                        tenantId: new mongoose.Types.ObjectId(req.user.tenantId)
                    }
                },
                {
                    $group: {
                        _id: '$tipo',
                        count: { $sum: 1 }
                    }
                }
            ]);

            const resultado = {
                positivas: 0,
                negativas: 0,
                total: 0
            };

            estadisticas.forEach(stat => {
                if (stat._id === 'positiva') {
                    resultado.positivas = stat.count;
                } else if (stat._id === 'negativa') {
                    resultado.negativas = stat.count;
                }
                resultado.total += stat.count;
            });

            res.status(200).json(resultado);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export default AnotacionController;

