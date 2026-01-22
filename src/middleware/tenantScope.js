function tenantScope(req, res, next) {
    const tenantId = req.headers['x-tenant-id'] || (req.user && req.user.tenantId);
    if (!tenantId) {
        return res.status(400).json({ message: 'Tenant requerido' });
    }
    req.tenantId = tenantId;
    return next();
}

export default tenantScope;


