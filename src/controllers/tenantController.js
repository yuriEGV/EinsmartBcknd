import Tenant from '../models/tenantModel.js';
import connectDB from '../config/db.js';

class TenantController {

    // Create a new tenant
    static async createTenant(req, res) {
        try {
            await connectDB(); // 🔥 NECESARIO

            const { name, domain } = req.body;

            if (!name) {
                return res.status(400).json({
                    message: "El campo 'name' es obligatorio"
                });
            }

            const tenant = new Tenant({
                name,
                domain: domain || null
            });

            await tenant.save();
            return res.status(201).json(tenant);

        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }

    // Get all tenants
    static async getTenants(req, res) {
        try {
            await connectDB(); // 🔥 NECESARIO

            const tenants = await Tenant.find();
            return res.status(200).json(tenants);

        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    // Get one tenant
    static async getTenantById(req, res) {
        try {
            await connectDB(); // 🔥 NECESARIO

            const tenant = await Tenant.findById(req.params.id);
            if (!tenant) {
                return res.status(404).json({ message: 'Institución no encontrada' });
            }
            return res.status(200).json(tenant);

        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    // Update
    static async updateTenant(req, res) {
        try {
            await connectDB(); // 🔥 NECESARIO

            const tenant = await Tenant.findByIdAndUpdate(
                req.params.id,
                req.body,
                { new: true }
            );

            if (!tenant) {
                return res.status(404).json({ message: 'Institución no encontrada' });
            }

            return res.status(200).json(tenant);

        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }

    // Delete
    static async deleteTenant(req, res) {
        try {
            await connectDB(); // 🔥 NECESARIO

            const tenant = await Tenant.findByIdAndDelete(req.params.id);

            if (!tenant) {
                return res.status(404).json({ message: 'Institución no encontrada' });
            }

            return res.status(204).send();

        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }
    // Get current user's tenant (Settings)
    static async getMyTenant(req, res) {
        try {
            await connectDB();
            const tenantId = req.user.tenantId;

            if (!tenantId) {
                return res.status(400).json({ message: 'Usuario no tiene institución asociada' });
            }

            const tenant = await Tenant.findById(tenantId);
            if (!tenant) {
                return res.status(404).json({ message: 'Institución no encontrada' });
            }

            return res.status(200).json(tenant);
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    // Update current user's tenant
    static async updateMyTenant(req, res) {
        try {
            await connectDB();
            const tenantId = req.user.tenantId;

            if (!tenantId) {
                return res.status(400).json({ message: 'Usuario no tiene institución asociada' });
            }

            const tenant = await Tenant.findByIdAndUpdate(
                tenantId,
                req.body,
                { new: true }
            );

            if (!tenant) {
                return res.status(404).json({ message: 'Institución no encontrada' });
            }

            return res.status(200).json(tenant);
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }
}

export default TenantController;
