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

            const finalName =
                name || (apellido ? `${nombre} ${apellido}` : nombre);

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
                paradocente: 'paradocente'
            };

            const finalRole = roleMap[rol || role];
            if (!finalRole) {
                return res.status(400).json({ message: 'Rol inválido' });
            }

            const normalizedEmail = email.toLowerCase().trim();

            const existingUser = await User.findOne({
                email: normalizedEmail,
                tenantId: req.user.tenantId
            });

            if (existingUser) {
                return res.status(409).json({ message: 'El usuario ya existe' });
            }

            // [NEW] Enforce only one director per school (tenant)
            if (finalRole === 'director') {
                const existingDirector = await User.findOne({
                    tenantId: req.user.tenantId,
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

            // SuperAdmin can override tenantId from body
            const tenantId = (req.user.role === 'admin' && req.body.tenantId)
                ? req.body.tenantId
                : req.user.tenantId;

            const user = await User.create({
                tenantId,
                name: finalName,
                email: normalizedEmail,
                passwordHash,
                role: finalRole,
                specialization
            });

            res.status(201).json(user);

        } catch (error) {
            res.status(400).json({ message: error.message });
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
                    paradocente: 'paradocente'
                };

                const newRole = roleMap[req.body.role || req.body.rol];
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
}

export default UserController;
