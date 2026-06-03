// src/controllers/analyticsController.js — PostgreSQL version
import { query } from '../config/db.js';
import { Tenant, Course, Career, Student, Enrollment, Grade, Attendance, Subject } from '../models/pgModels.js';

// Generic stub for unimplemented endpoints
const stub = (name) => async (req, res) => res.json({ message: `${name} — disponible próximamente`, data: [] });

class AnalyticsController {

    static async getDashboardStats(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const [
                students, teachers, courses, careers,
                enrollments, grades, attendances
            ] = await Promise.all([
                Student.count({ tenant_id: tenantId }),
                query(`SELECT COUNT(*) as c FROM users WHERE tenant_id=$1 AND role='teacher'`, [tenantId]),
                Course.count({ tenant_id: tenantId }),
                Career.count({ tenant_id: tenantId }),
                Enrollment.count({ tenant_id: tenantId }),
                Grade.count({ tenant_id: tenantId }),
                Attendance.count({ tenant_id: tenantId }),
            ]);
            return res.json({
                students,
                teachers: parseInt(teachers.rows[0].c, 10),
                courses,
                careers,
                enrollments,
                grades,
                attendances,
            });
        } catch (err) {
            return res.status(500).json({ message: 'Error en analytics', error: err.message });
        }
    }

    static async getAttendanceStats(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const { courseId, period } = req.query;
            let sql = `
                SELECT estado, COUNT(*) as count
                FROM attendances
                WHERE tenant_id = $1
            `;
            const params = [tenantId];
            if (courseId) {
                sql += ` AND student_id IN (SELECT id FROM students WHERE course_id=$${params.length+1})`;
                params.push(courseId);
            }
            sql += ' GROUP BY estado';
            const r = await query(sql, params);
            const stats = {};
            for (const row of r.rows) stats[row.estado] = parseInt(row.count, 10);
            return res.json(stats);
        } catch (err) {
            return res.status(500).json({ message: 'Error stats asistencia', error: err.message });
        }
    }

    static async getGradeStats(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const { courseId, subjectId } = req.query;
            let sql = `
                SELECT 
                    AVG(g.score)::numeric(4,2) as avg_score,
                    MIN(g.score) as min_score,
                    MAX(g.score) as max_score,
                    COUNT(*) as total
                FROM grades g
                JOIN evaluations e ON e.id = g.evaluation_id
                WHERE g.tenant_id = $1
            `;
            const params = [tenantId];
            if (courseId) { sql += ` AND e.course_id = $${params.length+1}`; params.push(courseId); }
            if (subjectId) { sql += ` AND e.subject_id = $${params.length+1}`; params.push(subjectId); }
            const r = await query(sql, params);
            return res.json(r.rows[0] || {});
        } catch (err) {
            return res.status(500).json({ message: 'Error stats notas', error: err.message });
        }
    }

    static async getCourseAnalytics(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const r = await query(`
                SELECT 
                    c.id, c.name, c.level, c.letter,
                    COUNT(DISTINCT s.id) as student_count,
                    COUNT(DISTINCT sub.id) as subject_count,
                    AVG(g.score)::numeric(4,2) as avg_grade
                FROM courses c
                LEFT JOIN students s ON s.course_id = c.id
                LEFT JOIN subjects sub ON sub.course_id = c.id
                LEFT JOIN evaluations ev ON ev.course_id = c.id
                LEFT JOIN grades g ON g.evaluation_id = ev.id
                WHERE c.tenant_id = $1
                GROUP BY c.id, c.name, c.level, c.letter
                ORDER BY c.level, c.letter
            `, [tenantId]);
            return res.json(r.rows);
        } catch (err) {
            return res.status(500).json({ message: 'Error analytics cursos', error: err.message });
        }
    }

    static async getGlobalAcademicPerformance(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const r = await query(`
                SELECT 
                    ca.name as career_name,
                    AVG(g.score)::numeric(4,2) as avg_score,
                    COUNT(DISTINCT s.id) as student_count,
                    COUNT(g.id) as grade_count
                FROM careers ca
                JOIN students s ON s.career_id = ca.id
                JOIN grades g ON g.student_id = s.id
                WHERE ca.tenant_id = $1
                GROUP BY ca.id, ca.name
                ORDER BY avg_score DESC
            `, [tenantId]);
            return res.json(r.rows);
        } catch (err) {
            return res.status(500).json({ message: 'Error performance global', error: err.message });
        }
    }

    static async getSostenedorDashboard(req, res) {
        try {
            const [tenants, students, teachers, courses] = await Promise.all([
                Tenant.count({}),
                query(`SELECT COUNT(*) as c FROM students`),
                query(`SELECT COUNT(*) as c FROM users WHERE role='teacher'`),
                query(`SELECT COUNT(*) as c FROM courses`),
            ]);
            return res.json({
                tenants,
                students: parseInt(students.rows[0].c, 10),
                teachers: parseInt(teachers.rows[0].c, 10),
                courses: parseInt(courses.rows[0].c, 10),
            });
        } catch (err) {
            return res.status(500).json({ message: 'Error dashboard sostenedor', error: err.message });
        }
    }

    static async getTeacherTimeReport(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const r = await query(`
                SELECT 
                    u.id, u.name,
                    COUNT(DISTINCT sch.id) as blocks_per_week,
                    COUNT(DISTINCT sub.id) as subject_count
                FROM users u
                LEFT JOIN schedules sch ON sch.teacher_id = u.id AND sch.tenant_id = $1
                LEFT JOIN subjects sub ON sub.teacher_id = u.id AND sub.tenant_id = $1
                WHERE u.tenant_id = $1 AND u.role = 'teacher'
                GROUP BY u.id, u.name
                ORDER BY u.name
            `, [tenantId]);
            return res.json(r.rows);
        } catch (err) {
            return res.status(500).json({ message: 'Error teacher report', error: err.message });
        }
    }

    static async getClassroomEfficiency(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const r = await query(`
                SELECT 
                    c.name as course,
                    COUNT(DISTINCT sch.id) as schedule_blocks,
                    COUNT(DISTINCT cl.id) as class_logs_count,
                    AVG(att_stats.present_pct)::numeric(5,2) as avg_attendance_pct
                FROM courses c
                LEFT JOIN schedules sch ON sch.course_id = c.id
                LEFT JOIN class_logs cl ON cl.course_id = c.id
                LEFT JOIN LATERAL (
                    SELECT 
                        CASE WHEN COUNT(*) > 0 
                             THEN 100.0 * COUNT(*) FILTER (WHERE estado='presente') / COUNT(*) 
                             ELSE 0 END as present_pct
                    FROM attendances a
                    JOIN students s ON s.id = a.student_id
                    WHERE s.course_id = c.id
                ) att_stats ON true
                WHERE c.tenant_id = $1
                GROUP BY c.id, c.name
                ORDER BY c.name
            `, [tenantId]);
            return res.json(r.rows);
        } catch (err) {
            return res.status(500).json({ message: 'Error classroom efficiency', error: err.message });
        }
    }
    // ── Stubs para rutas aún no migradas ────────────────────────
    static getStudentAnalytics    = stub('getStudentAnalytics');
    static getTopStudents         = stub('getTopStudents');
    static getAnnotationRankings  = stub('getAnnotationRankings');
    static getStudentPerformance  = stub('getStudentPerformance');
    static getPerformanceTrends   = stub('getPerformanceTrends');
    static getDebtorRanking       = stub('getDebtorRanking');
    static getMedicalLicenseRanking = stub('getMedicalLicenseRanking');
    static getPunctualityRanking  = stub('getPunctualityRanking');
    static getAuthorityStats      = stub('getAuthorityStats');
    static getClassBookMetrics    = stub('getClassBookMetrics');
    static getSystemHealth        = stub('getSystemHealth');
    static getGlobalTrends        = stub('getGlobalTrends');
}

export default AnalyticsController;
