import User from '../models/userModel.js';
import bcrypt from 'bcryptjs';

class UserController {

    /* =====================================================
       CREATE USER
    ===================================================== */
    static async createUser(req, res) {
        try {
            const {
                nombre,
                apellido,
                name,
                email,
                password,
                rol,
                role
            } = req.body;

            const finalName = name || (apellido ? `${nombre} ${apellido}` : nombre);

            if (!finalName || !email || !password || !(rol || role)) {
                return res.status(400).json({
                    message: 'Nombre, email, password y rol son obligatorios'
                });
            }

            const roleMap = {
                admin: 'admin',
                administrador: 'admin',
                sostenedor: 'sostenedor',
                director: 'director',
                director_academico: 'director',
                profesor: 'teacher',
                teacher: 'teacher',
                alumno: 'student',
                student: 'student',
                apoderado: 'apoderado',
                guardian: 'apoderado',
                psicologo: 'psicologo',
                orientador: 'orientador',
                asistente_aula: 'asistente_aula',
                manipulador_alimento: 'manipulador_alimento',
                bibliotecario: 'bibliotecario',
                secretario: 'secretario',
                paradocente: 'paradocente',
                utp: 'utp',
                jefe_utp: 'utp',
                inspector_general: 'inspector_general',
                'inspector general': 'inspector_general',
                trabajador_social: 'trabajador_social',
                'trabajador social': 'trabajador_social',
                psicopedagogo: 'psicopedagogo',
                auxiliar: 'auxiliar',
                vigilante: 'vigilante',
                administrativo: 'administrativo'
            };

            const rawRole = rol || role;
            const finalRole = roleMap[rawRole ? rawRole.toLowerCase() : ''];
            if (!finalRole) {
                return res.status(400).json({ message: `Rol inválido proporcionado: ${rawRole}` });
            }

            const normalizedEmail = email.toLowerCase().trim();

            // SuperAdmin can override tenantId from body
            const targetTenantId = (req.user.role === 'admin' && req.body.tenantId)
                ? req.body.tenantId
                : req.user.tenantId;

            if (!targetTenantId) {
                return res.status(400).json({ message: 'No se pudo determinar el colegio (tenantId) de destino para este usuario.' });
            }

            const existingUser = await User.findOne({
                email: normalizedEmail,
                tenantId: targetTenantId
            });

            if (existingUser) {
                return res.status(409).json({ message: `El correo ${normalizedEmail} ya está registrado en la institución seleccionada.` });
            }

            // [NEW] Enforce only one director per school (tenant)
            if (finalRole === 'director') {
                const existingDirector = await User.findOne({
                    tenantId: targetTenantId,
                    role: 'director'
                });
                if (existingDirector) {
                    return res.status(400).json({
                        message: 'Ya existe un usuario con el rol de Director para este colegio. Si desea cambiarlo, por favor edite el usuario existente o elimínelo antes de crear uno nuevo.'
                    });
                }
            }

            const passwordHash = await bcrypt.hash(password, 10);
            const specialization = req.body.specialization || req.body.especialidad;

            const user = await User.create({
                tenantId: targetTenantId,
                name: finalName,
                email: normalizedEmail,
                passwordHash,
                role: finalRole,
                specialization,
                mustChangePassword: finalRole === 'teacher',
                mustChangePin: finalRole === 'teacher'
            });

            // [NUEVO] Notificar a Directores/Sostenedores sobre el nuevo personal
            if (['teacher', 'psicologo', 'orientador', 'secretario', 'asistente_aula'].includes(finalRole)) {
                try {
                    const NotificationService = await import('../services/notificationService.js').then(m => m.default);
                    await NotificationService.broadcastToAdmins({
                        tenantId: targetTenantId,
                        title: 'Nuevo Personal Registrado',
                        message: `Se ha registrado a ${finalName} con el rol de ${finalRole}.`,
                        type: 'system',
                        link: `/users/${user._id}`
                    });
                } catch (notifyErr) {
                    console.error('Error broadcasting user notification:', notifyErr);
                }
            }

            // Notify new teacher to change PIN and password
            if (finalRole === 'teacher') {
                try {
                    const NotificationService = await import('../services/notificationService.js').then(m => m.default);
                    await NotificationService.createNotification({
                        userId: user._id,
                        tenantId: targetTenantId,
                        title: 'Cambio de Credenciales Requerido',
                        message: 'Por seguridad, debe cambiar su contraseña y PIN de firma digital en su perfil.',
                        type: 'warning',
                        link: '/profile'
                    });
                } catch (notifyErr) {
                    console.error('Error creating teacher notification:', notifyErr);
                }
            }

            res.status(201).json(user);

        } catch (error) {
            console.error('Mongoose Create Error:', error);
            // Catch E11000 duplicated keys specifically
            if (error.code === 11000) {
                return res.status(400).json({ message: `El usuario ya existe (RUT o Correo duplicado en la base de datos).` });
            }
            res.status(400).json({ message: `Error al crear usuario: ${error.message}` });
        }
    }

