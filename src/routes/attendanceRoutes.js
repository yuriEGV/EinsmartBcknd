import express from 'express';
import AttendanceController from '../controllers/attendanceController.js';

const router = express.Router();

/**
 * Asistencia automática
 * - Marca presente por defecto
 */
router.post('/', AttendanceController.createAttendance);

/**
 * Listar asistencias por tenant
 */
router.post('/bulk', AttendanceController.createBulkAttendance);

/**
 * Estadísticas de asistencia
 */
router.get('/stats', AttendanceController.getStats);

/**
 * Listar asistencias por tenant (o filtro)
 */
router.get('/', AttendanceController.listAttendances);

export default router;
