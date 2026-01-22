
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // App Password
    }
});

export const sendEmail = async (to, subject, html) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to,
            subject,
            html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent: ' + info.response);
        return info;
    } catch (error) {
        console.error('❌ Error sending email:', error);
        throw error;
    }
};

export const sendPasswordRecoveryEmail = async (email, token) => {
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
    return sendEmail(email, 'Recuperación de Contraseña - Maritimo 4.0', html);
};

export default { sendEmail, sendPasswordRecoveryEmail };
