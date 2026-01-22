/*import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import * as tokenStore from '../utils/tokenStore.js';

const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

function buildPayload(user) {
    return {
        userId: user._id,
        tenantId: user.tenantId,
        role: user.role
    };
}

function sanitizeUser(user) {
    return {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
    };
}

function generarToken(user) {
    return jwt.sign(buildPayload(user), JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

async function registrar(req, res) {
    try {
        const { name, email, password, role = 'teacher', tenantId } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Nombre, email y contraseña son obligatorios' });
        }

        if (!tenantId) {
            return res.status(400).json({ message: 'tenantId es obligatorio para registrar usuarios' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: 'El correo ya está registrado' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await User.create({
            name,
            email,
            passwordHash,
            role,
            tenantId
        });

        const token = generarToken(user);

        return res.status(201).json({
            message: 'Usuario registrado correctamente',
            user: sanitizeUser(user),
            token
        });
    } catch (error) {
        return res.status(500).json({ message: 'Error al registrar usuario', error: error.message });
    }
}

async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email y contraseña son obligatorios' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const token = generarToken(user);

        return res.json({
            message: 'Inicio de sesión exitoso',
            user: sanitizeUser(user),
            token
        });
    } catch (error) {
        return res.status(500).json({ message: 'Error al iniciar sesión', error: error.message });
    }
}

async function obtenerPerfil(req, res) {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        return res.json({ user: sanitizeUser(user) });
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener el perfil', error: error.message });
    }
}

async function actualizarPerfil(req, res) {
    try {
        const updates = {};
        const { name, email, password } = req.body;

        if (name) updates.name = name;
        if (email) updates.email = email;
        if (password) {
            updates.passwordHash = await bcrypt.hash(password, 10);
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: 'No se proporcionaron datos para actualizar' });
        }

        const user = await User.findByIdAndUpdate(req.user.userId, updates, { new: true });

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        return res.json({
            message: 'Perfil actualizado correctamente',
            user: sanitizeUser(user)
        });
    } catch (error) {
        return res.status(500).json({ message: 'Error al actualizar el perfil', error: error.message });
    }
}

function invalidateToken(req, res) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(400).json({ message: 'No se proporcionó token' });
    }

    tokenStore.add(token);

    return res.json({ message: 'Token invalidado correctamente' });
}

export {
    registrar,
    login,
    invalidateToken,
    obtenerPerfil,
    actualizarPerfil
};


*/

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import * as tokenStore from '../utils/tokenStore.js';

/* ===============================
   CONFIGURACIÓN JWT
================================ */
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

/* ===============================
   HELPERS
================================ */
function buildPayload(user) {
    return {
        userId: user._id,
        tenantId: user.tenantId,
        role: user.role
    };
}

function sanitizeUser(user) {
    return {
        _id: user._id,
        name: user.name,
        email: user.email,
        rut: user.rut,
        role: user.role,
        profileId: user.profileId,
        tenantId: user.tenantId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
    };
}

function generarToken(user) {
    return jwt.sign(buildPayload(user), JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN
    });
}

