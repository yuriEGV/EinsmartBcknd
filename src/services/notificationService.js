import Apoderado from '../models/apoderadoModel.js';
import Estudiante from '../models/estudianteModel.js';
import UserNotification from '../models/userNotificationModel.js';
import User from '../models/userModel.js';
import Enrollment from '../models/enrollmentModel.js';
import Tenant from '../models/tenantModel.js';
import { sendMail } from './emailService.js';

class NotificationService {
    /**
     * Send notification to guardians when a grade is posted
     */
    static async notifyNewGrade(studentId, grade, subject, evaluationTitle, tenantId) {
        try {
            const student = await Estudiante.findById(studentId);
            const guardians = await Apoderado.find({ estudianteId: studentId, tenantId });
            const tenant = await Tenant.findById(tenantId);
            const tenantName = tenant?.name || 'EinSmart';

            if (!student) return;

            // 1. Notify Student via Email (if available)
            if (student.email) {
                const studentHtml = `
                    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
                        <div style="background-color: #11355a; color: white; padding: 20px; text-align: center;">
                            <h2 style="margin: 0;">🎉 Nueva Calificación Recibida</h2>
                        </div>
                        <div style="padding: 30px;">
                            <p>¡Hola <strong>${student.nombres}</strong>!</p>
                            <p>Se ha publicado una nueva nota en tu perfil académico.</p>
                            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #11355a;">
                                <p style="margin: 5px 0;"><strong>Asignatura:</strong> ${subject}</p>
                                <p style="margin: 5px 0;"><strong>Evaluación:</strong> ${evaluationTitle}</p>
                                <p style="margin: 5px 0; font-size: 1.5em; color: #11355a;"><strong>Nota Final: ${grade}</strong></p>
                            </div>
                            <p>Te invitamos a revisar tus comentarios y el curso completo en el portal.</p>
                            <p style="margin-top: 30px; font-size: 14px; color: #666; text-align: center;">¡Sigue esforzándote!</p>
                        </div>
                        <div style="background-color: #f4f7f6; padding: 15px; text-align: center; font-size: 12px; color: #777;">
                            ${tenantName} - Sistema de Gestión Escolar
                        </div>
                    </div>
                `;
                await sendMail(student.email, `¡Nueva Nota! ${subject}: ${grade}`, studentHtml, tenantId);
            }

            // 2. Internal Notification for Student
            const studentUser = await User.findOne({ profileId: studentId, role: 'student', tenantId });
            if (studentUser) {
                await NotificationService.createInternalNotification({
                    tenantId,
                    userId: studentUser._id,
                    title: 'Nueva Calificación',
                    message: `Has recibido una nota de ${grade} en ${subject} (${evaluationTitle}).`,
                    type: 'grade',
                    link: '/grades'
                });
            }

            // 3. Notify Guardians
            for (const guardian of guardians) {
                // Email
                if (guardian.correo) {
                    const guardianHtml = `
                        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
                            <div style="background-color: #11355a; color: white; padding: 20px; text-align: center;">
                                <h2 style="margin: 0;">📊 Reporte de Calificación</h2>
                            </div>
                            <div style="padding: 30px;">
                                <p>Estimado(a) <strong>${guardian.nombre} ${guardian.apellidos}</strong>,</p>
                                <p>Le informamos que se ha registrado una nueva calificación para el alumno <strong>${student.nombres} ${student.apellidos}</strong>.</p>
                                <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #11355a;">
                                    <p style="margin: 5px 0;"><strong>Asignatura:</strong> ${subject}</p>
                                    <p style="margin: 5px 0;"><strong>Evaluación:</strong> ${evaluationTitle}</p>
                                    <p style="margin: 5px 0; font-size: 1.5em; color: #11355a;"><strong>Nota Alumno: ${grade}</strong></p>
                                </div>
                                <p>Puede ver más detalles e historial académico ingresando al portal de apoderados.</p>
                            </div>
                            <div style="background-color: #f4f7f6; padding: 15px; text-align: center; font-size: 12px; color: #777;">
                            ${tenantName} - Sistema de Gestión Escolar
                            </div>
                        </div>
                    `;
                    await sendMail(guardian.correo, `Nueva Nota: ${student.nombres} - ${subject}`, guardianHtml, tenantId);
                }

                // Internal Notification for Guardian
                const guardianUser = await User.findOne({ profileId: guardian._id, role: 'apoderado', tenantId });
                if (guardianUser) {
                    await NotificationService.createInternalNotification({
                        tenantId,
                        userId: guardianUser._id,
                        title: 'Nota Registrada',
                        message: `${student.nombres} ha recibido una nota de ${grade} en ${subject}.`,
                        type: 'grade',
                        link: '/grades'
                    });
                }
            }
        } catch (error) {
            console.error('❌ Error in notifyNewGrade:', error);
        }
    }

