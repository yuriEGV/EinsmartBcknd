import nodemailer from 'nodemailer';

export async function sendMail(to, subject, text) {
    // Configuración del transportador con Gmail
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: `"Maritimo 2.0" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("📧 Email enviado:", info.messageId);
    } catch (error) {
        console.error("❌ Error enviando email:", error);
        throw error; // Para que el controlador lo capture si es necesario
    }
}
