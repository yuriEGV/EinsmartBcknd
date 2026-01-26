import Apoderado from '../models/apoderadoModel.js';
import Estudiante from '../models/estudianteModel.js';
import UserNotification from '../models/userNotificationModel.js';
import User from '../models/userModel.js';
import { sendMail } from '../../emailService.js';
import Enrollment from '../models/enrollmentModel.js';

class NotificationService {
    /**
     * Send notification to guardians when a grade is posted
     */
    static async notifyNewGrade(studentId, grade, subject, evaluationTitle, tenantId) {
        try {
            const student = await Estudiante.findById(studentId);
            const guardians = await Apoderado.find({ estudianteId: studentId, tenantId });

            if (!student || guardians.length === 0) return;

            for (const guardian of guardians) {
                if (!guardian.correo) continue;

                const html = `
                    <div style="font-family: Arial, sans-serif; color: #333;">
                        <h2 style="color: #11355a;">Nueva Calificación</h2>
                        <p>Estimado(a) <strong>${guardian.nombre} ${guardian.apellidos}</strong>,</p>
                        <p>Le informamos que se ha registrado una nueva calificación para el alumno <strong>${student.nombres} ${student.apellidos}</strong>.</p>
                        <div style="background-color: #f4f7f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <p><strong>Asignatura:</strong> ${subject}</p>
                            <p><strong>Evaluación:</strong> ${evaluationTitle}</p>
                            <p style="font-size: 1.2em; color: #11355a;"><strong>Nota: ${grade}</strong></p>
                        </div>
                        <p>Puede ver más detalles ingresando al sistema.</p>
                        <p style="margin-top: 20px; font-size: 12px; color: #777;">Maritimo 4.0 - Sistema de Gestión Escolar</p>
                    </div>
                `;

                await sendMail(guardian.correo, `Nueva Nota: ${student.nombres} - ${subject}`, html);
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

            if (!student || guardians.length === 0) return;

            const typeLabel = type === 'positiva' ? 'Positiva' : 'Negativa';
            const typeColor = type === 'positiva' ? '#22c55e' : '#ef4444';

            for (const guardian of guardians) {
                if (!guardian.correo) continue;

                const html = `
                    <div style="font-family: Arial, sans-serif; color: #333;">
                        <h2 style="color: ${typeColor};">Nueva Anotación ${typeLabel}</h2>
                        <p>Estimado(a) <strong>${guardian.nombre} ${guardian.apellidos}</strong>,</p>
                        <p>Se ha registrado una nueva anotación en la hoja de vida de <strong>${student.nombres} ${student.apellidos}</strong>.</p>
                        <div style="background-color: #f4f7f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <p><strong>Título:</strong> ${title}</p>
                            <p><strong>Descripción:</strong> ${description}</p>
                        </div>
                        <p>Por favor, ingrese al sistema para revisar los detalles y medidas tomadas.</p>
                        <p style="margin-top: 20px; font-size: 12px; color: #777;">Maritimo 4.0 - Sistema de Gestión Escolar</p>
                    </div>
                `;

                await sendMail(guardian.correo, `Anotación ${typeLabel}: ${student.nombres}`, html);
            }
        } catch (error) {
            console.error('❌ Error in notifyNewAnnotation:', error);
        }
    }


    /**
     * Send notification to guardians when a debt block occurs (debt > 3 months)
     */
    static async notifyDebtor(guardianId, studentName, debtAmount, details) {
        try {
            const guardian = await Apoderado.findById(guardianId);
            if (!guardian || !guardian.correo) return;

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
                    <p style="margin-top: 20px; font-size: 12px; color: #777;">Maritimo 4.0 - Sistema de Gestión Escolar</p>
                </div>
            `;

            await sendMail(guardian.correo, `Aviso Importante: Morosidad ${studentName}`, html);
            console.log(`📧 Debt notification sent to ${guardian.correo}`);
        } catch (error) {
            console.error('❌ Error in notifyDebtor:', error);
        }
    }

    /**
     * Send consolidated student list to Sostenedor for institutional accounts
     */
    static async notifyInstitutionalBatch(recipientEmail, tenantName, studentList) {
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
                    <p style="margin-top: 20px; font-size: 12px; color: #777;">Maritimo 4.0 - Sistema de Gestión Escolar</p>
                </div>
            `;

            await sendMail(recipientEmail, `Listado Institucional: ${tenantName}`, html);
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
                role: { $in: ['admin', 'sostenedor'] }
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
            const sostenedores = await User.find({ tenantId, role: 'sostenedor' });
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
                            Maritimo 4.0 - Plataforma de Gestión Educativa de Alto Rendimiento
                        </p>
                    </div>
                </div>
            `;

            for (const sostenedor of sostenedores) {
                if (sostenedor.email) {
                    await sendMail(sostenedor.email, '📊 Reporte de Performance Académica Semanal', html);
                }
            }
            console.log(`✅ Weekly performance report sent to ${sostenedores.length} Sostenedores`);
        } catch (error) {
            console.error('❌ Error in notifyWeeklyPerformance:', error);
        }
    }
}

export default NotificationService;
