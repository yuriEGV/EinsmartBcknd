// ingest_excel_to_pg.js — Pobla PostgreSQL con los 4 archivos Excel
// Ejecutar desde la máquina host (no en Docker), requiere xlsx instalado en /tmp
// Uso: docker run --rm --network=einsmart_einsmart_net \
//   -v /home/yuri/EinsmartBcknd:/app -w /app node:20-slim \
//   sh -c "npm install xlsx --no-save --prefix /tmp && NODE_PATH=/tmp/node_modules node ingest_excel_to_pg.js"

import pg from 'pg';
import { createRequire } from 'module';
import { execSync } from 'child_process';
import bcrypt from 'bcryptjs';

// Install xlsx if not available
try { createRequire(import.meta.url)('xlsx'); }
catch { execSync('npm install xlsx --no-save 2>/dev/null || true', { stdio: 'inherit' }); }
const xlsx = createRequire(import.meta.url)('xlsx');

const PG_URI = 'postgresql://einsmart_pg:pgpass2024@einsmart_postgres:5432/einsmart';
const pool = new pg.Pool({ connectionString: PG_URI, max: 5 });

async function q(sql, vals=[]) {
    try { return (await pool.query(sql, vals)).rows; }
    catch(e) {
        if (e.code === '23505') return []; // unique violation → skip
        console.warn('  ⚠ PG:', e.message.slice(0,150));
        return [];
    }
}

function normalizeName(s='') {
    return (s||'').toString().toUpperCase().trim()
        .replace(/\s+/g,' ')
        .normalize('NFD').replace(/[\u0300-\u036f]/g,''); // remove accents for matching
}

function xlDateToDate(serial) {
    if (!serial || typeof serial !== 'number') return null;
    const d = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return d.toISOString().slice(0,10);
}

// ── Read all 4 Excel files ─────────────────────────────────────────────────
const FILES = [
    { path: 'lista de 1 medio.xlsx',   nivel: '1° Medio', levelCode: 1 },
    { path: 'lista de 2 medios.xlsx',  nivel: '2° Medio', levelCode: 2 },
    { path: 'lista de 3 medios.xlsx',  nivel: '3° Medio', levelCode: 3 },
    { path: 'lista de 4 medios.xlsx',  nivel: '4° Medio', levelCode: 4 },
];

// Guardian map: normName → guardianName (from apoderados sheet)
// key: APELLIDOS_NOMBRES → apoderado_name
function buildGuardianMap(wb) {
    const guardianMap = {}; // normStudentName → guardianName + course
    for (const sname of wb.SheetNames) {
        if (!sname.toLowerCase().includes('apoderado')) continue;
        const rows = xlsx.utils.sheet_to_json(wb.Sheets[sname], { header:1, defval:'' });
        // format: [Nº, '', Nombre Estudiante, Curso, Nombre Apoderado, ...]
        for (const row of rows) {
            const studentName = String(row[2]||'').trim();
            const curso = String(row[3]||'').trim();
            const guardianName = String(row[4]||'').trim();
            if (studentName.length > 3 && guardianName.length > 2) {
                guardianMap[normalizeName(studentName)] = { guardianName, curso };
            }
        }
    }
    return guardianMap;
}

// Parse a student sheet: rows are [num, name, '', '', age, '', dateSerial]
// OR [num, '', name, '', '', age, '', dateSerial]  (1° medio has extra blank col)
function parseStudentSheet(ws, sheetName, nivel) {
    const rows = xlsx.utils.sheet_to_json(ws, { header:1, defval:'' });
    const students = [];
    // Detect letter from sheet name: "1A medio(810)" → "A"
    const letterMatch = sheetName.match(/(\d)[°\s]*([A-Z])/i);
    const letter = letterMatch ? letterMatch[2].toUpperCase() : '?';
    const careerCodeMatch = sheetName.match(/\((\d{3})\)/);
    const careerCode = careerCodeMatch ? careerCodeMatch[1] : null;

    for (const row of rows) {
        // Find the name column (longest non-empty string in first 4 cols)
        let name = '';
        let age = null;
        let dateSerial = null;

        // Try different column layouts
        // Layout A: [num, name, '', '', age, '', dateSerial]  (most sheets)
        // Layout B: [num, '', name, '', '', age, '', dateSerial] (apoderados sheet has extra col)
        const candidates = [row[1], row[2]].map(v => String(v||'').trim());
        for (const c of candidates) {
            if (c.match(/^[A-ZÁÉÍÓÚÑÜ\s]{2,},\s*[A-ZÁÉÍÓÚÑÜ]/)) {
                name = c; break;
            }
        }
        if (!name) continue;

        // Find age (numeric, 13-22)
        for (const v of row) {
            const n = Number(v);
            if (Number.isInteger(n) && n >= 12 && n <= 25) { age = n; break; }
        }
        // Find date serial (Excel date, large number ~46000)
        for (const v of row) {
            const n = Number(v);
            if (Number.isInteger(n) && n > 40000 && n < 50000) { dateSerial = n; break; }
        }

        students.push({
            name: name.trim(),
            age,
            fecha_nacimiento: xlDateToDate(dateSerial),
            letter,
            nivel,
            career_code: careerCode,
            sheet: sheetName
        });
    }
    return students;
}

