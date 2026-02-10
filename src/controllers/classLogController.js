import ClassLog from '../models/classLogModel.js';
import Schedule from '../models/scheduleModel.js';
import mongoose from 'mongoose';

class ClassLogController {
    static async startClass(req, res) {
        try {
            const { courseId, subjectId } = req.body;

            // Find if there's an existing unsigned log for this course/subject today
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let log = await ClassLog.findOne({
                tenantId: req.user.tenantId,
                courseId,
                subjectId,
                teacherId: req.user.userId,
                date: { $gte: today },
                isSigned: false
            });

            if (log) {
                log.startTime = new Date();
                await log.save();
            } else {
                // Find matching schedule for current time and day
                const now = new Date();
                const dayOfWeek = now.getDay();
                const currentHour = now.getHours().toString().padStart(2, '0');
                const currentMin = now.getMinutes().toString().padStart(2, '0');
                const currentTimeStr = `${currentHour}:${currentMin}`;

                const schedule = await Schedule.findOne({
                    tenantId: req.user.tenantId,
                    courseId,
                    subjectId,
                    dayOfWeek,
                    startTime: { $lte: currentTimeStr },
                    endTime: { $gte: currentTimeStr }
                });

                log = new ClassLog({
                    tenantId: req.user.tenantId,
                    courseId,
                    subjectId,
                    teacherId: req.user.userId,
                    date: new Date(),
                    startTime: new Date(),
                    topic: 'Clase en curso...',
                    activities: '',
                    scheduleId: schedule ? schedule._id : undefined,
                    status: 'en_curso'
                });

                if (schedule) {
                    // Set planned times based on schedule
                    const [startH, startM] = schedule.startTime.split(':');
                    const [endH, endM] = schedule.endTime.split(':');

                    const plannedStart = new Date();
                    plannedStart.setHours(parseInt(startH), parseInt(startM), 0, 0);

                    const plannedEnd = new Date();
                    plannedEnd.setHours(parseInt(endH), parseInt(endM), 0, 0);

                    log.plannedStartTime = plannedStart;
                    log.plannedEndTime = plannedEnd;

                    // Calculate initial delay if started after planned start
                    const delayMs = log.startTime.getTime() - plannedStart.getTime();
                    if (delayMs > 0) {
                        log.delayMinutes = Math.round(delayMs / 60000);
                        log.status = 'atrasada';
                    }
                }

                await log.save();
            }

            res.status(200).json(log);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async create(req, res) {
        try {
            const { courseId, subjectId, date, topic, activities, objectives, startTime } = req.body;

            // If there's an existing draft log for this course/subject today, update it instead of creating
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let log = await ClassLog.findOne({
                tenantId: req.user.tenantId,
                courseId,
                subjectId,
                teacherId: req.user.userId,
                date: { $gte: today },
                isSigned: false
            });

            if (log) {
                log.topic = topic;
                log.activities = activities;
                log.objectives = objectives;
                if (startTime) log.startTime = new Date(startTime);
                await log.save();
            } else {
                log = new ClassLog({
                    tenantId: req.user.tenantId,
                    courseId,
                    subjectId,
                    teacherId: req.user.userId,
                    date: date || new Date(),
                    topic,
                    activities,
                    objectives,
                    startTime: startTime ? new Date(startTime) : undefined
                });

                // Manual creation: try to find a schedule for this time
                const logDate = new Date(log.date);
                const dayOfWeek = logDate.getDay();
                const schedule = await Schedule.findOne({
                    tenantId: req.user.tenantId,
                    courseId,
                    subjectId,
                    dayOfWeek
                });

                if (schedule) {
                    log.scheduleId = schedule._id;
                    const [sh, sm] = schedule.startTime.split(':');
                    const [eh, em] = schedule.endTime.split(':');
                    const pst = new Date(logDate); pst.setHours(parseInt(sh), parseInt(sm), 0, 0);
                    const pet = new Date(logDate); pet.setHours(parseInt(eh), parseInt(em), 0, 0);
                    log.plannedStartTime = pst;
                    log.plannedEndTime = pet;
                }

                await log.save();
            }

            res.status(201).json(log);
        } catch (error) {
            console.error('Error creating class log:', error);
            res.status(500).json({ message: error.message });
        }
    }

    static async list(req, res) {
        try {
            const { courseId, subjectId, startDate, endDate, isSigned } = req.query;
            const query = { tenantId: req.user.tenantId };

            if (isSigned !== undefined) query.isSigned = isSigned === 'true';

            if (courseId) query.courseId = courseId;
            if (subjectId) query.subjectId = subjectId;

            // Security: Teachers can only see their own logs unless they are admin
            if (req.user.role === 'teacher') {
                query.teacherId = req.user.userId;
            }

            if (startDate || endDate) {
                query.date = {};
                if (startDate) query.date.$gte = new Date(startDate);
                if (endDate) query.date.$lte = new Date(endDate);
            }

            const logs = await ClassLog.find(query)
                .populate('courseId', 'name')
                .populate('subjectId', 'name')
                .populate('teacherId', 'name')
                .sort({ date: -1 });

            res.json(logs);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async sign(req, res) {
        try {
            const { id } = req.params;
            const log = await ClassLog.findOne({ _id: id, tenantId: req.user.tenantId });

            if (!log) return res.status(404).json({ message: 'Registro no encontrado' });

            if (req.user.role === 'teacher' && log.teacherId.toString() !== req.user.userId.toString()) {
                return res.status(403).json({ message: 'No autorizado para firmar este registro' });
            }

            log.isSigned = true;
            log.signedAt = new Date();

            // Calculate duration and final metrics if startTime exists
            if (log.startTime) {
                const diffMs = log.signedAt.getTime() - log.startTime.getTime();
                log.duration = Math.max(0, Math.round(diffMs / 60000)); // Round to nearest minute

                // If it was linked to a schedule, finalize status
                if (log.scheduleId) {
                    // If finished significantly before planned end (e.g. > 15 mins), mark as interrupted
                    if (log.plannedEndTime) {
                        const earlyFinishMs = log.plannedEndTime.getTime() - log.signedAt.getTime();
                        if (earlyFinishMs > 15 * 60000) {
                            log.interruptionMinutes = Math.round(earlyFinishMs / 60000);
                            log.status = 'interrumpida';
                        } else {
                            log.status = log.delayMinutes > 10 ? 'atrasada' : 'realizada';
                        }
                    }
                } else {
                    log.status = 'realizada';
                }
            }

            await log.save();
            res.json(log);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async updateJustification(req, res) {
        try {
            const { id } = req.params;
            const { justification } = req.body;
            const log = await ClassLog.findOneAndUpdate(
                { _id: id, tenantId: req.user.tenantId, teacherId: req.user.userId },
                { justification },
                { new: true }
            );
            if (!log) return res.status(404).json({ message: 'Registro no encontrado' });
            res.json(log);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            const query = { _id: id, tenantId: req.user.tenantId };

            // Teachers can only delete their unsigned logs
            if (req.user.role === 'teacher') {
                query.teacherId = req.user.userId;
                query.isSigned = false;
            }

            const result = await ClassLog.findOneAndDelete(query);
            if (!result) return res.status(404).json({ message: 'Registro no encontrado o ya está firmado' });

            res.status(204).send();
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export default ClassLogController;
