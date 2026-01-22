import Tariff from '../models/tariffModel.js';

class TariffController {
  static async createTariff(req, res) {
    try {
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
      const query = (req.user.role === 'admin')
        ? {}
        : { tenantId: req.user.tenantId };

      const tariffs = await Tariff.find(query).sort({ createdAt: -1 });
      res.status(200).json(tariffs);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async getTariff(req, res) {
    try {
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
