/*import jwt from 'jsonwebtoken';
import * as tokenStore from '../utils/tokenStore.js';

function authMiddleware(req, res, next) {
    let token = null;

    // 1. Intentar obtener desde Header Authorization
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    // 2. Si no hay token válido en header (o es 'null'), intentar desde Cookies
    if ((!token || token === 'null') && req.headers.cookie) {
        const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
            const [name, value] = cookie.trim().split('=');
            acc[name] = value;
            return acc;
        }, {});

        if (cookies.token) {
            token = cookies.token;
        }
    }

    // 🔒 Validación final: Debe existir un token
    if (!token || token.trim() === '' || token === 'null') {
        return res.status(401).json({ message: 'Token requerido' });
    }

    // 🔒 3. Revisar si el token está invalidado
    if (tokenStore.has(token)) {
        return res.status(401).json({ message: 'Token invalidado' });
    }

    try {
        // 🔒 4. Validar token
        const secret = process.env.JWT_SECRET || 'tu_clave_secreta';
        const payload = jwt.verify(token, secret);

        // Añadir usuario al request
        req.user = payload;

        return next();

    } catch (err) {
        return res.status(401).json({ message: 'Token inválido' });
    }
}

export default authMiddleware;

// 🔒 Middleware para roles
export const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'No tienes permisos' });
        }
        next();
    };
};*/

import jwt from 'jsonwebtoken';
import * as tokenStore from '../utils/tokenStore.js';

function authMiddleware(req, res, next) {
    let token;

    /* =====================================================
       1. Obtener token desde Authorization header
    ===================================================== */
    const authHeader = req.headers.authorization;

    if (authHeader) {
        // Handle possible duplicate headers (comma separated string)
        const parts = authHeader.split(',');
        for (const part of parts) {
            if (part.trim().startsWith('Bearer ')) {
                const extracted = part.trim().split(' ')[1];
                if (extracted && extracted !== 'null' && extracted !== 'undefined') {
                    token = extracted;
                    break;
                }
            }
        }
    }

    /* =====================================================
       2. Fallback: obtener token desde cookies
    ===================================================== */
    if (!token && req.headers.cookie) {
        const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
            const [name, value] = cookie.trim().split('=');
            acc[name] = value;
            return acc;
        }, {});

        if (cookies.token && cookies.token !== 'null') {
            token = cookies.token;
        }
    }

    /* =====================================================
       3. Validación final: token requerido
    ===================================================== */
    if (!token) {
        return res.status(401).json({ message: 'Token requerido' });
    }

    /* =====================================================
       4. Token invalidado (logout / blacklist)
    ===================================================== */
    if (tokenStore.has(token)) {
        return res.status(401).json({ message: 'Token invalidado' });
    }

    /* =====================================================
       5. Verificación JWT
    ===================================================== */
    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET no definido');
        }

        const payload = jwt.verify(token, secret);

        // Adjuntar usuario al request
        req.user = payload;

        next();

    } catch (error) {
        return res.status(401).json({ message: 'Token inválido o expirado' });
    }
}

export default authMiddleware;

/* =====================================================
   Middleware de autorización por roles
===================================================== */
export const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({ message: 'No tienes permisos' });
        }
        
        const userRole = req.user.role.toLowerCase();
        const allowedRoles = roles.map(r => r.toLowerCase());

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ message: 'No tienes permisos' });
        }
        next();
    };
};