/* ===============================
   REGISTRO
================================ */
async function registrar(req, res) {
    try {
        const { name, email, rut, password, role = 'teacher', tenantId } = req.body;

        if (!name || (!email && !rut) || !password || !tenantId) {
            return res.status(400).json({
                message: 'Nombre, email/rut, contraseña y tenantId son obligatorios'
            });
        }

        const normalizedEmail = email ? email.toLowerCase().trim() : undefined;
        const normalizedRut = rut ? rut.toLowerCase().trim() : undefined;

        // Check uniqueness for both if provided
        const query = { $or: [] };
        if (normalizedEmail) query.$or.push({ email: normalizedEmail });
        if (normalizedRut) query.$or.push({ rut: normalizedRut });

        const existingUser = await User.findOne(query);
        if (existingUser) {
            return res.status(409).json({ message: 'El correo o RUT ya está registrado' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            email: normalizedEmail,
            rut: normalizedRut,
            passwordHash,
            role,
            tenantId
        });

        const token = generarToken(user);

        return res.status(201).json({
            message: 'Usuario registrado correctamente',
            user: sanitizeUser(user),
            token
        });

    } catch (error) {
        console.error('❌ Error en registro:', error);
        return res.status(500).json({
            message: 'Error al registrar usuario',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}

/* ===============================
   LOGIN
================================ */
async function login(req, res) {
    try {
        // Security check
        if (!JWT_SECRET) {
            return res.status(500).json({ message: 'Configuración del servidor incompleta' });
        }

        console.log('LOGIN BODY:', req.body); // [DEBUG]

        const { email, rut, password } = req.body;

        if ((!email && !rut) || !password) {
            return res.status(400).json({
                message: 'Email/RUT y contraseña son obligatorios'
            });
        }

        const normalizedEmail = email ? email.toLowerCase().trim() : undefined;
        const normalizedRut = rut ? rut.toLowerCase().trim() : undefined;

        let user;
        if (normalizedEmail) {
            user = await User.findOne({ email: normalizedEmail });
        } else if (normalizedRut) {
            user = await User.findOne({ rut: normalizedRut });
        }

        console.log('USER FOUND:', user ? (user.email || user.rut) : null); // [DEBUG]

        if (!user) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        console.log('PASSWORD MATCH:', isMatch); // [DEBUG]

        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const token = generarToken(user);

        return res.json({
            message: 'Inicio de sesión exitoso',
            user: sanitizeUser(user),
            token
        });

    } catch (error) {
        return res.status(500).json({
            message: 'Error al iniciar sesión',
            error: error.message
        });
    }
}

/* ===============================
   PERFIL
================================ */
async function obtenerPerfil(req, res) {
    try {
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        return res.json({ user: sanitizeUser(user) });

    } catch (error) {
        return res.status(500).json({
            message: 'Error al obtener el perfil',
            error: error.message
        });
    }
}

async function actualizarPerfil(req, res) {
    try {
        const updates = {};
        const { name, email, password } = req.body;

        if (name) updates.name = name;
        if (email) updates.email = email.toLowerCase().trim();
        if (password) {
            updates.passwordHash = await bcrypt.hash(password, 10);
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                message: 'No se proporcionaron datos para actualizar'
            });
        }

        const user = await User.findByIdAndUpdate(
            req.user.userId,
            updates,
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        return res.json({
            message: 'Perfil actualizado correctamente',
            user: sanitizeUser(user)
        });

    } catch (error) {
        return res.status(500).json({
            message: 'Error al actualizar el perfil',
            error: error.message
        });
    }
}

/* ===============================
   PASSWORD RECOVERY
================================ */
import { sendPasswordRecoveryEmail } from '../services/emailService.js';

async function recuperarPassword(req, res) {
    try {
        const { email, rut } = req.body;

        // Allow recovery by Email or RUT
        const query = {};
        if (email) query.email = email.toLowerCase().trim();
        else if (rut) query.rut = rut.toLowerCase().trim();
        else return res.status(400).json({ message: 'Email o RUT requerido' });

        const user = await User.findOne(query);

        if (!user || !user.email) {
            // Security: Don't reveal if user exists using 404, just say sent if format is valid.
            // But for now, returning 404 might be easier for debugging.
            return res.status(404).json({ message: 'Usuario no encontrado o sin email registrado' });
        }

        // Generate a recovery token (short lived)
        const token = jwt.sign(
            { userId: user._id, type: 'recovery' },
            JWT_SECRET,
            { expiresIn: '15m' }
        );

        await sendPasswordRecoveryEmail(user.email, token);

        return res.json({ message: 'Correo de recuperación enviado' });

    } catch (error) {
        console.error('Recover Password Error:', error);
        return res.status(500).json({ message: 'Error al procesar recuperación', error: error.message });
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
            return res.status(400).json({ message: 'Token inválido para recuperación' });
        }

        const user = await User.findById(payload.userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        user.passwordHash = await bcrypt.hash(newPassword, 10);
        await user.save();

        return res.json({ message: 'Contraseña actualizada correctamente' });

    } catch (error) {
        return res.status(400).json({ message: 'Token inválido o expirado' });
    }
}

function invalidateToken(req, res) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(400).json({ message: 'No se proporcionó token' });
    }

    tokenStore.add(token);

    return res.json({ message: 'Token invalidado correctamente' });
}

export {
    registrar,
    login,
    obtenerPerfil,
    actualizarPerfil,
    invalidateToken,
    recuperarPassword,
    resetPassword
};