    /**
     * Send notification to guardians when an annotation is posted
     */
    static async notifyNewAnnotation(studentId, type, title, description, tenantId) {
        try {
            const student = await Estudiante.findById(studentId);
            const guardians = await Apoderado.find({ estudianteId: studentId, tenantId });
            const tenant = await Tenant.findById(tenantId);
            const tenantName = tenant?.name || 'EinSmart';

            if (!student) return;

            const typeLabel = type === 'positiva' ? 'Positiva' : 'Negativa';
            const typeColor = type === 'positiva' ? '#22c55e' : '#ef4444';

            // 1. Notify Student via Email
            if (student.email) {
                const studentHtml = `
                    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
                        <div style="background-color: ${typeColor}; color: white; padding: 20px; text-align: center;">
                            <h2 style="margin: 0;">📝 Nueva Anotación ${typeLabel}</h2>
                        </div>
                        <div style="padding: 30px;">
                            <p>Hola <strong>${student.nombres}</strong>,</p>
                            <p>Se ha registrado una nueva anotación en tu hoja de vida.</p>
                            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${typeColor};">
                                <p style="margin: 5px 0;"><strong>Tipo:</strong> ${typeLabel}</p>
                                <p style="margin: 5px 0;"><strong>Título:</strong> ${title}</p>
                                <p style="margin: 5px 0;"><strong>Descripción:</strong> ${description}</p>
                            </div>
                            <p>Puedes revisar los detalles en el portal del alumno.</p>
                        </div>
                        <div style="background-color: #f4f7f6; padding: 15px; text-align: center; font-size: 12px; color: #777;">
                            ${tenantName} - Sistema de Gestión Escolar
                        </div>
                    </div>
                `;
                await sendMail(student.email, `Nueva Anotación ${typeLabel}: ${title}`, studentHtml, tenantId);
            }

            // 2. Internal Notification for Student
            const studentUser = await User.findOne({ profileId: studentId, role: 'student', tenantId });
            if (studentUser) {
                await NotificationService.createInternalNotification({
                    tenantId,
                    userId: studentUser._id,
                    title: `Anotación ${typeLabel}`,
                    message: `Se ha registrado una anotación ${typeLabel}: "${title}".`,
                    type: 'annotation',
                    link: '/annotations'
                });
            }

            // 3. Notify Guardians
            for (const guardian of guardians) {
                // Email
                if (guardian.correo) {
                    const guardianHtml = `
                        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
                            <div style="background-color: ${typeColor}; color: white; padding: 20px; text-align: center;">
                                <h2 style="margin: 0;">📝 Nueva Anotación ${typeLabel}</h2>
                            </div>
                            <div style="padding: 30px;">
                                <p>Estimado(a) <strong>${guardian.nombre} ${guardian.apellidos}</strong>,</p>
                                <p>Se ha registrado una nueva anotación en la hoja de vida de <strong>${student.nombres} ${student.apellidos}</strong>.</p>
                                <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${typeColor};">
                                    <p style="margin: 5px 0;"><strong>Alumno:</strong> ${student.nombres} ${student.apellidos}</p>
                                    <p style="margin: 5px 0;"><strong>Título:</strong> ${title}</p>
                                    <p style="margin: 5px 0;"><strong>Descripción:</strong> ${description}</p>
                                </div>
                                <p>Por favor, ingrese al sistema para revisar los detalles y medidas tomadas.</p>
                            </div>
                            <div style="background-color: #f4f7f6; padding: 15px; text-align: center; font-size: 12px; color: #777;">
                                ${tenantName} - Sistema de Gestión Escolar
                            </div>
                        </div>
                    `;
                    await sendMail(guardian.correo, `Anotación ${typeLabel}: ${student.nombres}`, guardianHtml, tenantId);
                }

                // Internal Notification for Guardian
                const guardianUser = await User.findOne({ profileId: guardian._id, role: 'apoderado', tenantId });
                if (guardianUser) {
                    await NotificationService.createInternalNotification({
                        tenantId,
                        userId: guardianUser._id,
                        title: `Anotación Registrada (${student.nombres})`,
                        message: `Se ha registrado una anotación ${typeLabel} para ${student.nombres}: "${title}".`,
                        type: 'annotation',
                        link: '/annotations'
                    });
                }
            }
        } catch (error) {
            console.error('❌ Error in notifyNewAnnotation:', error);
        }
    }

