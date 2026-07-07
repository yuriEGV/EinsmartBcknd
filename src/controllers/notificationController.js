
import User from '../models/userModel.js';
import Estudiante from '../models/estudianteModel.js';
import Apoderado from '../models/apoderadoModel.js';
import Tenant from '../models/tenantModel.js';

// Stub for email service. Replace with Nodemailer or SendGrid.
const sendEmail = async (to, subject, html) => {
    console.log(`[EMAIL STUB] To: ${to} | Subject: ${subject}`);
    // console.log(html);
    return true;
};

class NotificationController {

    // Notify debtor (Guardian) + Copy to Finance
    static async sendPaymentReminder(req, res) {
        try {
            const { studentId, totalDebt } = req.body;
            const tenantId = req.user.tenantId;

            const student = await Estudiante.findOne({ _id: studentId, tenantId });
            if (!student) return res.status(404).json({ message: 'Estudiante no encontrado' });

            // Find Guardian (assuming linked via Apoderado model or student fields)
            // Need to find Apoderado linked to student
            const apoderado = await Apoderado.findOne({ estudianteId: studentId, tipo: 'principal', tenantId });

            // Find Finance Secretary (Secretaries or generic admin email)
            // Or Sostenedor
            const financeUsers = await User.find({
                tenantId,
                role: { $in: ['sostenedor', 'secretary', 'admin'] }
            });
            const financeEmails = financeUsers.map(u => u.email);

            if (!apoderado || !apoderado.email) {
                return res.status(400).json({ message: 'No se encontró email del apoderado principal.' });
            }

            // Email Content for Guardian
            const guardianHtml = `
                <h1>Aviso de Morosidad - ${student.nombres} ${student.apellidos}</h1>
                <p>Estimado Apoderado:</p>
                <p>Le informamos que mantiene una deuda pendiente de <strong>$${totalDebt.toLocaleString()}</strong>.</p>
                <p>Le solicitamos regularizar su situación a la brevedad para evitar inconvenientes en el proceso de matrícula del próximo año.</p>
                <p>Atte, Administración.</p>
            `;

            // Email Content for Finance
            const financeHtml = `
                <h1>Copia de Aviso de Cobranza</h1>
                <p>Se ha notificado al apoderado de: ${student.nombres} ${student.apellidos}</p>
                <p>Monto adeudado: $${totalDebt.toLocaleString()}</p>
                <p>Apoderado: ${apoderado.nombres} ${apoderado.apellidos} (${apoderado.email})</p>
            `;

            // Send Emails
            await sendEmail(apoderado.email, 'Aviso de Cobranza', guardianHtml);

            for (const email of financeEmails) {
                await sendEmail(email, `[COPIA] Aviso de Cobranza - ${student.nombres}`, financeHtml);
            }

            res.status(200).json({ message: 'Notificaciones enviadas.' });

        } catch (error) {
            console.error('Notification Error:', error);
            res.status(500).json({ message: error.message });
        }
    }
}

export default NotificationController;
