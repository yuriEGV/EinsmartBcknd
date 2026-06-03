// src/controllers/authController.js — PostgreSQL version
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Tenant, AuditLog } from '../models/pgModels.js';
import { query } from '../config/db.js';
import { sendPasswordRecoveryEmail } from '../services/emailService.js';
import * as tokenStore from '../utils/tokenStore.js';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

function sanitizeUser(u) {
    if (!u) return null;
    const { password_hash, session_token, ...rest } = u;
    return rest;
}

// ── Registro ────────────────────────────────────────────────
async function registrar(req, res) {
    try {
        const { name, email, password, role = 'student', tenantId, rut, specialization } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Nombre, email y contraseña son requeridos' });
        }
        const tid = tenantId || req.user?.tenantId;
        if (!tid) return res.status(400).json({ message: 'tenantId requerido' });

        const exists = await User.findOne({ email: email.toLowerCase().trim(), tenant_id: tid });
        if (exists) return res.status(400).json({ message: 'Email ya registrado' });

        const password_hash = await bcrypt.hash(password, 10);
        const user = await User.create({
            tenant_id: tid, name, email: email.toLowerCase().trim(),
            password_hash, role, rut, specialization
        });
        return res.status(201).json({ message: 'Usuario creado', user: sanitizeUser(user) });
    } catch (err) {
        return res.status(500).json({ message: 'Error al registrar', error: err.message });
    }
}

// ── Login ────────────────────────────────────────────────────
async function login(req, res) {
    try {
        const { email, password, rut } = req.body;
        let user = null;

        // Find by email or rut
        if (email) {
            const r = await query(
                `SELECT u.*, t.academic_year FROM users u
                 JOIN tenants t ON t.id = u.tenant_id
                 WHERE u.email = $1 LIMIT 1`,
                [email.toLowerCase().trim()]
            );
            user = r.rows[0] || null;
        } else if (rut) {
            const r = await query(
                `SELECT u.*, t.academic_year FROM users u
                 JOIN tenants t ON t.id = u.tenant_id
                 WHERE u.rut = $1 LIMIT 1`,
                [rut.trim()]
            );
            user = r.rows[0] || null;
        }

        if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });

        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) return res.status(401).json({ message: 'Credenciales inválidas' });

        const token = jwt.sign(
            { userId: user.id, role: user.role, tenantId: user.tenant_id,
              academicYear: user.academic_year || 2026 },
            JWT_SECRET, { expiresIn: JWT_EXPIRES_IN }
        );

        // Audit
        try {
            await AuditLog.create({
                tenant_id: user.tenant_id, user_id: user.id,
                action: 'login', entity: 'users', entity_id: user.id,
                details: { email: user.email }
            });
        } catch (_) {}

        return res.json({ message: 'Inicio de sesión exitoso', user: sanitizeUser(user), token });
    } catch (err) {
        return res.status(500).json({ message: 'Error al iniciar sesión', error: err.message });
    }
}

// ── Perfil ───────────────────────────────────────────────────
async function obtenerPerfil(req, res) {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
        return res.json({ user: sanitizeUser(user) });
    } catch (err) {
        return res.status(500).json({ message: 'Error al obtener perfil', error: err.message });
    }
}

async function actualizarPerfil(req, res) {
    try {
        const { name, email, password } = req.body;
        const updates = {};
        if (name) updates.name = name;
        if (email) updates.email = email.toLowerCase().trim();
        if (password) updates.password_hash = await bcrypt.hash(password, 10);
        if (!Object.keys(updates).length) {
            return res.status(400).json({ message: 'No hay datos para actualizar' });
        }
        const user = await User.updateById(req.user.userId, updates);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
        return res.json({ message: 'Perfil actualizado', user: sanitizeUser(user) });
    } catch (err) {
        return res.status(500).json({ message: 'Error al actualizar perfil', error: err.message });
    }
}

// ── Recuperar contraseña ─────────────────────────────────────
async function recuperarPassword(req, res) {
    try {
        const { email, rut } = req.body;
        let user = null;
        if (email) user = await User.findOne({ email: email.toLowerCase().trim() });
        else if (rut) user = await User.findOne({ rut: rut.trim() });
        else return res.status(400).json({ message: 'Email o RUT requerido' });

        if (!user || !user.email) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        const token = jwt.sign({ userId: user.id, type: 'recovery' }, JWT_SECRET, { expiresIn: '15m' });
        await sendPasswordRecoveryEmail(user.email, token);
        return res.json({ message: 'Correo de recuperación enviado' });
    } catch (err) {
        return res.status(500).json({ message: 'Error al recuperar contraseña', error: err.message });
    }
}

async function resetPassword(req, res) {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ message: 'Token y nueva contraseña requeridos' });
        }
        const payload = jwt.verify(token, JWT_SECRET);
        if (payload.type !== 'recovery') {
            return res.status(400).json({ message: 'Token inválido' });
        }
        const password_hash = await bcrypt.hash(newPassword, 10);
        await User.updateById(payload.userId, { password_hash });
        return res.json({ message: 'Contraseña actualizada correctamente' });
    } catch (_) {
        return res.status(400).json({ message: 'Token inválido o expirado' });
    }
}

async function cambiarPassword(req, res) {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
        const ok = await bcrypt.compare(currentPassword, user.password_hash);
        if (!ok) return res.status(401).json({ message: 'Contraseña actual incorrecta' });
        await User.updateById(user.id, {
            password_hash: await bcrypt.hash(newPassword, 10),
            must_change_password: false
        });
        return res.json({ message: 'Contraseña actualizada correctamente' });
    } catch (err) {
        return res.status(500).json({ message: 'Error al cambiar contraseña', error: err.message });
    }
}

function invalidateToken(req, res) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(400).json({ message: 'No se proporcionó token' });
    tokenStore.add(token);
    return res.json({ message: 'Token invalidado correctamente' });
}

async function forceSeedYuriAdmin(req, res) {
    try {
        const tenants = await Tenant.find({});
        if (!tenants.length) return res.json({ message: 'No hay colegios creados' });
        const password_hash = await bcrypt.hash('123456', 10);
        for (const tenant of tenants) {
            const exists = await User.findOne({ email: 'yuri@einsmart.cl', tenant_id: tenant.id });
            if (exists) {
                await User.updateById(exists.id, { password_hash, role: 'admin', must_change_password: false });
            } else {
                await User.create({
                    tenant_id: tenant.id, name: 'Yuri Admin',
                    email: 'yuri@einsmart.cl', rut: '11.222.333-4',
                    password_hash, role: 'admin', must_change_password: false
                });
            }
        }
        return res.json({ message: `Admin Yuri configurado en ${tenants.length} colegio(s). Pass: 123456` });
    } catch (err) {
        return res.status(500).json({ message: 'Error', error: err.message });
    }
}

export {
    registrar, login, obtenerPerfil, actualizarPerfil, invalidateToken,
    recuperarPassword, resetPassword, cambiarPassword, forceSeedYuriAdmin
};
