import Tenant from '../models/tenantModel.js';
import User from '../models/userModel.js';
import bcrypt from 'bcryptjs';
import connectDB from '../config/db.js';
import { sendEmail } from '../services/emailService.js';

class TenantController {

    // Create a new tenant
    static async createTenant(req, res) {
        try {
            await connectDB(); // 🔥 NECESARIO

            const { name, domain, theme, sostenedor } = req.body;

            if (!name || !sostenedor || !sostenedor.email || !sostenedor.name) {
                return res.status(400).json({
                    message: "Los campos 'name' de la institución y los datos del sostenedor (email, name) son obligatorios"
                });
            }

            const tenant = new Tenant({
                name,
                domain: domain || null,
                theme: theme || {}
            });

            await tenant.save();

            // Create Sostenedor User
            const genericPassword = Math.random().toString(36).slice(-8);
            const passwordHash = await bcrypt.hash(genericPassword, 10);

            const user = await User.create({
                tenantId: tenant._id,
                name: sostenedor.name,
                email: sostenedor.email.toLowerCase().trim(),
                passwordHash,
                role: 'sostenedor',
                mustChangePassword: true
            });

            // Send Welcome Email
            const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2 style="color: #11355a;">Bienvenido a Maritimo 4.0</h2>
                    <p>Hola <strong>${sostenedor.name}</strong>,</p>
                    <p>Se ha creado exitosamente la institución <strong>${name}</strong>.</p>
                    <p>Aquí tienes tus credenciales de acceso como Sostenedor:</p>
                    <div style="background-color: #f4f4f4; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Usuario/Email:</strong> ${sostenedor.email}</p>
                        <p style="margin: 5px 0;"><strong>Contraseña Temporal:</strong> ${genericPassword}</p>
                    </div>
                    <p>Por seguridad, se te pedirá cambiar esta contraseña al iniciar sesión.</p>
                    <a href="${loginUrl}" style="background-color: #11355a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Iniciar Sesión</a>
                    <p style="margin-top: 20px; font-size: 12px; color: #777;">Si tienes alguna duda, contacta al soporte técnico.</p>
                </div>
            `;

            try {
                await sendEmail(sostenedor.email, `Bienvenido a ${name} - Acceso Sostenedor`, emailHtml);
            } catch (emailErr) {
                console.error('Error sending welcome email:', emailErr);
                // We don't fail the whole request if email fails, but maybe we should log it.
            }

            return res.status(201).json({
                message: "Institución y Sostenedor creados exitosamente",
                tenant,
                user: {
                    id: user._id,
                    email: user.email,
                    role: user.role
                }
            });

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
