import Message from '../models/messageModel.js';
import User from '../models/userModel.js';
import Alternancia from '../models/alternanciaModel.js';

class MessageController {
    static async sendMessage(req, res) {
        try {
            const { receiverId, content, subject } = req.body;
            const senderId = req.user.userId;
            const tenantId = req.user.tenantId;

            if (!receiverId || !content) {
                return res.status(400).json({ message: 'Receptor y contenido son obligatorios' });
            }

            // [SECURITY] Only staff can send messages (exclude students/guardians)
            const staffExcludedRoles = ['student', 'apoderado'];
            if (staffExcludedRoles.includes(req.user.role)) {
                return res.status(403).json({ message: 'No tienes permisos para enviar mensajes.' });
            }

            // [SECURITY] Validate that receiver belongs to the same tenant
            const receiver = await User.findById(receiverId);
            if (!receiver || receiver.tenantId?.toString() !== tenantId.toString()) {
                return res.status(403).json({ message: 'No se puede enviar mensajes a usuarios de otros colegios.' });
            }

            const message = new Message({
                tenantId,
                senderId,
                receiverId,
                content,
                subject
            });

            await message.save();
            res.status(201).json(message);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async getMessages(req, res) {
        try {
            const userId = req.user.userId;
            const messages = await Message.find({
                tenantId: req.user.tenantId,
                $or: [{ senderId: userId }, { receiverId: userId }]
            })
                .populate('senderId', 'name role')
                .populate('receiverId', 'name role')
                .sort({ createdAt: -1 });

            res.json(messages);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async getContacts(req, res) {
        try {
            // Only staff can search for other staff
            const staffExcludedRoles = ['student', 'apoderado'];
            if (staffExcludedRoles.includes(req.user.role)) {
                return res.json([]); // Return empty for students/guardians
            }

            if (req.user.role === 'tutor_empresa') {
                // Tutors see Career teachers, Supervisors, UTP and Director
                const myAlternancias = await Alternancia.find({ 
                    $or: [
                        { tutorId: req.user.userId },
                        { "maestroGuia.email": req.user.email }
                    ]
                }).populate('careerId');
                
                const careerTeacherIds = [];
                const supervisorIds = [];

                myAlternancias.forEach(alt => {
                    if (alt.careerId) {
                        if (alt.careerId.headTeacher) careerTeacherIds.push(alt.careerId.headTeacher);
                        if (alt.careerId.profesorJefe) careerTeacherIds.push(alt.careerId.profesorJefe);
                        if (alt.careerId.teachers) careerTeacherIds.push(...alt.careerId.teachers);
                    }
                    if (alt.profesorSupervisor) supervisorIds.push(alt.profesorSupervisor);
                });
                
                const users = await User.find({
                    $or: [
                        { _id: { $in: [...new Set([...careerTeacherIds, ...supervisorIds].map(id => id.toString()))] } },
                        { role: { $in: ['utp', 'director'] }, tenantId: req.user.tenantId }
                    ]
                }).select('name role email');

                return res.json(users);
            }
            
            const users = await User.find({
                tenantId: req.user.tenantId,
                _id: { $ne: req.user.userId },
                role: { $nin: staffExcludedRoles }
            }).select('name role email');

            res.json(users);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export default MessageController;