async function getTenantId() {
    const r = await pool.query(`SELECT tenant_id FROM courses GROUP BY tenant_id ORDER BY COUNT(*) DESC LIMIT 1`);
    if (!r.rows[0]) throw new Error('❌ No hay tenant con cursos en PostgreSQL.');
    return r.rows[0].tenant_id;
}

async function getCourseMap(tenantId) {
    const r = await pool.query(`SELECT id, name, level, letter, career_id FROM courses WHERE tenant_id=$1`, [tenantId]);
    const map = {};
    for (const c of r.rows) map[`${c.level}${c.letter}`] = c;
    return map;
}

async function getCareerByCode(tenantId, code) {
    if (!code) return null;
    const r = await pool.query(`SELECT id FROM careers WHERE tenant_id=$1 AND code=$2 LIMIT 1`, [tenantId, code]);
    return r.rows[0]?.id || null;
}

// ── Main ingestion ─────────────────────────────────────────────────────────
async function main() {
    console.log('📊 Ingestión Excel → PostgreSQL — Einsmart');
    console.log('='.repeat(60));

    const tenantId = await getTenantId();
    console.log(`✅ Tenant: ${tenantId}`);

    const courseMap = await getCourseMap(tenantId);
    console.log(`✅ Cursos en DB: ${Object.keys(courseMap).length}`);

    let totalStudents = 0;
    let totalGuardians = 0;
    let totalEnrollments = 0;

    for (const fileInfo of FILES) {
        console.log(`\n📁 Procesando: ${fileInfo.path}`);
        let wb;
        try {
            wb = xlsx.readFile(`/app/${fileInfo.path}`);
        } catch(e) {
            console.warn(`  ⚠ No se pudo abrir: ${e.message}`);
            continue;
        }

        const guardianMap = buildGuardianMap(wb);
        console.log(`  👨‍👩‍👦 Apoderados en mapa: ${Object.keys(guardianMap).length}`);

        for (const sheetName of wb.SheetNames) {
            if (sheetName.toLowerCase().includes('apoderado')) continue;
            if (wb.Sheets[sheetName]['!ref'] === undefined) continue;

            const students = parseStudentSheet(wb.Sheets[sheetName], sheetName, fileInfo.nivel);
            if (!students.length) continue;

            console.log(`  📋 Sheet "${sheetName}": ${students.length} estudiantes`);

            // Determine course
            const courseKey = `${fileInfo.nivel}${students[0].letter}`;
            let course = courseMap[courseKey];
            if (!course) {
                // Try to create the course if it doesn't exist
                const careerId = await getCareerByCode(tenantId, students[0].career_code);
                // Get a default teacher
                const teacherRow = await pool.query(
                    `SELECT id FROM users WHERE tenant_id=$1 AND role='teacher' LIMIT 1`, [tenantId]
                );
                const teacherId = teacherRow.rows[0]?.id;
                if (teacherId) {
                    const newCourse = await q(
                        `INSERT INTO courses (tenant_id,name,level,letter,career_id,teacher_id,academic_year)
                         VALUES ($1,$2,$3,$4,$5,$6,2026)
                         ON CONFLICT (tenant_id,name,academic_year) DO UPDATE SET career_id=EXCLUDED.career_id
                         RETURNING id,name,level,letter,career_id`,
                        [tenantId, `${fileInfo.nivel} ${students[0].letter}`,
                         fileInfo.nivel, students[0].letter, careerId, teacherId]
                    );
                    if (newCourse[0]) {
                        course = newCourse[0];
                        courseMap[courseKey] = course;
                        console.log(`    ➕ Curso creado: ${course.name}`);
                    }
                }
            }

            for (const s of students) {
                // Split "APELLIDO1 APELLIDO2, NOMBRES"
                let nombres = '', apellidos = '';
                if (s.name.includes(',')) {
                    const [ap, nm] = s.name.split(',');
                    apellidos = ap.trim();
                    nombres = nm.trim();
                } else {
                    const parts = s.name.split(' ');
                    nombres = parts.slice(2).join(' ') || parts[0];
                    apellidos = parts.slice(0,2).join(' ');
                }

                const email = `${nombres.split(' ')[0].toLowerCase()}.${apellidos.split(' ')[0].toLowerCase()}@imaritimo.cl`
                    .normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z.@]/g,'');

                // Insert student
                const rows = await q(
                    `INSERT INTO students (tenant_id,nombres,apellidos,email,edad,
                     fecha_nacimiento,estado,course_id,career_id)
                     VALUES ($1,$2,$3,$4,$5,$6,'Activo',$7,$8)
                     ON CONFLICT DO NOTHING RETURNING id`,
                    [tenantId, nombres, apellidos, email, s.age,
                     s.fecha_nacimiento, course?.id||null, course?.career_id||null]
                );

                // If conflict, fetch existing
                let studentId = rows[0]?.id;
                if (!studentId) {
                    const ex = await pool.query(
                        `SELECT id FROM students WHERE tenant_id=$1 AND nombres=$2 AND apellidos=$3 LIMIT 1`,
                        [tenantId, nombres, apellidos]
                    );
                    studentId = ex.rows[0]?.id;
                }
                if (!studentId) continue;
                totalStudents++;

                // Create user account for student
                const passHash = await bcrypt.hash('Alumno2026!', 10);
                await q(
                    `INSERT INTO users (tenant_id,name,email,password_hash,role,profile_id)
                     VALUES ($1,$2,$3,$4,'student',$5)
                     ON CONFLICT (email,tenant_id) DO NOTHING`,
                    [tenantId, `${nombres} ${apellidos}`, email, passHash, studentId]
                );

                // Create guardian
                const normName = normalizeName(s.name);
                const guardianInfo = guardianMap[normName];
                let guardianId = null;
                if (guardianInfo?.guardianName) {
                    const gParts = guardianInfo.guardianName.split(' ');
                    const gNombre = gParts.slice(0, Math.ceil(gParts.length/2)).join(' ');
                    const gApellidos = gParts.slice(Math.ceil(gParts.length/2)).join(' ');
                    const gEmail = `apoderado.${nombres.split(' ')[0].toLowerCase()}.${apellidos.split(' ')[0].toLowerCase()}@imaritimo.cl`
                        .normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z.@]/g,'');

                    const gRows = await q(
                        `INSERT INTO guardians (tenant_id,student_id,nombre,apellidos,correo,tipo)
                         VALUES ($1,$2,$3,$4,$5,'principal')
                         ON CONFLICT DO NOTHING RETURNING id`,
                        [tenantId, studentId, gNombre, gApellidos, gEmail]
                    );
                    guardianId = gRows[0]?.id;
                    if (guardianId) {
                        totalGuardians++;
                        // Create user account for guardian
                        const gPassHash = await bcrypt.hash('Apoderado2026!', 10);
                        await q(
                            `INSERT INTO users (tenant_id,name,email,password_hash,role,profile_id)
                             VALUES ($1,$2,$3,$4,'apoderado',$5)
                             ON CONFLICT (email,tenant_id) DO NOTHING`,
                            [tenantId, guardianInfo.guardianName, gEmail, gPassHash, guardianId]
                        );
                    }
                }

                // Create enrollment
                if (course?.id) {
                    const enrRows = await q(
                        `INSERT INTO enrollments (tenant_id,student_id,guardian_id,course_id,period,status,academic_year)
                         VALUES ($1,$2,$3,$4,'2026','confirmada',2026)
                         ON CONFLICT (tenant_id,student_id,period) DO NOTHING RETURNING id`,
                        [tenantId, studentId, guardianId, course.id]
                    );
                    if (enrRows[0]) totalEnrollments++;
                }
            }
        }
    }

    // Final stats
    console.log('\n' + '='.repeat(60));
    console.log('📊 Resultado de la ingestión:');
    console.log(`  👩‍🎓 Estudiantes insertados: ${totalStudents}`);
    console.log(`  👨‍👩‍👦 Apoderados insertados:  ${totalGuardians}`);
    console.log(`  📋 Matrículas creadas:      ${totalEnrollments}`);

    // DB counts
    for (const t of ['students','guardians','enrollments']) {
        const r = await pool.query(`SELECT COUNT(*) as c FROM ${t}`);
        console.log(`  DB ${t}: ${r.rows[0].c}`);
    }

    await pool.end();
    console.log('\n✅ Ingestión completada!');
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
