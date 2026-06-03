// src/middleware/authMiddleware.js — PostgreSQL version
import jwt from 'jsonwebtoken';
import * as tokenStore from '../utils/tokenStore.js';
import { User } from '../models/pgModels.js';

async function authMiddleware(req, res, next) {
    let token;

    // 1. Extraer token del header Authorization
    const authHeader = req.headers.authorization;
    if (authHeader) {
        for (const part of authHeader.split(',')) {
            if (part.trim().startsWith('Bearer ')) {
                const extracted = part.trim().split(' ')[1];
                if (extracted && extracted !== 'null' && extracted !== 'undefined') {
                    token = extracted; break;
                }
            }
        }
    }

    // 2. Fallback: cookies
    if (!token && req.headers.cookie) {
        const cookies = req.headers.cookie.split(';').reduce((acc, c) => {
            const [k, v] = c.trim().split('=');
            acc[k] = v; return acc;
        }, {});
        if (cookies.token && cookies.token !== 'null') token = cookies.token;
    }

    if (!token) return res.status(401).json({ message: 'Token requerido' });
    if (tokenStore.has(token)) return res.status(401).json({ message: 'Token invalidado' });

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        // Verificar que el usuario existe
        const user = await User.findById(payload.userId);
        if (!user) return res.status(401).json({ message: 'Usuario no existe' });
        req.user = payload;
        next();
    } catch {
        return res.status(401).json({ message: 'Token inválido o expirado' });
    }
}

export default authMiddleware;

export const authorizeRoles = (...roles) => (req, res, next) => {
    if (!req.user?.role) return res.status(403).json({ message: 'Sin permisos' });
    const allowed = roles.map(r => r.toLowerCase());
    if (!allowed.includes(req.user.role.toLowerCase()))
        return res.status(403).json({ message: 'Sin permisos' });
    next();
};
