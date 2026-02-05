import Enrollment from '../models/enrollmentModel.js';
import { saveStreamToFile } from '../services/storageService.js';
import { Readable } from 'stream';
import bcrypt from 'bcryptjs';
import User from '../models/userModel.js';

class EnrollmentController {
    // Create a new enrollment
    static async createEnrollment(req, res) {
        try {
            const {
                studentId,
                courseId,
                period,
                apoderadoId,
                status,
                fee,
                notes,
                metodoPago,    // [NUEVO] Método de pago inicial
                tariffIds,     // [NUEVO] Array de IDs de tarifas a asignar
                newStudent,   // { nombres, apellidos, rut, email, grado, edad }
                newGuardian   // { nombre, apellidos, correo, telefono, direccion, parentesco }
            } = req.body;

            const tenantId = req.user.tenantId;
            let finalStudentId = studentId;
            let finalGuardianId = apoderadoId;

            // [VALIDATION] Ensure studentId is a valid ObjectId if provided
            const mongoose = await import('mongoose').then(m => m.default);
            if (finalStudentId && !mongoose.Types.ObjectId.isValid(finalStudentId)) {
                return res.status(400).json({ message: 'ID de estudiante inválido.' });
            }
            if (finalGuardianId && !mongoose.Types.ObjectId.isValid(finalGuardianId)) {
                return res.status(400).json({ message: 'ID de apoderado inválido.' });
            }
            if (courseId && !mongoose.Types.ObjectId.isValid(courseId)) {
                return res.status(400).json({ message: 'ID de curso inválido.' });
            }

            // 1. Logic for New Student Creation (Improved & Tenant Isolated)
            if (!finalStudentId && newStudent && newStudent.nombres) {
                const Estudiante = await import('../models/estudianteModel.js').then(m => m.default);

                // Check if student already exists IN THIS TENANT to avoid cross-tenant conflicts
                const existingStudent = await Estudiante.findOne({
                    tenantId, // Isolation check
                    $or: [
                        { rut: newStudent.rut },
                        { email: newStudent.email }
                    ].filter(c => Object.values(c)[0])
                });

                if (existingStudent) {
                    console.log(`Student already exists (ID: ${existingStudent._id}). Updating data and using existing student.`);
                    finalStudentId = existingStudent._id;
                    // Sync data
                    if (newStudent.nombres) existingStudent.nombres = newStudent.nombres;
                    if (newStudent.apellidos) existingStudent.apellidos = newStudent.apellidos;
                    if (newStudent.grado) existingStudent.grado = newStudent.grado;
                    if (newStudent.email) existingStudent.email = newStudent.email.toLowerCase().trim();
                    if (newStudent.edad) existingStudent.edad = newStudent.edad;
                    if (newStudent.direccion) existingStudent.direccion = newStudent.direccion;
                    await existingStudent.save();
                } else {
                    const std = new Estudiante({
                        ...newStudent,
                        direccion: newStudent.direccion,
                        tenantId
                    });
                    await std.save();
                    finalStudentId = std._id;
                }

                // [NUEVO] Crear Usuario para el Alumno si no existe
                if (newStudent && newStudent.email) {
                    let studentUser = await User.findOne({ email: newStudent.email.toLowerCase().trim() });
                    if (!studentUser) {
                        const passwordHash = await bcrypt.hash('123456', 10);
                        studentUser = await User.create({
                            tenantId,
                            name: `${newStudent.nombres} ${newStudent.apellidos}`,
                            email: newStudent.email.toLowerCase().trim(),
                            rut: newStudent.rut,
                            passwordHash,
                            role: 'student',
                            profileId: finalStudentId
                        });
                        console.log(`User account created for student: ${newStudent.email}`);
                    }
                }
            }

            // 2. Logic for New Guardian Creation (Upsert if student already has one)
            if (newGuardian && newGuardian.nombre) {
                const Apoderado = await import('../models/apoderadoModel.js').then(m => m.default);

                // [FIX] Avoid findOneAndUpdate upsert due to potential index mismatch (E11000)
                let apo = await Apoderado.findOne({ estudianteId: finalStudentId, tipo: 'principal' });

                if (apo) {
                    // Update existing
                    apo.nombre = newGuardian.nombre;
                    apo.apellidos = newGuardian.apellidos;
                    apo.correo = newGuardian.correo || apo.correo;
                    apo.telefono = newGuardian.telefono || apo.telefono;
                    apo.direccion = newGuardian.direccion || apo.direccion;
                    apo.parentesco = newGuardian.parentesco || apo.parentesco;
                    await apo.save();
                } else {
                    // Create new
                    apo = new Apoderado({
                        ...newGuardian,
                        estudianteId: finalStudentId,
                        tenantId,
                        tipo: 'principal'
                    });
                    await apo.save();
                }

                finalGuardianId = apo._id;

                // [NUEVO] Crear Usuario para el Apoderamiento si no existe
                if (apo.correo || apo.rut) {
                    const normalizedEmail = apo.correo ? apo.correo.toLowerCase().trim() : undefined;
                    const query = normalizedEmail ? { email: normalizedEmail } : { rut: apo.rut };

                    let userAccount = await User.findOne(query);
                    if (!userAccount) {
                        const passwordHash = await bcrypt.hash('123456', 10);
                        userAccount = await User.create({
                            tenantId,
                            name: `${apo.nombre} ${apo.apellidos}`,
                            email: normalizedEmail,
                            rut: apo.rut,
                            passwordHash,
                            role: 'apoderado',
                            profileId: apo._id
                        });
                        console.log(`User account created for guardian: ${normalizedEmail || apo.rut}`);
                    } else if (!userAccount.profileId) {
                        // Link existing user if not linked
                        userAccount.profileId = apo._id;
                        await userAccount.save();
                    }
                }
            } else if (finalGuardianId && finalStudentId) {
                // [NUEVO] Si se seleccionó un apoderado existente, asegurémonos de que el Estudiante 
                // tenga este apoderado vinculado si aún no tiene uno principal.
                const Apoderado = await import('../models/apoderadoModel.js').then(m => m.default);
                const apo = await Apoderado.findById(finalGuardianId);
                if (apo && !apo.estudianteId) {
                    apo.estudianteId = finalStudentId;
                    await apo.save();
                }
            }

            if (!finalStudentId || !courseId || !period) {
                return res.status(400).json({
                    message: 'Debe seleccionar o crear un estudiante, asignar un curso y definir el periodo.'
                });
            }

            // [NUEVO] Verificar morosidad con bloqueo y promesa de pago
            const Payment = await import('../models/paymentModel.js').then(m => m.default);
            // Find all overdue payments for this student
            const overduePaymentsList = await Payment.find({
                estudianteId: finalStudentId,
                estado: 'vencido'
            });

            const overdueCount = overduePaymentsList.length;

            if (overdueCount > 0) {
                // Calculate total debt and check if any is older than 3 months
                let totalDebt = 0;
                let hasOldDebt = false;
                const threeMonthsAgo = new Date();
                threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

                overduePaymentsList.forEach(p => {
                    totalDebt += p.amount;
                    if (p.fechaVencimiento && new Date(p.fechaVencimiento) <= threeMonthsAgo) {
                        hasOldDebt = true;
                    }
                });

                // Check for Payment Promise
                const { paymentPromise } = req.body; // Expecting object: { amount, promiseDate, notes }
                let promiseAccepted = false;

                if (paymentPromise && req.user.role === 'sostenedor') {
                    // Create Promise Record
                    const PaymentPromise = await import('../models/paymentPromiseModel.js').then(m => m.default);
                    const promise = new PaymentPromise({
                        tenantId,
                        studentId: finalStudentId,
                        apoderadoId: finalGuardianId,
                        amount: paymentPromise.amount,
                        promiseDate: paymentPromise.promiseDate,
                        status: 'active',
                        createdBy: req.user.userId,
                        notes: paymentPromise.notes
                    });

                    // We save the promise after successful enrollment creation (or here if we transact)
                    // For now, save it here to validate it works
                    await promise.save();

                    // Allow proceeding
                    promiseAccepted = true;

                    // Attach promise ID to request to link later if needed, or just log
                    console.log(`✅ Payment promise accepted for student ${finalStudentId} by Sostenedor ${req.user.userId}`);
                }

                if (!promiseAccepted) {
                    // Trigger notification if debt is old (> 3 months)
                    if (hasOldDebt) {
                        const NotificationService = await import('../services/notificationService.js').then(m => m.default);
                        const Estudiante = await import('../models/estudianteModel.js').then(m => m.default);
                        const studentDetails = await Estudiante.findById(finalStudentId);

                        // Run in background to not block response
                        NotificationService.notifyDebtor(
                            finalGuardianId,
                            `${studentDetails.nombres} ${studentDetails.apellidos}`,
                            totalDebt,
                            `Posee ${overdueCount} mensualidades vencidas, algunas con más de 3 meses de antigüedad.`
                        ).catch(err => console.error('Background notification error:', err));
                    }

                    return res.status(403).json({
                        message: `El estudiante tiene ${overdueCount} pagos vencidos. Bloqueo de matrícula activo.`,
                        code: 'DEBT_BLOCK',
                        details: {
                            overdueCount,
                            totalDebt,
                            hasOldDebt
                        }
                    });
                }
            }

            // [NUEVO] Fetch Tenant Defaults
            const Tenant = await import('../models/tenantModel.js').then(m => m.default);
            const tenantConfig = await Tenant.findById(tenantId);

            const finalFee = (tenantConfig?.paymentType === 'free') ? 0 : (fee !== undefined ? fee : (tenantConfig?.annualFee || 0));
            const finalPeriod = period || tenantConfig?.academicYear || new Date().getFullYear().toString();

            const currentYear = new Date().getFullYear();
            const enrollmentYear = parseInt(period);

            let initialStatus = 'confirmada';
            if (enrollmentYear > currentYear) {
                initialStatus = 'pre-matricula';
            }

            const enrollment = new Enrollment({
                tenantId,
                estudianteId: finalStudentId,
                courseId,
                period: finalPeriod,
                apoderadoId: finalGuardianId,
                status: initialStatus,
                fee: finalFee,
                notes
            });

            // Documentos (si vienen)
            if (req.files && req.files.length) {
                for (const file of req.files) {
                    const bufferStream = new Readable();
                    bufferStream.push(file.buffer);
                    bufferStream.push(null);

                    const filename = `enrollment-${Date.now()}-${file.originalname}`;
                    const { url } = await saveStreamToFile(bufferStream, filename);

                    enrollment.documents.push({
                        filename: file.originalname,
                        url,
                        mimeType: file.mimetype,
                        size: file.size
                    });
                }
            }

            await enrollment.save();

            // [NUEVO] Generar cobros automáticos si se enviaron tariffIds
            if (tariffIds && Array.isArray(tariffIds) && tariffIds.length > 0) {
                const Tariff = await import('../models/tariffModel.js').then(m => m.default);
                const Payment = await import('../models/paymentModel.js').then(m => m.default);

                const selectedTariffs = await Tariff.find({ _id: { $in: tariffIds }, tenantId });

                if (selectedTariffs.length > 0) {
                    const paymentsToCreate = selectedTariffs.map(t => ({
                        tenantId,
                        estudianteId: finalStudentId,
                        apoderadoId: finalGuardianId, // ✅ Corregido: Vincular apoderado al cobro
                        tariffId: t._id,
                        amount: t.amount,
                        currency: t.currency || 'CLP',
                        status: 'pending',
                        metodoPago: metodoPago || 'transferencia', // ✅ Asignar método de pago
                        concepto: t.name,
                        fechaVencimiento: new Date() // O una fecha por defecto
                    }));
                    await Payment.insertMany(paymentsToCreate);

                    // [NUEVO] Sincronizar estado financiero del apoderado
                    const ApoderadoModel = await import('../models/apoderadoModel.js').then(m => m.default);
                    await ApoderadoModel.syncFinancialStatus(finalGuardianId);
                }
            }

            await enrollment.populate('estudianteId', 'nombres apellidos');
            await enrollment.populate('courseId', 'name code');
            await enrollment.populate('apoderadoId', 'nombre apellidos');

            res.status(201).json(enrollment);

        } catch (error) {
            console.error('Enrollment Error:', error);
            res.status(400).json({
                message: error.name === 'ValidationError' ? 'Error de validación en los datos.' : error.message,
                details: error.errors
            });
        }
    }


