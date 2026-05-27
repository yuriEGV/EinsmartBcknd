import Career from '../models/careerModel.js';

export const verifyHeadTeacherOrHigher = async (req, res, next) => {
    try {
        const { role, userId, tenantId } = req.user;

        // Higher roles bypass this check
        if (['admin', 'sostenedor', 'director', 'utp'].includes(role)) {
            return next();
        }

        // If teacher, check if they are headTeacher or profesorJefe in any Career in this tenant
        if (role === 'teacher') {
            const isHeadTeacher = await Career.exists({
                tenantId: tenantId,
                $or: [
                    { headTeacher: userId },
                    { profesorJefe: userId }
                ]
            });

            if (isHeadTeacher) {
                return next();
            }
        }

        return res.status(403).json({ message: 'No tienes permisos. Debes ser profesor jefe (o superior) para realizar esta acción.' });
    } catch (error) {
        return res.status(500).json({ message: 'Error verificando permisos de profesor jefe.' });
    }
};
