import Tariff from '../models/tariffModel.js';
import connectDB from '../config/db.js';

class TariffController {
  static async createTariff(req, res) {
    try {
      await connectDB();
      const { name, description, amount, currency, active } = req.body;

      const tariff = new Tariff({
        tenantId: req.user.tenantId,
        name,
        description,
        amount,
        currency: currency || 'CLP',
        active: active ?? true,
      });

      await tariff.save();
      res.status(201).json(tariff);
    } catch (error) {
      console.error('Error crear tarifa:', error);
      res.status(500).json({ message: error.message });
    }
  }

  static async listTariffs(req, res) {
    try {
      await connectDB();
      const tid = req.user.tenantId;
      const query = (req.user.role === 'admin') ? {} : { tenantId: tid };

      let tariffs = await Tariff.find(query).sort({ createdAt: -1 });

      // Seeding defaults if empty for this tenant (Any educational role can trigger this to avoid empty UI)
      if (tariffs.length === 0 && tid && (['sostenedor', 'admin', 'teacher'].includes(req.user.role))) {
        const defaults = [
          { tenantId: tid, name: 'Matrícula Anual', description: 'Costo de incorporación y registro', amount: 80000, currency: 'CLP', active: true },
          { tenantId: tid, name: 'Mensualidad (Colegiatura)', description: 'Pago mensual por servicios educativos', amount: 150000, currency: 'CLP', active: true },
          { tenantId: tid, name: 'Seguro Escolar', description: 'Cobertura de accidentes anual', amount: 25000, currency: 'CLP', active: true }
        ];
        tariffs = await Tariff.insertMany(defaults);
      }

      res.status(200).json(tariffs);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async getTariff(req, res) {
    try {
      await connectDB();
      const tariff = await Tariff.findOne({
        _id: req.params.id,
        tenantId: req.user.tenantId,
      });

      if (!tariff) return res.status(404).json({ message: 'Tarifa no encontrada' });

      res.status(200).json(tariff);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async updateTariff(req, res) {
    try {
      await connectDB();
      const tariff = await Tariff.findOneAndUpdate(
        { _id: req.params.id, tenantId: req.user.tenantId },
        req.body,
        { new: true }
      );

      if (!tariff) return res.status(404).json({ message: 'Tarifa no encontrada' });

      res.status(200).json(tariff);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  static async deleteTariff(req, res) {
    try {
      await connectDB();
      const tariff = await Tariff.findOneAndDelete({
        _id: req.params.id,
        tenantId: req.user.tenantId,
      });

      if (!tariff) return res.status(404).json({ message: 'Tarifa no encontrada' });

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default TariffController;
