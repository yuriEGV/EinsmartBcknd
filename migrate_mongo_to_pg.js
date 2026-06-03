// migrate_mongo_to_pg.js
// Migra datos desde MongoDB hacia PostgreSQL local
// Ejecutar DESPUÉS de que PG esté corriendo con el esquema inicializado
// Uso: docker run --rm --network=einsmart_einsmart_net \
//   -v /home/yuri/EinsmartBcknd:/app -w /app node:20-slim \
//   sh -c "npm ci --quiet 2>/dev/null && node migrate_mongo_to_pg.js"

import pg from 'pg';
import { MongoClient, ObjectId } from 'mongodb';

const MONGO_URI = 'mongodb://einsmart_app:apppass2024@temp_mongo:27017/einsmart?authSource=einsmart';
const PG_URI    = 'postgresql://einsmart_pg:pgpass2024@einsmart_postgres:5432/einsmart';

const pool = new pg.Pool({ connectionString: PG_URI, max: 5 });
let mongoDb;

// ── helpers ────────────────────────────────────────────────────────────────
async function q(sql, vals=[]) {
    try { return (await pool.query(sql, vals)).rows; }
    catch(e) {
        if (e.code === '23505') return []; // duplicate, skip
        console.warn('  ⚠ PG query error:', e.message.slice(0,120));
        return [];
    }
}

// Maps MongoDB ObjectId strings → PG UUIDs
const idMap = {};  // mongoId → pgUUID

function pgId(mongoId) {
    if (!mongoId) return null;
    return idMap[String(mongoId)] || null;
}

// ── 1. TENANTS ────────────────────────────────────────────────────────────
async function migrateTenants() {
    console.log('\n📦 Migrando tenants...');
    const docs = await mongoDb.collection('tenants').find().toArray();
    for (const d of docs) {
        const rows = await q(
            `INSERT INTO tenants (name, domain, address, phone, contact_email,
             annual_fee, academic_year, payment_type, theme)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
             ON CONFLICT DO NOTHING RETURNING id`,
            [d.name||'Instituto', d.domain||'', d.address||'', d.phone||'',
             d.contactEmail||'', d.annualFee||0, String(d.academicYear||2026),
             d.paymentType||'paid',
             JSON.stringify(d.theme||{primaryColor:'#3b82f6',secondaryColor:'#1e293b'})]
        );
        if (rows[0]) idMap[String(d._id)] = rows[0].id;
    }
    console.log(`  ✅ ${docs.length} tenants migrados.`);
}

// ── 2. USERS (sin estudiantes, sin apoderados) ────────────────────────────
async function migrateUsers() {
    console.log('\n👥 Migrando usuarios (staff + teachers)...');
    const docs = await mongoDb.collection('users').find({
        role: { $nin: ['student', 'apoderado'] }
    }).toArray();
    let ok = 0;
    for (const d of docs) {
        const tid = pgId(d.tenantId);
        if (!tid) continue;
        const rows = await q(
            `INSERT INTO users (tenant_id,name,email,rut,phone,address,
             password_hash,role,specialization,must_change_password,must_change_pin,signature_pin)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
             ON CONFLICT (email,tenant_id) DO UPDATE SET
               password_hash=EXCLUDED.password_hash,
               role=EXCLUDED.role
             RETURNING id`,
            [tid, d.name||'', d.email||'', d.rut||null, d.phone||null,
             d.address||null, d.passwordHash||'$2a$10$invalid',
             d.role||'teacher', d.specialization||null,
             d.mustChangePassword||false, d.mustChangePin||true,
             d.signaturePin||'1234']
        );
        if (rows[0]) { idMap[String(d._id)] = rows[0].id; ok++; }
    }
    console.log(`  ✅ ${ok}/${docs.length} usuarios migrados.`);
}

