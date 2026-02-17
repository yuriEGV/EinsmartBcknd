
import nodemailer from 'nodemailer';
import Tenant from '../models/tenantModel.js';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'mail.imaritimo.cl',
    port: parseInt(process.env.EMAIL_PORT || '465'),
    secure: process.env.EMAIL_SECURE !== 'false', // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

/**
 * Generic email sending service with tenant-based branding
 */
export const sendEmail = async (to, subject, html, tenantId = null) => {
    try {
        let fromName = "EinSmart";
        let replyTo = process.env.EMAIL_USER;

        if (tenantId) {
            try {
                const tenant = await Tenant.findById(tenantId);
                if (tenant) {
                    fromName = tenant.emailConfig?.senderName || tenant.name;
                    replyTo = tenant.emailConfig?.senderEmail || tenant.contactEmail || process.env.EMAIL_USER;
                }
            } catch (err) {
                console.warn('⚠️ Could not fetch tenant for email branding:', err.message);
            }
        }

        const mailOptions = {
            from: `"${fromName}" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html,
            replyTo
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent: ' + info.response);
        return info;
    } catch (error) {
        console.error('❌ Error sending email:', error);
        throw error;
    }
};

// Housekeeping: Alias for notificationService and others using the old name
export const sendMail = sendEmail;

/**
 * Specialized email for password recovery
 */
export const sendPasswordRecoveryEmail = async (email, token, tenantId = null) => {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    const html = `
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h2 style="color: #11355a;">Recuperación de Contraseña</h2>
            <p>Has solicitado restablecer tu contraseña.</p>
            <p>Haz clic en el siguiente enlace para continuar:</p>
            <a href="${resetUrl}" style="background-color: #11355a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Restablecer Contraseña</a>
            <p style="margin-top: 20px; font-size: 12px; color: #777;">Si no solicitaste esto, puedes ignorar este correo.</p>
        </div>
    `;
    return sendEmail(email, 'Recuperación de Contraseña', html, tenantId);
};

export default { sendEmail, sendMail, sendPasswordRecoveryEmail };