    /* =====================================================
       GET USERS (solo tenant actual)
    ===================================================== */
    /* =====================================================
       GET USERS (Filtrable por tenant/rol)
    ===================================================== */
    static async getUsers(req, res) {
        try {
            const query = {};

            // 1. Tenant Filter
            if (req.user.role === 'admin') {
                // SuperAdmin can filter by any tenantId if provided in query
                if (req.query.tenantId) {
                    query.tenantId = req.query.tenantId;
                }
                // If not provided, they see all (default) or we could force own tenant? 
                // Let's keep it open for admin dashboard, but filtered if params exist.
            } else {
                // Non-admins strictly locked to their tenant
                query.tenantId = req.user.tenantId;
            }

            // 2. Role Filter (e.g. ?role=teacher)
            if (req.query.role) {
                // Map frontend roles to backend roles if needed, or assume backend values
                // 'profesor' -> 'teacher' mapping if necessary
                const roleMap = {
                    'profesor': 'teacher',
                    'alumno': 'student',
                    'apoderado': 'apoderado'
                };
                query.role = roleMap[req.query.role] || req.query.role;
            }

            const users = await User.find(query).select('-passwordHash');

            res.status(200).json(users);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    /* =====================================================
       GET USER BY ID (seguro multi-tenant)
    ===================================================== */
    static async getUserById(req, res) {
        try {
            const user = await User.findOne({
                _id: req.params.id,
                tenantId: req.user.tenantId
            }).select('-passwordHash');

            if (!user) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }

            res.status(200).json(user);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    /* =====================================================
       UPDATE USER
    ===================================================== */
    static async updateUser(req, res) {
        try {
            const updateData = {};

            if (req.body.name || req.body.nombre) {
                updateData.name = req.body.name || req.body.nombre;
            }

            if (req.body.email) {
                updateData.email = req.body.email.toLowerCase().trim();
            }

            if (req.body.password) {
                updateData.passwordHash = await bcrypt.hash(req.body.password, 10);
            }

            if (req.body.specialization || req.body.especialidad) {
                updateData.specialization = req.body.specialization || req.body.especialidad;
            }

            if (req.body.role || req.body.rol) {
                const roleMap = {
                    admin: 'admin',
                    administrador: 'admin',
                    profesor: 'teacher',
                    teacher: 'teacher',
                    alumno: 'student',
                    student: 'student',
                    sostenedor: 'sostenedor',
                    director: 'director',
                    director_academico: 'director',
                    apoderado: 'apoderado',
                    guardian: 'apoderado',
                    psicologo: 'psicologo',
                    orientador: 'orientador',
                    asistente_aula: 'asistente_aula',
                    manipulador_alimento: 'manipulador_alimento',
                    bibliotecario: 'bibliotecario',
                    secretario: 'secretario',
                    paradocente: 'paradocente',
                    utp: 'utp',
                    jefe_utp: 'utp',
                    inspector_general: 'inspector_general',
                    'inspector general': 'inspector_general',
                    trabajador_social: 'trabajador_social',
                    'trabajador social': 'trabajador_social',
                    psicopedagogo: 'psicopedagogo',
                    auxiliar: 'auxiliar',
                    vigilante: 'vigilante',
                    administrativo: 'administrativo'
                };

                const rawRole = req.body.role || req.body.rol;
                const newRole = roleMap[rawRole ? rawRole.toLowerCase() : ''];
                if (!newRole) {
                    return res.status(400).json({ message: 'Rol inválido' });
                }

                updateData.role = newRole;
            }

            const query = { _id: req.params.id };
            if (req.user.role !== 'admin') {
                query.tenantId = req.user.tenantId;
            }

            const user = await User.findOneAndUpdate(
                query,
                updateData,
                { new: true }
            ).select('-passwordHash');

            if (!user) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }

            res.status(200).json(user);

        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    /* =====================================================
       DELETE USER
    ===================================================== */
    static async deleteUser(req, res) {
        try {
            const query = { _id: req.params.id };
            if (req.user.role !== 'admin') {
                query.tenantId = req.user.tenantId;
            }

            const user = await User.findOneAndDelete(query);

            if (!user) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }

            res.status(204).send();
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    /* =====================================================
       RESET PROFILE PASSWORD (FORCED)
    ===================================================== */
    static async resetProfilePassword(req, res) {
        try {
            const { password } = req.body;
            if (!password) {
                return res.status(400).json({ message: 'La nueva contraseña es obligatoria' });
            }

            const passwordHash = await bcrypt.hash(password, 10);
            const user = await User.findByIdAndUpdate(
                req.user.userId,
                {
                    passwordHash,
                    mustChangePassword: false
                },
                { new: true }
            );

            if (!user) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }

            res.status(200).json({ message: 'Contraseña actualizada correctamente' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    /* =====================================================
       RESET PASSWORD BY ADMIN (FOR OTHER USERS)
    ===================================================== */
    static async resetPasswordAdmin(req, res) {
        try {
            const { id } = req.params;
            const { password } = req.body;

            if (!password) {
                return res.status(400).json({ message: 'La nueva contraseña es obligatoria' });
            }

            // Verify user belongs to the same tenant (unless superadmin)
            const query = { _id: id };
            if (req.user.role !== 'admin') {
                query.tenantId = req.user.tenantId;
            }

            const targetUser = await User.findOne(query);
            if (!targetUser) {
                return res.status(404).json({ message: 'Usuario a restablecer no encontrado' });
            }

            const passwordHash = await bcrypt.hash(password, 10);

            targetUser.passwordHash = passwordHash;
            // Force the user to change this temporary administrative password on next login
            targetUser.mustChangePassword = true;

            await targetUser.save();

            res.status(200).json({ message: 'Contraseña del usuario reestablecida y requerirá cambio al iniciar sesión.' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    /* =====================================================
       UPDATE PIN
    ===================================================== */
    static async updatePin(req, res) {
        try {
            const { currentPin, newPin, confirmPin } = req.body;

            if (!currentPin || !newPin || !confirmPin) {
                return res.status(400).json({ message: 'Todos los campos son obligatorios' });
            }

            if (newPin !== confirmPin) {
                return res.status(400).json({ message: 'Los PINs no coinciden' });
            }

            // Validate PIN format (4 digits)
            if (!/^\d{4}$/.test(newPin)) {
                return res.status(400).json({ message: 'El PIN debe ser de 4 dígitos' });
            }

            // Reject sequential PINs
            const sequential = ['0123', '1234', '2345', '3456', '4567', '5678', '6789', '7890',
                '9876', '8765', '7654', '6543', '5432', '4321', '3210'];
            if (sequential.includes(newPin)) {
                return res.status(400).json({ message: 'No puede usar PINs secuenciales' });
            }

            const user = await User.findById(req.user.userId);
            if (!user) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }

            // Verify current PIN
            if (user.signaturePin !== currentPin) {
                return res.status(401).json({ message: 'PIN actual incorrecto' });
            }

            // Update PIN
            user.signaturePin = newPin;
            user.mustChangePin = false;
            await user.save();

            res.status(200).json({ message: 'PIN actualizado correctamente' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    /* =====================================================
       BULK DELETE USERS
    ===================================================== */
    static async bulkDeleteUsers(req, res) {
        try {
            const { ids } = req.body;

            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ message: 'Se requiere un array de IDs para eliminar' });
            }

            const query = { _id: { $in: ids } };
            if (req.user.role !== 'admin') {
                query.tenantId = req.user.tenantId;
            }

            const result = await User.deleteMany(query);

            res.status(200).json({
                message: `${result.deletedCount} usuarios eliminados correctamente`,
                deletedCount: result.deletedCount
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export default UserController;
