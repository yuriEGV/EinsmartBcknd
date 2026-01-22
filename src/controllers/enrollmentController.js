import Enrollment from '../models/enrollmentModel.js';
import { saveStreamToFile } from '../services/storageService.js';
import { Readable } from 'stream';

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
                newStudent,   // { nombres, apellidos, rut, email, grado, edad }
                newGuardian   // { nombre, apellidos, correo, telefono, direccion, parentesco }
            } = req.body;

            const tenantId = req.user.tenantId;
            let finalStudentId = studentId;
            let finalGuardianId = apoderadoId;

            // 1. Logic for New Student Creation (Improved)
            if (!finalStudentId && newStudent && newStudent.nombres) {
                const Estudiante = await import('../models/estudianteModel.js').then(m => m.default);

                // Check if student already exists by RUT or Email to avoid Duplicate Key Error
                const existingStudent = await Estudiante.findOne({
                    $or: [
                        { rut: newStudent.rut },
                        { email: newStudent.email }
                    ].filter(c => Object.values(c)[0]) // Filter out undefined checks
                });

                if (existingStudent) {
                    console.log(`Student already exists (ID: ${existingStudent._id}). Using existing student.`);
                    finalStudentId = existingStudent._id;
                } else {
                    const std = new Estudiante({
                        ...newStudent,
                        tenantId
                    });
                    await std.save();
                    finalStudentId = std._id;
                }
            }

            // 2. Logic for New Guardian Creation
            if (newGuardian && newGuardian.nombre) {
                const Apoderado = await import('../models/apoderadoModel.js').then(m => m.default);
                const apo = new Apoderado({
                    ...newGuardian,
                    estudianteId: finalStudentId,
                    tenantId,
                    tipo: 'principal'
                });
                await apo.save();
                finalGuardianId = apo._id;
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

            const enrollment = new Enrollment({
                tenantId,
                estudianteId: finalStudentId,
                courseId,
                period,
                apoderadoId: finalGuardianId,
                status,
                fee,
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

            await enrollment.populate('estudianteId', 'nombre apellido');
            await enrollment.populate('courseId', 'name code');
            await enrollment.populate('apoderadoId', 'nombre apellidos');

            res.status(201).json(enrollment);

        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }


    // Get all enrollments
    static async getEnrollments(req, res) {
        try {
            const query = (req.user.role === 'admin')
                ? {}
                : { tenantId: req.user.tenantId };

            const enrollments = await Enrollment.find(query)
                .populate('estudianteId', 'nombre apellido')
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
                .populate('estudianteId', 'nombre apellido')
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
                .populate('estudianteId', 'nombre apellido')
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
                .populate('estudianteId', 'nombre apellido')
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
                .populate('estudianteId', 'nombre apellido')
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
                .populate('estudianteId', 'nombre apellido')
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
                .populate('estudianteId', 'nombre apellido')
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
}

export default EnrollmentController;
