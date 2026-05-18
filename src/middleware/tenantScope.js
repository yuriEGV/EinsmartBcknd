function tenantScope(req, res, next) {
    const requestedTenantId = req.headers['x-tenant-id'];
    const userTenantId = req.user && req.user.tenantId;
    
    // Check if user is a global administrator
    const userRole = (req.user && req.user.role) ? req.user.role.toLowerCase() : '';
    const isSuperAdmin = userRole === 'superadmin' || userRole === 'fiscalizador' || (userRole === 'admin' && req.user.email === 'yuri@einsmart.cl');

    let finalTenantId = userTenantId;

    if (requestedTenantId && requestedTenantId !== 'null' && requestedTenantId !== 'undefined') {
        if (isSuperAdmin || requestedTenantId === userTenantId) {
            finalTenantId = requestedTenantId;
        } else {
            return res.status(403).json({ message: 'No autorizado para acceder a esta institución' });
        }
    }

    if (!finalTenantId) {
        return res.status(400).json({ message: 'Tenant requerido' });
    }
    
    req.tenantId = finalTenantId;
    return next();
}

export default tenantScope;
