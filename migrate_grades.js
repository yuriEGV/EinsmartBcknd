// migrate_grades.js — Migra notas (grades) y asistencia (attendances) desde MongoDB a PG por nombre
// Ejecutar DESPUÉS de la ingestión de Excel
import pg from 'pg';
import { MongoClient } from 'mongodb';

const MONGO_URI = 'mongodb://einsmart_app:apppass2024@temp_mongo:27017/einsmart?authSource=einsmart';
const PG_URI    = 'postgresql://einsmart_pg:pgpass2024@einsmart_postgres:5432/einsmart';

const pool = new pg.Pool({ connectionString: PG_URI, max: 5 });

function normalizeName(s='') {
    return (s||'').toString().toUpperCase().trim()
        .replace(/\s+/g,' ')
        .normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}

async function q(sql, vals=[]) {
    try { return (await pool.query(sql, vals)).rows; }
    catch(e) {
        if (e.code === '23505') return []; // unique violation
        console.warn('  ⚠ PG query error:', e.message);
        return [];
    }
}

async function main() {
    console.log('🚀 Iniciando migración de Notas y Asistencia (MongoDB → PostgreSQL)');
    
    const mongo = new MongoClient(MONGO_URI);
    await mongo.connect();
    const db = mongo.db('einsmart');
    console.log('✅ MongoDB conectado');

    const pgTest = await pool.query('SELECT NOW()');
    console.log('✅ PostgreSQL conectado:', pgTest.rows[0].now);

    const tenantId = (await pool.query('SELECT tenant_id FROM students GROUP BY tenant_id ORDER BY COUNT(*) DESC LIMIT 1')).rows[0].tenant_id;
    console.log('✅ Tenant ID:', tenantId);

    // Load PG students into memory map for fast lookup
    const pgStudents = await q(`SELECT id, nombres, apellidos FROM students WHERE tenant_id=$1`, [tenantId]);
    const studentMap = {}; // "NOMBRES APELLIDOS" -> pg_id
    for (const s of pgStudents) {
        studentMap[normalizeName(`${s.nombres} ${s.apellidos}`)] = s.id;
        studentMap[normalizeName(`${s.apellidos} ${s.nombres}`)] = s.id;
    }
    console.log(`✅ ${pgStudents.length} estudiantes cargados de PG`);

    // Load Mongo students to map MongoId -> normalized name
    const mongoStudents = await db.collection('estudiantes').find().toArray();
    const mongoStudentMap = {};
    for (const s of mongoStudents) {
        mongoStudentMap[String(s._id)] = normalizeName(`${s.nombres} ${s.apellidos}`);
    }

    // Load Mongo Evaluations to map MongoId -> { title, courseName }
    const mongoEvals = await db.collection('evaluations').find().toArray();
    const mongoCourses = await db.collection('courses').find().toArray();
    const courseNameMap = {};
    for (const c of mongoCourses) courseNameMap[String(c._id)] = c.name;

    const mongoEvalMap = {};
    for (const e of mongoEvals) {
        mongoEvalMap[String(e._id)] = {
            title: e.title,
            courseName: courseNameMap[String(e.courseId)]
        };
    }

    // Load PG Evaluations to map { title, courseName } -> pg_id
    const pgEvalsRows = await q(`
        SELECT e.id, e.title, c.name as course_name 
        FROM evaluations e JOIN courses c ON c.id = e.course_id 
        WHERE e.tenant_id=$1`, [tenantId]);
    const pgEvalMap = {};
    for (const e of pgEvalsRows) {
        pgEvalMap[`${e.title}___${e.course_name}`] = e.id;
    }

    // ── Migrate Grades
    console.log('\n📝 Migrando notas...');
    const mongoGrades = await db.collection('grades').find().toArray();
    let gradesOk = 0;
    for (const g of mongoGrades) {
        const studentNorm = mongoStudentMap[String(g.estudianteId)];
        const pgStudentId = studentMap[studentNorm];
        if (!pgStudentId) continue; // Student not found in Excel data

        const evalInfo = mongoEvalMap[String(g.evaluationId)];
        if (!evalInfo) continue;

        const pgEvalId = pgEvalMap[`${evalInfo.title}___${evalInfo.courseName}`];
        if (!pgEvalId) continue;

        const rows = await q(`
            INSERT INTO grades (tenant_id, evaluation_id, student_id, score, status, academic_year)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (evaluation_id, student_id) DO NOTHING RETURNING id`,
            [tenantId, pgEvalId, pgStudentId, g.score, g.status||'graded', g.academicYear||2026]
        );
        if (rows[0]) gradesOk++;
    }
    console.log(`  ✅ ${gradesOk}/${mongoGrades.length} notas migradas exitosamente.`);

    // ── Migrate Attendances
    console.log('\n📅 Migrando asistencia...');
    const mongoAttendances = await db.collection('attendances').find().toArray();
    let attOk = 0;
    for (const a of mongoAttendances) {
        const studentNorm = mongoStudentMap[String(a.estudianteId)];
        const pgStudentId = studentMap[studentNorm];
        if (!pgStudentId) continue;

        const rows = await q(`
            INSERT INTO attendances (tenant_id, student_id, fecha, estado, minutos_atraso, observacion, academic_year)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (student_id, fecha) DO NOTHING RETURNING id`,
            [tenantId, pgStudentId, a.fecha, a.estado||'presente', a.minutosAtraso||0, a.observacion||'', a.academicYear||2026]
        );
        if (rows[0]) attOk++;
    }
    console.log(`  ✅ ${attOk}/${mongoAttendances.length} registros de asistencia migrados exitosamente.`);

    await mongo.close();
    await pool.end();
    console.log('\n🎉 Migración final de datos operativos completada!');
}

main().catch(e => { console.error(e); process.exit(1); });
