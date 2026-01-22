import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },

  estudianteId: {
    type: mongoose.Types.ObjectId,
    ref: 'Estudiante',
    required: true
  },

  apoderadoId: {
    type: mongoose.Types.ObjectId,
    ref: 'Apoderado'
  },

  tariffId: {
    type: mongoose.Types.ObjectId,
    ref: 'Tariff',
    required: true
  },

  concepto: {
    type: String,
    required: true
  },

  amount: {                     // ✅ ESTE ES EL CAMPO REAL
    type: Number,
    required: true
  },

  metodoPago: {
    type: String,
    enum: ['transferencia', 'mercadopago', 'efectivo'],
    required: true
  },

  estado: {
    type: String,
    enum: ['pendiente', 'pagado', 'vencido'],
    default: 'pendiente'
  },

  fechaVencimiento: {
    type: Date
  }

}, { timestamps: true });

export default mongoose.model('Payment', paymentSchema);