// ── 3. CAREERS ────────────────────────────────────────────────────────────
async function migrateCareers() {
    console.log('\n🎓 Migrando carreras...');
    const docs = await mongoDb.collection('careers').find().toArray();
    for (const d of docs) {
        const tid = pgId(d.tenantId);
        if (!tid) continue;
        const htId = pgId(d.headTeacher || d.profesorJefe);
        const rows = await q(
            `INSERT INTO careers (tenant_id,name,type,code,description,head_teacher_id)
             VALUES ($1,$2,$3,$4,$5,$6)
             ON CONFLICT DO NOTHING RETURNING id`,
            [tid, d.name, d.type||'tecnico-profesional', d.code||'',
             d.description||'', htId]
        );
        if (rows[0]) idMap[String(d._id)] = rows[0].id;
    }
    console.log(`  ✅ ${docs.length} carreras migradas.`);
}

// ── 4. COURSES ────────────────────────────────────────────────────────────
async function migrateCourses() {
    console.log('\n📚 Migrando cursos...');
    const docs = await mongoDb.collection('courses').find().toArray();
    let ok = 0;
    for (const d of docs) {
        const tid = pgId(d.tenantId);
        if (!tid) continue;
        const rows = await q(
            `INSERT INTO courses (tenant_id,name,level,letter,code,description,
             teacher_id,career_id,academic_year)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
             ON CONFLICT (tenant_id,name,academic_year) DO UPDATE SET
               teacher_id=EXCLUDED.teacher_id,
               career_id=EXCLUDED.career_id
             RETURNING id`,
            [tid, d.name, d.level||'', d.letter||'', d.code||'',
             d.description||'', pgId(d.teacherId), pgId(d.careerId),
             d.academicYear||2026]
        );
        if (rows[0]) { idMap[String(d._id)] = rows[0].id; ok++; }
    }
    console.log(`  ✅ ${ok}/${docs.length} cursos migrados.`);
}

// ── 5. SUBJECTS ──────────────────────────────────────────────────────────
async function migrateSubjects() {
    console.log('\n📖 Migrando asignaturas...');
    const docs = await mongoDb.collection('subjects').find().toArray();
    let ok = 0;
    for (const d of docs) {
        const tid = pgId(d.tenantId);
        const cid = pgId(d.courseId);
        if (!tid || !cid) continue;
        const rows = await q(
            `INSERT INTO subjects (tenant_id,name,course_id,teacher_id,
             is_complementary,is_technical,description)
             VALUES ($1,$2,$3,$4,$5,$6,$7)
             ON CONFLICT DO NOTHING RETURNING id`,
            [tid, d.name, cid, pgId(d.teacherId),
             d.isComplementary||false, d.isTechnical||false, d.description||'']
        );
        if (rows[0]) { idMap[String(d._id)] = rows[0].id; ok++; }
    }
    console.log(`  ✅ ${ok}/${docs.length} asignaturas migradas.`);
}

// ── 6. EMPRESAS ──────────────────────────────────────────────────────────
async function migrateEmpresas() {
    console.log('\n🏢 Migrando empresas...');
    const docs = await mongoDb.collection('empresas').find().toArray();
    let ok = 0;
    for (const d of docs) {
        const tid = pgId(d.tenantId);
        if (!tid) continue;
        const rows = await q(
            `INSERT INTO empresas (tenant_id,rut,razon_social,rubro,direccion,
             comuna,contacto_nombre,email_contacto,telefono,estado)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             ON CONFLICT DO NOTHING RETURNING id`,
            [tid, d.rut||null, d.razonSocial||d.name||'Sin nombre', d.rubro||'',
             d.direccion||'', d.comuna||'', d.contactoNombre||'',
             d.emailContacto||'', d.telefono||'', d.estado||'Activo']
        );
        if (rows[0]) { idMap[String(d._id)] = rows[0].id; ok++; }
    }
    console.log(`  ✅ ${ok}/${docs.length} empresas migradas.`);
}

