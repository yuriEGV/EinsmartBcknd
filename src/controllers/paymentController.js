
import Payment from '../models/paymentModel.js';
import Tariff from '../models/tariffModel.js';
import paymentService from '../services/paymentService.js';
import mongoose from 'mongoose';
import { sendEmail } from '../utils/emailService.js';
import User from '../models/userModel.js';
import Apoderado from '../models/apoderadoModel.js';
import Estudiante from '../models/estudianteModel.js';
import connectDB from '../config/db.js';

class PaymentController {

  static async createPayment(req, res) {
    try {
      await connectDB();
      const { estudianteId, apoderadoId, tariffId, provider, metadata } = req.body;
      const tenantId = req.user.tenantId;

      if (!estudianteId || !tariffId) {
        return res.status(400).json({
          message: 'estudianteId y tariffId son obligatorios'
        });
      }

      // Delegate to PaymentService which handles MP integration
      const result = await paymentService.createPaymentFromTariff({
        tenantId,
        estudianteId,
        tariffId,
        provider: provider || 'manual', // default to manual/transfer if not specified
        metadata: { ...metadata, apoderadoId }
      });

      // NOTIFICATION LOGIC
      // 1. Fetch relevant emails
      const student = await Estudiante.findById(estudianteId);
      const apoderado = await Apoderado.findOne({ estudianteId, tipo: 'principal' });

      const financeUsers = await User.find({ tenantId, role: { $in: ['sostenedor', 'admin', 'secretary'] } });
      const financeEmails = financeUsers.map(u => u.email);

      // 2. Logic based on provider/status
      if (provider === 'manual' || provider === 'efectivo') {
        // If cash, it requires human verification if "pagado" is attempted, or it starts as "en_revision"
        let subject = `Aviso de Cobro - ${student?.nombres}`;
        let body = `<p>Se ha generado un cobro por: ${result.concepto} ($${result.amount})</p>`;

        if (result.status === 'en_revision') {
          subject = `Pago en Revisión - ${student?.nombres}`;
          body = `<p>Hemos recibido un pago en efectivo por $${result.amount}. El estado se actualizará una vez verificado.</p>`;
        } else if (result.status === 'pagado') {
          subject = `Comprobante de Pago - ${student?.nombres}`;
          body = `<p>Pago confirmado por $${result.amount}. Concepto: ${result.concepto}.</p>`;
        }

        if (apoderado?.email) {
          await sendEmail(apoderado.email, subject, body).catch(e => console.error(e));
        }
        // Always notify finance/holder
        for (const femail of financeEmails) {
          await sendEmail(femail, `[ADMIN] ${subject}`, body + `<p>Apoderado: ${apoderado?.nombres || 'Desc.'}</p>`).catch(e => console.error(e));
        }
      } else {
        // Online Payment 
        if (apoderado?.email) {
          await sendEmail(apoderado.email, `Nuevo Cobro Asignado - ${student?.nombres}`, `<p>Se ha asignado un nuevo cobro por $${result.amount}. Puede pagar en línea desde su portal.</p>`).catch(e => console.error(e));
        }
      }

      res.status(201).json(result);

    } catch (error) {
      console.error('Payment error:', error);
      res.status(500).json({ message: error.message });
    }
  }