    /**
     * Send notification to guardians when a citation is created
     */
    static async notifyNewCitation(studentId, subject, date, hour, motivo, tenantId) {
        try {
            const student = await Estudiante.findById(studentId);
            const guardians = await Apoderado.find({ estudianteId: studentId, tenantId });
            const tenant = await Tenant.findById(tenantId);
            const tenantName = tenant?.name || 'EinSmart';

            if (!student) return;

            const formattedDate = new Date(date).toLocaleDateString('es-CL', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            // 1. Notify Guardians via Email
            for (const guardian of guardians) {
                if (guardian.correo) {
                    const guardianHtml = `
                        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
                            <div style="background-color: #11355a; color: white; padding: 25px; text-align: center;">
                                <h1 style="margin: 0; font-size: 22px;">📅 Citación de Apoderado</h1>
                            </div>
                            <div style="padding: 30px;">
                                <p>Estimado(a) <strong>${guardian.nombre} ${guardian.apellidos}</strong>,</p>
                                <p>Le informamos que se ha agendado una citación formal para tratar temas relacionados con el alumno <strong>${student.nombres} ${student.apellidos}</strong>.</p>
                                
                                <div style="background-color: #f0f7ff; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 5px solid #11355a;">
                                    <h3 style="margin-top: 0; color: #11355a;">Detalles de la Cita</h3>
                                    <p style="margin: 8px 0;"><strong>Fecha:</strong> ${formattedDate}</p>
                                    <p style="margin: 8px 0;"><strong>Hora:</strong> ${hour}</p>
                                    <p style="margin: 8px 0;"><strong>Asignatura/Motivo:</strong> ${subject}</p>
                                    <p style="margin: 15px 0; padding-top: 10px; border-top: 1px dashed #cbd5e1;"><strong>Detalle Estimado:</strong><br/>${motivo}</p>
                                </div>

                                <p>Su asistencia es de suma importancia para el seguimiento académico del estudiante. En caso de no poder asistir, por favor comuníquese a la brevedad con el establecimiento.</p>
                                
                                <div style="margin-top: 30px; text-align: center;">
                                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" 
                                       style="background-color: #11355a; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                                        Ver en el Portal
                                    </a>
                                </div>
                            </div>
                            <div style="background-color: #f4f7f6; padding: 15px; text-align: center; font-size: 12px; color: #777;">
                                ${tenantName} - Sistema de Gestión Escolar
                            </div>
                        </div>
                    `;
                    await sendMail(guardian.correo, `Citación de Apoderado: ${student.nombres} - ${formattedDate}`, guardianHtml, tenantId);
                }

                // Internal Notification for Guardian
                const guardianUser = await User.findOne({ profileId: guardian._id, role: 'apoderado', tenantId });
                if (guardianUser) {
                    await NotificationService.createInternalNotification({
                        tenantId,
                        userId: guardianUser._id,
                        title: 'Nueva Citación Agendada',
                        message: `Se ha agendado una citación para el alumno ${student.nombres} el día ${formattedDate} a las ${hour}.`,
                        type: 'system',
                        link: '/dashboard'
                    });
                }
            }
            // 3. Notify Directors and Inspectors
            await NotificationService.broadcastToAdmins({
                tenantId,
                title: 'Nueva Citación Agendada',
                message: `Se ha agendado una citación para el alumno ${student.nombres} ${student.apellidos} el día ${formattedDate} a las ${hour}.`,
                type: 'system',
                link: '/class-book'
            });
        } catch (error) {
            console.error('❌ Error in notifyNewCitation:', error);
        }
    }


    /**
     * Send notification to guardians when a debt block occurs (debt > 3 months)
     */
    static async notifyDebtor(guardianId, studentName, debtAmount, details) {
        try {
            const guardian = await Apoderado.findById(guardianId);
            if (!guardian || !guardian.correo) return;

            const tenant = await Tenant.findById(guardian.tenantId);
            const tenantName = tenant?.name || 'EinSmart';

            const html = `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2 style="color: #ef4444;">Aviso de Bloqueo de Matrícula</h2>
                    <p>Estimado(a) <strong>${guardian.nombre} ${guardian.apellidos}</strong>,</p>
                    <p>Le informamos que el alumno <strong>${studentName}</strong> presenta una situación de morosidad superior a 3 meses, lo cual impide el proceso de matrícula.</p>
                    <div style="background-color: #fff1f2; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #fecaca;">
                        <p><strong>Monto Pendiente:</strong> $${debtAmount}</p>
                        <p><strong>Detalle:</strong> ${details}</p>
                    </div>
                    <p>Por favor, acérquese a administración o contacte al sostenedor para regularizar su situación.</p>
                    <p style="margin-top: 20px; font-size: 12px; color: #777;">Sistema de Gestión Escolar</p>
                </div>
            `;

            // We don't have tenantId passed here, but we can try to find it from guardian if needed.
            // For now, if not passed, it will use default. 
            // Better: update method signature to include tenantId if possible, or fetch from guardian.
            const tenantId_loc = guardian.tenantId;
            await sendMail(guardian.correo, `Aviso Importante: Morosidad ${studentName}`, html, tenantId_loc);
            console.log(`📧 Debt notification sent to ${guardian.correo}`);
        } catch (error) {
            console.error('❌ Error in notifyDebtor:', error);
        }
    }

    /**
     * Send consolidated student list to Sostenedor for institutional accounts
     */
    static async notifyInstitutionalBatch(recipientEmail, tenantName, studentList, tenantId = null) {
        try {
            const tableRows = studentList.map(s => `
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;">${s.rut}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${s.nombres} ${s.apellidos}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${s.curso}</td>
                </tr>
            `).join('');

            const html = `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2 style="color: #11355a;">Listado de Nuevos Alumnos - ${tenantName}</h2>
                    <p>Estimado Sostenedor,</p>
                    <p>Se adjunta el listado de alumnos matriculados para la creación de sus <strong>correos institucionales</strong> y acceso a plataformas.</p>
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <thead>
                            <tr style="background-color: #f4f7f6;">
                                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">RUT</th>
                                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Nombre Completo</th>
                                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Curso</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                    <p>Por favor, proceda con el alta en Google Workspace / Office 365 según corresponda.</p>
                    <p style="margin-top: 20px; font-size: 12px; color: #777;">Sistema de Gestión Escolar</p>
                </div>
            `;

            // This one is called from enrollmentController which has tenant info. 
            // We should ideally pass tenantId to this method too. 
            // But let's check if it's called with tenant info.
            await sendMail(recipientEmail, `Listado Institucional: ${tenantName}`, html, tenantId);
            console.log(`📧 Batch institutional list sent to ${recipientEmail}`);
        } catch (error) {
            console.error('❌ Error in notifyInstitutionalBatch:', error);
        }
    }
    /**
     * Create an internal notification for a specific user
     */
    static async createInternalNotification({ tenantId, userId, title, message, type = 'system', link = '' }) {
        try {
            const notification = await UserNotification.create({
                tenantId,
                userId,
                title,
                message,
                type,
                link
            });
            return notification;
        } catch (error) {
            console.error('❌ Error creating internal notification:', error);
        }
    }

    /**
     * Broadcast an internal notification to all admins/sostenedores of a tenant
     */
    static async broadcastToAdmins({ tenantId, title, message, type = 'system', link = '' }) {
        try {
            const admins = await User.find({
                tenantId,
                role: { $in: ['admin', 'sostenedor', 'director', 'utp'] }
            });

            const notifications = admins.map(admin => ({
                tenantId,
                userId: admin._id,
                title,
                message,
                type,
                link
            }));

            if (notifications.length > 0) {
                await UserNotification.insertMany(notifications);
            }
        } catch (error) {
            console.error('❌ Error broadcasting to admins:', error);
        }
    }

    /**
     * Notify students of a new assessment/evaluation in their course
     */
    static async notifyCourseAssessment(courseId, assessmentTitle, date, tenantId) {
        try {
            const tenant = await Tenant.findById(tenantId);
            const tenantName = tenant?.name || 'EinSmart';
            // 1. Find all confirmed students in the course
            const enrollments = await Enrollment.find({
                courseId,
                tenantId,
                status: 'confirmada'
            }).select('estudianteId');

            if (enrollments.length === 0) return;

            const studentIds = enrollments.map(e => e.estudianteId);

            // 2. Find User accounts for these students
            const studentUsers = await User.find({
                role: 'student',
                profileId: { $in: studentIds },
                tenantId
            });

            if (studentUsers.length === 0) return;

            // 3. Create Notifications
            const notifications = studentUsers.map(user => ({
                tenantId,
                userId: user._id,
                title: 'Nueva Evaluación Programada',
                message: `Se ha programado una nueva evaluación: "${assessmentTitle}" para el día ${new Date(date).toLocaleDateString()}. Revisa tu calendario.`,
                type: 'system',
                link: '/evaluations'
            }));

            await UserNotification.insertMany(notifications);
            console.log(`✅ Notified ${notifications.length} students about assessment: ${assessmentTitle}`);

        } catch (error) {
            console.error('❌ Error in notifyCourseAssessment:', error);
        }
    }

    /**
     * Send weekly performance report to Sostenedor
     */
    static async notifyWeeklyPerformance(tenantId, performanceData) {
        try {
            const tenant = await Tenant.findById(tenantId);
            const tenantName = tenant?.name || 'EinSmart';
            const sostenedores = await User.find({
                tenantId,
                role: { $in: ['sostenedor', 'director'] }
            });
            if (sostenedores.length === 0) return;

            const tableRows = performanceData.map(p => `
                <tr>
                    <td style="padding: 10px; border: 1px solid #eee;">${p._id.teacherName}</td>
                    <td style="padding: 10px; border: 1px solid #eee;">${p._id.courseName} - ${p._id.subjectName}</td>
                    <td style="padding: 10px; border: 1px solid #eee; text-align: center;">${p.classesCount}</td>
                    <td style="padding: 10px; border: 1px solid #eee; text-align: right; color: #11355a; font-weight: bold;">${p.totalMinutes} min</td>
                </tr>
            `).join('');

            const html = `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #444; max-width: 650px; margin: auto;">
                    <div style="background: linear-gradient(135deg, #11355a 0%, #1e4d8c 100%); padding: 40px; border-radius: 20px 20px 0 0; text-align: center; color: white;">
                        <h1 style="margin: 0; font-size: 24px;">Reporte de Performance Semanal</h1>
                        <p style="opacity: 0.8; margin-top: 10px;">Control de Carga Académica y Rendimiento</p>
                    </div>
                    <div style="padding: 40px; background: white; border: 1px solid #f0f0f0; border-radius: 0 0 20px 20px;">
                        <p>Estimado Sostenedor,</p>
                        <p>Se ha generado el resumen de actividad pedagógica de la última semana. A continuación se detallan los tiempos de instrucción registrados mediante firma digital:</p>
                        
                        <table style="width: 100%; border-collapse: collapse; margin-top: 25px;">
                            <thead>
                                <tr style="background-color: #f8fafc; color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em;">
                                    <th style="padding: 15px; border: 1px solid #eee; text-align: left;">Docente</th>
                                    <th style="padding: 15px; border: 1px solid #eee; text-align: left;">Asignatura</th>
                                    <th style="padding: 15px; border: 1px solid #eee; text-align: center;">Clases</th>
                                    <th style="padding: 15px; border: 1px solid #eee; text-align: right;">Total Tiempo</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRows}
                            </tbody>
                        </table>
                        
                        <div style="margin-top: 40px; padding: 20px; background-color: #f0f9ff; border-radius: 15px; border: 1px solid #e0f2fe; font-size: 13px; color: #0369a1;">
                            <strong>Nota:</strong> Los tiempos se calculan desde el inicio de la clase mediante el cronómetro hasta el momento de la firma digital del libro leccionario.
                        </div>
                        
                        <p style="margin-top: 40px; text-align: center; font-size: 11px; color: #999;">
                            Sistema de Gestión Educativa de Alto Rendimiento
                        </p>
                    </div>
                </div>
            `;

            for (const sostenedor of sostenedores) {
                if (sostenedor.email) {
                    await sendMail(sostenedor.email, '📊 Reporte de Performance Académica Semanal', html, tenantId);
                }
            }
            console.log(`✅ Weekly performance report sent to ${sostenedores.length} Sostenedores/Directors`);
        } catch (error) {
            console.error('❌ Error in notifyWeeklyPerformance:', error);
        }
    }

    /**
     * Notify guardian about successful enrollment with course and teacher details
     */
    static async notifyEnrollmentSuccess(enrollmentId, tenantId) {
        try {
            const enrollment = await Enrollment.findById(enrollmentId)
                .populate('estudianteId')
                .populate('apoderadoId')
                .populate('courseId');

            const tenant = await Tenant.findById(tenantId);
            const tenantName = tenant?.name || 'EinSmart';

            if (!enrollment) return;

            const student = enrollment.estudianteId;
            const guardian = enrollment.apoderadoId;
            const course = enrollment.courseId;

            if (!guardian || !guardian.correo) return;

            // Fetch subjects and teachers for this course
            const Subject = await import('../models/subjectModel.js').then(m => m.default);
            const subjects = await Subject.find({ courseId: course._id, tenantId }).populate('teacherId', 'name email');

            const teachersHtml = subjects.map(s => `
                <li style="margin-bottom: 8px;">
                    <strong>${s.name}:</strong> ${s.teacherId?.name || 'Por asignar'}
                </li>
            `).join('');

            const html = `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
                    <div style="background-color: #11355a; color: white; padding: 25px; text-align: center;">
                        <h1 style="margin: 0;">🎉 ¡Matrícula Confirmada!</h1>
                    </div>
                    <div style="padding: 30px;">
                        <p>Estimado(a) <strong>${guardian.nombre} ${guardian.apellidos}</strong>,</p>
                        <p>Nos complace informarle que el proceso de matrícula para <strong>${student.nombres} ${student.apellidos}</strong> ha sido completado exitosamente.</p>
                        
                        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #11355a;">
                            <h3 style="margin-top: 0; color: #11355a;">Detalles de Matrícula</h3>
                            <p style="margin: 5px 0;"><strong>Periodo:</strong> ${enrollment.period}</p>
                            <p style="margin: 5px 0;"><strong>Curso:</strong> ${course.name}</p>
                            <p style="margin: 5px 0;"><strong>Estado:</strong> ${enrollment.status.toUpperCase()}</p>
                        </div>

                        <h3 style="color: #11355a; border-bottom: 2px solid #eee; padding-bottom: 10px;">Asignaturas y Profesores</h3>
                        <ul style="padding-left: 20px;">
                            ${teachersHtml || '<li>Aún no hay asignaturas configuradas para este curso.</li>'}
                        </ul>

                        <p style="margin-top: 25px;">El alumno ya puede acceder al portal con sus credenciales institucionales.</p>
                        <p>Cualquier duda, por favor contacte a la administración del colegio.</p>
                    </div>
                    <div style="background-color: #f4f7f6; padding: 15px; text-align: center; font-size: 12px; color: #777;">
                        ${tenantName} - Sistema de Gestión Educativa
                    </div>
                </div>
            `;

            await sendMail(guardian.correo, `Confirmación de Matrícula - ${student.nombres} ${student.apellidos}`, html, tenantId);
            console.log(`📧 Enrollment confirmation email sent to ${guardian.correo}`);

        } catch (error) {
            console.error('❌ Error in notifyEnrollmentSuccess:', error);
        }
    }

    /**
     * Send enrollment summary report to Director and Sostenedor
     */
    static async sendEnrollmentSummaryReport(tenantId, period) {
        try {
            const enrollments = await Enrollment.find({ tenantId, period })
                .populate('estudianteId', 'nombres apellidos rut')
                .populate('courseId', 'name')
                .populate('apoderadoId', 'nombre apellidos correo');

            const tenant = await Tenant.findById(tenantId);
            const tenantName = tenant?.name || 'EinSmart';

            if (enrollments.length === 0) return;

            const tableRows = enrollments.map(e => `
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">${e.estudianteId?.nombres} ${e.estudianteId?.apellidos}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${e.estudianteId?.rut || 'N/A'}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${e.courseId?.name || 'N/A'}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${e.apoderadoId?.nombre} ${e.apoderadoId?.apellidos}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${e.status}</td>
                </tr>
            `).join('');

            const html = `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 800px; margin: auto;">
                    <h2 style="color: #11355a; text-align: center;">📊 Reporte Resumen de Matrículas - Periodo ${period}</h2>
                    <p>Estimados directivos,</p>
                    <p>Se adjunta el resumen consolidado de las matrículas registradas hasta la fecha para el periodo académico indicado.</p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px;">
                        <thead>
                            <tr style="background-color: #11355a; color: white;">
                                <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Alumno</th>
                                <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">RUT</th>
                                <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Curso</th>
                                <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Apoderado</th>
                                <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                    
                    <p style="margin-top: 30px; text-align: center; font-size: 12px; color: #777;">
                        Reporte generado automáticamente por EinSmart
                    </p>
                </div>
            `;

            const admins = await User.find({
                tenantId,
                role: { $in: ['sostenedor', 'director'] }
            });

            for (const admin of admins) {
                if (admin.email) {
                    await sendMail(admin.email, `📊 Resumen de Matrículas ${period}`, html, tenantId);
                }
            }

            console.log(`✅ Enrollment summary report sent to ${admins.length} admins.`);

        } catch (error) {
            console.error('❌ Error in sendEnrollmentSummaryReport:', error);
        }
    }
}

export default NotificationService;