// ── 7. SCHEDULES ─────────────────────────────────────────────────────────
async function migrateSchedules() {
    console.log('\n🗓  Migrando horarios...');
    const docs = await mongoDb.collection('schedules').find().toArray();
    let ok = 0;
    for (const d of docs) {
        const tid = pgId(d.tenantId);
        const cid = pgId(d.courseId);
        if (!tid || !cid) continue;
        const rows = await q(
            `INSERT INTO schedules (tenant_id,course_id,subject_id,teacher_id,
             day_of_week,start_time,end_time,block_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
             ON CONFLICT DO NOTHING RETURNING id`,
            [tid, cid, pgId(d.subjectId), pgId(d.teacherId),
             d.dayOfWeek||0, d.startTime||'08:00', d.endTime||'08:45', d.blockId||1]
        );
        if (rows[0]) ok++;
    }
    console.log(`  ✅ ${ok}/${docs.length} horarios migrados.`);
}

// ── 8. EVALUATIONS ───────────────────────────────────────────────────────
async function migrateEvaluations() {
    console.log('\n📝 Migrando evaluaciones...');
    const docs = await mongoDb.collection('evaluations').find().toArray();
    let ok = 0;
    for (const d of docs) {
        const tid = pgId(d.tenantId);
        const cid = pgId(d.courseId);
        if (!tid || !cid) continue;
        const rows = await q(
            `INSERT INTO evaluations (tenant_id,course_id,subject_id,title,type,
             category,max_score,period,date,status,academic_year)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
             ON CONFLICT DO NOTHING RETURNING id`,
            [tid, cid, pgId(d.subjectId), d.title||'', d.type||'sumativa',
             d.category||'planificada', d.maxScore||7, d.period||'1_semestre',
             d.date||null, d.status||'pending', d.academicYear||2026]
        );
        if (rows[0]) { idMap[String(d._id)] = rows[0].id; ok++; }
    }
    console.log(`  ✅ ${ok}/${docs.length} evaluaciones migradas.`);
}

// ── 9. CLASSBOOKLOGS ─────────────────────────────────────────────────────
async function migrateClassbookLogs() {
    console.log('\n📋 Migrando classbook logs...');
    const docs = await mongoDb.collection('classbooklogs').find().toArray();
    let ok = 0;
    for (const d of docs) {
        const tid = pgId(d.tenantId);
        if (!tid) continue;
        await q(
            `INSERT INTO classbook_logs (tenant_id,user_id,course_id,action,details)
             VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
            [tid, pgId(d.userId), pgId(d.courseId), d.action||'', d.details||'']
        );
        ok++;
    }
    console.log(`  ✅ ${ok}/${docs.length} classbook logs migrados.`);
}

// ── MAIN ─────────────────────────────────────────────────────────────────
async function main() {
    console.log('🚀 Iniciando migración MongoDB → PostgreSQL');
    console.log('=' .repeat(60));

    const mongo = new MongoClient(MONGO_URI);
    await mongo.connect();
    mongoDb = mongo.db('einsmart');
    console.log('✅ MongoDB conectado');

    const pgTest = await pool.query('SELECT NOW()');
    console.log('✅ PostgreSQL conectado:', pgTest.rows[0].now);

    await migrateTenants();
    await migrateUsers();
    await migrateCareers();
    await migrateCourses();
    await migrateSubjects();
    await migrateEmpresas();
    await migrateSchedules();
    await migrateEvaluations();
    await migrateClassbookLogs();

    // Estadísticas finales
    console.log('\n' + '='.repeat(60));
    console.log('📊 Estadísticas en PostgreSQL:');
    for (const t of ['tenants','users','careers','courses','subjects','empresas','schedules','evaluations','classbook_logs']) {
        const r = await pool.query(`SELECT COUNT(*) as c FROM ${t}`);
        console.log(`  ${t}: ${r.rows[0].c}`);
    }

    await mongo.close();
    await pool.end();
    console.log('\n✅ Migración completada!');
    console.log('ℹ️  Nota: estudiantes y apoderados se poblarán desde los archivos Excel.');
    console.log('ℹ️  Las notas (grades) se migrarán DESPUÉS de ingestar estudiantes del Excel.');
}

main().catch(err => { console.error('❌', err); process.exit(1); });