  // Webhook or Update Payment Status (Approved)
  static async updatePaymentStatus(req, res) {
    try {
      await connectDB();
      const { id } = req.params;
      const { status, verificationNote } = req.body; // 'pagado', 'rechazado'
      const tenantId = req.user.tenantId;

      const payment = await Payment.findOne({ _id: id, tenantId });
      if (!payment) return res.status(404).json({ message: 'Pago no encontrado' });

      payment.status = status;
      if (verificationNote) payment.metadata = { ...payment.metadata, verificationNote };

      await payment.save();

      // Notify if approved
      if (status === 'pagado' || status === 'approved') {
        const student = await Estudiante.findById(payment.estudianteId);
        const apoderado = await Apoderado.findOne({ estudianteId: payment.estudianteId, tipo: 'principal' });
        const financeUsers = await User.find({ tenantId, role: { $in: ['sostenedor', 'admin', 'secretary'] } });

        if (apoderado?.email) {
          await sendEmail(apoderado.email, `Pago Aprobado - ${student?.nombres}`, `<p>Su pago de $${payment.amount} ha sido verificado y aprobado.</p>`);
        }
      }

      // [NUEVO] Sincronizar estado financiero del apoderado
      if (payment.apoderadoId) {
        const ApoderadoModel = await import('../models/apoderadoModel.js').then(m => m.default);
        await ApoderadoModel.syncFinancialStatus(payment.apoderadoId);
      }

      res.json(payment);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async listPayments(req, res) {
    try {
      await connectDB();
      const query = (req.user.role === 'admin')
        ? {}
        : { tenantId: req.user.tenantId };

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

      const payments = await Payment.find(query)
        .populate('estudianteId', 'nombres apellidos rut')
        .populate('tariffId', 'name amount')
        .sort({ createdAt: -1 });

      const totalCollected = payments
        .filter(p => p.estado === 'pagado')
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      const totalPending = payments
        .filter(p => p.estado === 'pendiente' || p.estado === 'vencido')
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      res.json({
        payments,
        stats: {
          totalCollected,
          totalPending,
          count: payments.length
        }
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async getPaymentById(req, res) {
    try {
      await connectDB();
      const payment = await Payment.findOne({
        _id: req.params.id,
        tenantId: req.user.tenantId
      }).populate('estudianteId', 'nombres apellidos rut')
        .populate('tariffId', 'name amount');

      if (!payment) {
        return res.status(404).json({ message: 'Pago no encontrado' });
      }

      res.json(payment);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async assignBulkTariff(req, res) {
    try {
      await connectDB();
      const { courseId, tariffId, studentIds, dueDate, metadata } = req.body;
      const tenantId = req.user.tenantId;

      if (!tariffId) {
        return res.status(400).json({ message: 'tariffId es obligatorio' });
      }

      const Tariff = await import('../models/tariffModel.js').then(m => m.default);
      const Enrollment = await import('../models/enrollmentModel.js').then(m => m.default);
      const Payment = await import('../models/paymentModel.js').then(m => m.default);

      const tariff = await Tariff.findOne({ _id: tariffId, tenantId });
      if (!tariff) return res.status(404).json({ message: 'Tarifa no encontrada' });

      let targetStudentIds = studentIds || [];

      if (courseId) {
        const enrollments = await Enrollment.find({
          courseId,
          tenantId,
          status: { $in: ['confirmada', 'activo', 'activa'] }
        }).select('estudianteId');

        const courseStudentIds = enrollments.map(e => e.estudianteId.toString());
        targetStudentIds = [...new Set([...targetStudentIds, ...courseStudentIds])];
      }

      if (targetStudentIds.length === 0) {
        return res.status(400).json({ message: 'No se encontraron alumnos para asignar el cobro' });
      }

      const paymentsToCreate = targetStudentIds.map(sid => ({
        tenantId,
        estudianteId: sid,
        tariffId: tariff._id,
        concepto: tariff.name,
        amount: tariff.amount,
        currency: tariff.currency || 'CLP',
        estado: 'pendiente',
        fechaVencimiento: dueDate ? new Date(dueDate) : new Date(),
        metadata: { ...metadata, bulkAssign: true }
      }));

      const result = await Payment.insertMany(paymentsToCreate);

      res.status(201).json({
        message: `Se han generado ${result.length} cobros exitosamente.`,
        count: result.length
      });

    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async getDebtStats(req, res) {
    try {
      await connectDB();
      const { courseId } = req.query;
      const tenantId = req.user.tenantId;

      const matchStage = {
        tenantId: new mongoose.Types.ObjectId(tenantId),
        estado: { $ne: 'pagado' }
      };

      if (courseId) {
        const Enrollment = await import('../models/enrollmentModel.js').then(m => m.default);
        const enrollments = await Enrollment.find({ courseId: courseId, tenantId: tenantId }).select('estudianteId');
        const studentIds = enrollments.map(e => e.estudianteId);
        matchStage.estudianteId = { $in: studentIds };
      }

      const stats = await Payment.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$currency',
            totalDebt: { $sum: '$amount' },
            count: { $sum: 1 },
            overdueCount: {
              $sum: {
                $cond: [{ $eq: ["$estado", 'vencido'] }, 1, 0]
              }
            }
          }
        }
      ]);

      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async getStudentTotalDebt(req, res) {
    try {
      await connectDB();
      const { studentId } = req.params;
      const tenantId = req.user.tenantId;

      const unpaidPayments = await Payment.find({
        estudianteId: studentId,
        tenantId,
        estado: { $in: ['pendiente', 'vencido'] }
      }).populate('tariffId', 'name');

      const totalDebt = unpaidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

      res.json({
        studentId,
        totalDebt,
        details: unpaidPayments.map(p => ({
          id: p._id,
          concepto: p.tariffId?.name || p.concepto || 'Otro',
          amount: p.amount,
          estado: p.estado,
          fechaVencimiento: p.fechaVencimiento
        }))
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async processCashPayment(req, res) {
    try {
      await connectDB();
      const { id } = req.params;
      const tenantId = req.user.tenantId;

      const payment = await Payment.findOne({ _id: id, tenantId });
      if (!payment) return res.status(404).json({ message: 'Cobro no encontrado' });

      payment.estado = 'pagado';
      payment.metodoPago = 'efectivo';
      payment.fechaPago = new Date();
      payment.metadata = { ...payment.metadata, processedBy: req.user._id, officePayment: true };

      await payment.save();

      res.json(payment);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default PaymentController;