    // Get all enrollments (Filtered by User)
    static async getEnrollments(req, res) {
        try {
            const query = (req.user.role === 'admin')
                ? {}
                : { tenantId: req.user.tenantId };

            // Restricción para estudiantes y apoderados
            if (req.user.role === 'student' && req.user.profileId) {
                query.estudianteId = req.user.profileId;
            } else if (req.user.role === 'apoderado' && req.user.profileId) {
                const Apoderado = await import('../models/apoderadoModel.js').then(m => m.default);
                const vinculation = await Apoderado.findById(req.user.profileId);
                if (vinculation) {
                    query.estudianteId = vinculation.estudianteId;
                } else {
                    return res.status(200).json([]);
                }
            } else if (req.user.role === 'student' || req.user.role === 'apoderado') {
                return res.status(200).json([]);
            }

            const enrollments = await Enrollment.find(query)
                .populate('estudianteId', 'nombres apellidos rut email')
                .populate('courseId', 'name code')
                .populate('apoderadoId', 'nombre apellidos');
            res.status(200).json(enrollments);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Get enrollments by student (Secure)
    static async getEnrollmentsByStudent(req, res) {
        try {
            const enrollments = await Enrollment.find({
                estudianteId: req.params.studentId || req.params.estudianteId,
                tenantId: req.user.tenantId
            })
                .populate('estudianteId', 'nombres apellidos rut email')
                .populate('courseId', 'name code')
                .populate('apoderadoId', 'nombre apellidos');
            res.status(200).json(enrollments);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Get enrollments by course (Secure)
    static async getEnrollmentsByCourse(req, res) {
        try {
            const enrollments = await Enrollment.find({
                courseId: req.params.courseId,
                tenantId: req.user.tenantId
            })
                .populate('estudianteId', 'nombres apellidos rut email')
                .populate('courseId', 'name code')
                .populate('apoderadoId', 'nombre apellidos');
            res.status(200).json(enrollments);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Get enrollments by tenant (Secure)
    static async getEnrollmentsByTenant(req, res) {
        try {
            const targetTenant = req.params.tenantId;
            if (req.user.role !== 'admin' && req.user.tenantId !== targetTenant) {
                return res.status(403).json({ message: 'Acceso denegado' });
            }

            const enrollments = await Enrollment.find({ tenantId: targetTenant })
                .populate('estudianteId', 'nombres apellidos rut email')
                .populate('courseId', 'name code')
                .populate('apoderadoId', 'nombre apellidos');
            res.status(200).json(enrollments);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Get enrollments by period (Secure)
    static async getEnrollmentsByPeriod(req, res) {
        try {
            const enrollments = await Enrollment.find({
                period: req.params.period,
                tenantId: req.user.tenantId
            })
                .populate('estudianteId', 'nombres apellidos rut email')
                .populate('courseId', 'name code')
                .populate('apoderadoId', 'nombre apellidos');
            res.status(200).json(enrollments);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Get a single enrollment by ID (Secure)
    static async getEnrollmentById(req, res) {
        try {
            const enrollment = await Enrollment.findOne({
                _id: req.params.id,
                tenantId: req.user.tenantId
            })
                .populate('estudianteId', 'nombres apellidos rut email')
                .populate('courseId', 'name code')
                .populate('apoderadoId', 'nombre apellidos');
            if (!enrollment) {
                return res.status(404).json({ message: 'Inscripción no encontrada' });
            }
            res.status(200).json(enrollment);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Update an enrollment by ID (Secure)
    static async updateEnrollment(req, res) {
        try {
            const enrollment = await Enrollment.findOneAndUpdate(
                { _id: req.params.id, tenantId: req.user.tenantId },
                req.body,
                { new: true }
            )
                .populate('estudianteId', 'nombres apellidos rut email')
                .populate('courseId', 'name code')
                .populate('apoderadoId', 'nombre apellidos');
            if (!enrollment) {
                return res.status(404).json({ message: 'Inscripción no encontrada' });
            }
            res.status(200).json(enrollment);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    // Add documents to an existing enrollment (Secure)
    static async addDocuments(req, res) {
        try {
            const enrollment = await Enrollment.findOne({
                _id: req.params.id,
                tenantId: req.user.tenantId
            });
            if (!enrollment) return res.status(404).json({ message: 'Inscripción no encontrada' });

            if (req.files && req.files.length) {
                for (const file of req.files) {
                    const bufferStream = new Readable();
                    bufferStream.push(file.buffer);
                    bufferStream.push(null);

                    const filename = `enrollment-${Date.now()}-${file.originalname}`;
                    const { url } = await saveStreamToFile(bufferStream, filename);

                    enrollment.documents.push({
                        filename: file.originalname,
                        url,
                        mimeType: file.mimetype,
                        size: file.size
                    });
                }
            }

            await enrollment.save();
            res.status(200).json(enrollment);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    // Delete an enrollment by ID (Secure)
    static async deleteEnrollment(req, res) {
        try {
            const enrollment = await Enrollment.findOneAndDelete({
                _id: req.params.id,
                tenantId: req.user.tenantId
            });
            if (!enrollment) {
                return res.status(404).json({ message: 'Inscripción no encontrada' });
            }
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // [NUEVO] Send consolidated institutional email list to Sostenedor
    static async sendInstitutionalList(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const enrollments = await Enrollment.find({ tenantId })
                .populate('estudianteId', 'nombres apellidos rut')
                .populate('courseId', 'name');

            if (enrollments.length === 0) {
                return res.status(400).json({ message: 'No hay matrículas registradas para este periodo.' });
            }

            const Tenant = await import('../models/tenantModel.js').then(m => m.default);
            const tenant = await Tenant.findById(tenantId);
            const NotificationService = await import('../services/notificationService.js').then(m => m.default);

            await NotificationService.notifyInstitutionalBatch(
                tenant.contactEmail || 'administracion@einsmart.cl',
                tenant.name,
                enrollments.map(e => ({
                    rut: e.estudianteId?.rut || 'N/A',
                    nombres: e.estudianteId?.nombres || 'N/A',
                    apellidos: e.estudianteId?.apellidos || 'N/A',
                    curso: e.courseId?.name || 'N/A'
                }))
            );

            res.status(200).json({ message: `Listado enviado correctamente a ${tenant.contactEmail || 'administracion@einsmart.cl'}` });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export default EnrollmentController;
