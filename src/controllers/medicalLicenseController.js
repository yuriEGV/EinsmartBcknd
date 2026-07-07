import MedicalLicense from '../models/medicalLicenseModel.js';
import Attendance from '../models/attendanceModel.js';
import User from '../models/userModel.js';
import mongoose from 'mongoose';
import NotificationService from '../services/notificationService.js';

class MedicalLicenseController {
    // Create a new medical license
    static async create(req, res) {
        try {
            const {
                userId,
                userType,
                fechaInicio,
                fechaFin,
                tipo,
                documentoUrl,
                esElectronica,
                fechaEntrega,
                observaciones
            } = req.body;

            // Only specific roles can manage licenses
            const authorizedRoles = ['inspector_general', 'secretary', 'secretaria', 'secretario'];
            if (!authorizedRoles.includes(req.user.role.toLowerCase())) {
                return res.status(403).json({ message: 'No tienes permisos para gestionar licencias médicas.' });
            }

            if (!userId || !fechaInicio || !fechaFin || !userType) {
                return res.status(400).json({ message: 'Campos obligatorios faltantes' });
            }

            const start = new Date(fechaInicio);
            const end = new Date(fechaFin);

            // Calculate days including both start and end dates
            const diffTime = Math.abs(end - start);
            const diasReposo = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

            if (diasReposo <= 0) {
                return res.status(400).json({ message: 'La fecha de fin debe ser posterior a la de inicio' });
            }

            // Staff specific validations
            if (userType === 'Funcionario') {
                const deliveryDate = fechaEntrega ? new Date(fechaEntrega) : new Date();

                // Logic for delivery deadline: 2 business days (private) / 3 business days (public)
                // We'll use a simplified business day check for now
                const businessDaysPassed = MedicalLicenseController.countBusinessDays(start, deliveryDate);

                // Assuming most users are private for now, or check tenant type if added later
                // Let's use 3 as a general safe limit or 2 if we want to be strict
                const limit = 3;
                if (businessDaysPassed > limit) {
                    console.warn(`Licencia entregada fuera de plazo: ${businessDaysPassed} días hábiles.`);
                    // We allow it but could flag it
                }

                // Check 6-month limit in 2 years
                const twoYearsAgo = new Date();
                twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

                const pastLicenses = await MedicalLicense.find({
                    userId,
                    tenantId: req.user.tenantId,
                    fechaInicio: { $gte: twoYearsAgo }
                });

                const totalPastDays = pastLicenses.reduce((acc, curr) => acc + curr.diasReposo, 0);
                if (totalPastDays + diasReposo > 180) {
                    return res.status(200).json({
                        message: 'Advertencia: El funcionario excede o está cerca de exceder los 180 días de licencia en 2 años. Riesgo de vacancia.',
                        data: null,
                        limitWarning: true
                    });
                }
            }

            const license = new MedicalLicense({
                tenantId: req.user.tenantId,
                userId,
                userModel: userType === 'Estudiante' ? 'Estudiante' : 'User',
                userType,
                fechaInicio: start,
                fechaFin: end,
                diasReposo,
                tipo,
                documentoUrl,
                esElectronica,
                fechaEntrega: fechaEntrega || new Date(),
                observaciones,
                academicYear: req.user.academicYear || new Date().getFullYear()
            });

            await license.save();

            // Trigger Notification
            NotificationService.notifyMedicalLicenseStatus(req.user.tenantId, license, 'Pendiente');

            // Auto-justify existing attendance records for students
            if (userType === 'Estudiante') {
                await Attendance.updateMany(
                    {
                        estudianteId: userId,
                        tenantId: req.user.tenantId,
                        fecha: { $gte: start, $lte: end },
                        estado: 'ausente'
                    },
                    { $set: { estado: 'justificado', observacion: `Justificado por Licencia Médica ID: ${license._id}` } }
                );
            }

            res.status(201).json(license);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Helper to count business days (Simplified)
    static countBusinessDays(startDate, endDate) {
        let count = 0;
        let curDate = new Date(startDate.getTime());
        while (curDate <= endDate) {
            const dayOfWeek = curDate.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
            curDate.setDate(curDate.getDate() + 1);
        }
        return count;
    }

    // List licenses with filters
    static async list(req, res) {
        try {
            const authorizedRoles = ['inspector_general', 'secretary', 'secretaria', 'secretario'];
            if (!authorizedRoles.includes(req.user.role.toLowerCase())) {
                return res.status(403).json({ message: 'No tienes permisos para listar licencias médicas.' });
            }

            const { userId, userType, startDate, endDate, fecha } = req.query;
            const currentYear = req.user.academicYear || new Date().getFullYear();
            const query = { 
                tenantId: req.user.tenantId,
                $or: [
                    { academicYear: currentYear },
                    { academicYear: { $exists: false } }
                ]
            };

            if (userId) query.userId = userId;
            if (userType) query.userType = userType;

            // Filter by a specific date (for attendance page indicator)
            if (fecha) {
                const checkDate = new Date(fecha);
                query.fechaInicio = { $lte: checkDate };
                query.fechaFin = { $gte: checkDate };
                query.estado = 'Aprobado';
            } else if (startDate || endDate) {
                query.fechaInicio = {};
                if (startDate) query.fechaInicio.$gte = new Date(startDate);
                if (endDate) query.fechaInicio.$lte = new Date(endDate);
            }

            const licenses = await MedicalLicense.find(query)
                .populate('userId', 'name nombres apellidos role email')
                .sort({ fechaInicio: -1 });

            // [BUG 3 FIX] Asegurar nombre visible en respuesta
            const enrichedLicenses = licenses.map(lic => {
                const doc = lic.toObject();
                // Si es User, el nombre está en .name (poblado por populate)
                // Si es Estudiante, el nombre suele estar en .nombres (o uniendo ambos)
                let name = 'Desconocido';
                if (lic.userId) {
                    if (lic.userType === 'Funcionario') {
                        name = lic.userId.name || 'Funcionario';
                    } else {
                        name = (lic.userId.nombres && lic.userId.apellidos)
                            ? `${lic.userId.nombres} ${lic.userId.apellidos}`
                            : (lic.userId.name || 'Estudiante');
                    }
                }
                return { ...doc, userName: name };
            });

            res.json(enrichedLicenses);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Update license status (approve/reject)
    static async updateStatus(req, res) {
        try {
            const authorizedRoles = ['inspector_general', 'secretary', 'secretaria', 'secretario'];
            if (!authorizedRoles.includes(req.user.role.toLowerCase())) {
                return res.status(403).json({ message: 'No tienes permisos para actualizar esta licencia.' });
            }

            const { estado } = req.body;
            if (!['Aprobado', 'Rechazado', 'Pendiente'].includes(estado)) {
                return res.status(400).json({ message: 'Estado inválido' });
            }

            const license = await MedicalLicense.findOneAndUpdate(
                { _id: req.params.id, tenantId: req.user.tenantId },
                { estado },
                { new: true }
            ).populate('userId', 'name role email');

            if (!license) return res.status(404).json({ message: 'Licencia no encontrada' });

            // If newly approved student license, auto-justify attendance
            if (estado === 'Aprobado' && license.userType === 'Estudiante') {
                await Attendance.updateMany(
                    {
                        estudianteId: license.userId,
                        tenantId: req.user.tenantId,
                        fecha: { $gte: license.fechaInicio, $lte: license.fechaFin },
                        estado: 'ausente'
                    },
                    { $set: { estado: 'justificado', observacion: `Justificado por Licencia Médica ID: ${license._id}` } }
                );
            }

            // Trigger Notification
            NotificationService.notifyMedicalLicenseStatus(req.user.tenantId, license, estado);

            res.json(license);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Get a specific license
    static async getById(req, res) {
        try {
            const authorizedRoles = ['inspector_general', 'secretary', 'secretaria', 'secretario'];
            if (!authorizedRoles.includes(req.user.role.toLowerCase())) {
                return res.status(403).json({ message: 'No tienes permisos para ver esta licencia médica.' });
            }

            const license = await MedicalLicense.findOne({ _id: req.params.id, tenantId: req.user.tenantId })
                .populate('userId', 'name role email');
            if (!license) return res.status(404).json({ message: 'Licencia no encontrada' });
            res.json(license);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Delete a license
    static async delete(req, res) {
        try {
            const authorizedRoles = ['inspector_general', 'secretary', 'secretaria', 'secretario'];
            if (!authorizedRoles.includes(req.user.role.toLowerCase())) {
                return res.status(403).json({ message: 'No tienes permisos para eliminar licencias médicas.' });
            }

            const license = await MedicalLicense.findOneAndDelete({ _id: req.params.id, tenantId: req.user.tenantId });
            if (!license) return res.status(404).json({ message: 'Licencia no encontrada' });
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // [INTEGRATION] Check if a user (Student/Staff) has a license for a given date
    static async checkActiveLicense(tenantId, userId, date) {
        const checkDate = new Date(date);
        return await MedicalLicense.findOne({
            tenantId,
            userId,
            fechaInicio: { $lte: checkDate },
            fechaFin: { $gte: checkDate },
            estado: 'Aprobado'
        });
    }

    // List only approved licenses for the tenant (for calendar)
    static async listApproved(req, res) {
        try {
            const licenses = await MedicalLicense.find({
                tenantId: req.user.tenantId,
                estado: 'Aprobado'
            }).populate('userId', 'name nombres apellidos email');

            // Format specialized for calendar consumption if needed
            const formatted = licenses.map(lic => {
                const user = lic.userId;
                const userName = lic.userType === 'Estudiante' 
                    ? (user.nombres + ' ' + (user.apellidos || ''))
                    : (user.name || 'Funcionario');
                
                return {
                    ...lic.toObject(),
                    userName
                };
            });

            res.json(formatted);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export default MedicalLicenseController;
