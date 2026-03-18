import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = 'mongodb+srv://yguajardov:maquina123@comercioelectronico.c6vj7t7.mongodb.net/Einsmart?appName=Einsmart';

// 31 students
const rawData = `
1	401548	AHUMADA GONZALEZ, DILAN		Ficha	16		16 - dic
2	401551	ARAOS URTUBIA, RAYEN		Ficha	15		16 - dic
3	401391	BENÍTEZ NARANJO, DAFNE		Ficha	16		16 - dic
4	401514	BRICEÑO QUENTA, DANTE		Ficha	16		18 - dic
5	401437	CANALES ESCOBAR, JOAQUÍN		Ficha	16		18 - dic
6	401458	DEL CANTO GUTIÉRREZ, ROCÍO		Ficha	16		16 - dic
7	401379	DIAZ PAZ, ASHLY		Ficha	16		16 - dic
8	401512	FERNANDEZ OLIVARES, JOAQUIN		Ficha	16		16 - dic
9	401480	FERNANDEZ SILVA, CRISTEL		Ficha	16		16 - dic
10	401345	FLORES FUENTES, ANTONIA		Ficha	16		16 - dic
11	401341	GONZÁLEZ FUENTES, ALAN		Ficha	16		16 - dic
12	44532	GONZALEZ MARTINEZ, ROSEMARY		Ficha	17		16 - dic
13	401483	GONZÁLEZ PUEBLA, ELÍAS		Ficha	16		16 - dic
14	401387	HERNANDEZ GAJARDO, AITANA		Ficha	16		16 - dic
15	401365	HORMAZABAL SANTIBAÑEZ, ALEXANDRA		Ficha	17		16 - dic
16	44548	LEMUS ALARCON, MAYTTE		Ficha	16		16 - dic
17	26387	MELGAREJO TAPIA, LUNA		Ficha	16		22 - dic
18	330264	MIRANDA VARGAS, ANAHIZ		Ficha	15		16 - dic
19	401418	MORALES ARELLANO, JOAQUIN		Ficha	16		16 - dic
20	401556	MUÑOZ ARAYA, MAXIMILIANO		Ficha	15		16 - dic
21	401524	PEREIRA VERGARA, JOSÉ		Ficha	16		16 - dic
22	401544	PORTILLA VILCHES, JEREMY		Ficha	16		16 - dic
23	401375	RAMÍREZ OLIVARES, MARTINA		Ficha	16		16 - dic
24	401427	RIVAS OTAROLA, MARIANA		Ficha	15		16 - dic
25	401492	RIVERA RETAMALES, ANTONIA		Ficha	16		16 - dic
26	401520	RUSQUE ALVAREZ, GABRIEL		Ficha	17		16 - dic
27	401401	SOTO TORRES, PETER		Ficha	16		18 - dic
28	401462	VALDÉS GONZÁLEZ, NYSAEL		Ficha	17		16 - dic
29	401428	VALDIVIA BECERRA, MADELEY		Ficha	17		18 - dic
30	401504	VERGARA ARANDA, JAVIERA		Ficha	16		16 - dic
31	401487	ZUÑIGA ARANCIBIA, ANTONELLA		Ficha	16		16 - dic
`;

function normalize(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

async function update3MedioE() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const { default: Estudiante } = await import('./src/models/estudianteModel.js');
        const { default: Course } = await import('./src/models/courseModel.js');
        const { default: Enrollment } = await import('./src/models/enrollmentModel.js');
        const { default: Tenant } = await import('./src/models/tenantModel.js');
        const { default: User } = await import('./src/models/userModel.js');

        const tenant = await Tenant.findOne({ name: /Maritimo/i }) || await Tenant.findOne();
        if (!tenant) throw new Error("Tenant not found");
        console.log(`🏢 Tenant: ${tenant.name}`);

        // 1. Find Carlos Flores
        let carlos = await User.findOne({ 
            tenantId: tenant._id, 
            name: new RegExp('carlos flores', 'i')
        });

        if (!carlos) {
            console.log("Carlos Flores not found, attempting to create...");
            carlos = new User({
                tenantId: tenant._id,
                name: 'Carlos Flores',
                email: 'carlos.flores@imaritimo.cl',
                role: 'teacher',
                passwordHash: 'not_set' 
            });
            await carlos.save();
        } else {
            console.log(`👨‍🏫 Found Teacher: ${carlos.name}`);
            carlos.role = 'teacher';
            await carlos.save();
        }

        // 2. Find Course 3 Medio E
        let course = await Course.findOne({
            tenantId: tenant._id,
            name: new RegExp('3.*?Medio', 'i'),
            letter: 'E'
        });

        if (!course) {
            console.log('Course 3 Medio E not found!');
            process.exit(1);
        }

        course.teacherId = carlos._id;
        await course.save();
        console.log(`📚 Updated Course: ${course.name} ${course.letter} with Teacher: ${carlos.name}`);

        // Parse student list
        const lines = rawData.trim().split('\n').filter(l => l.trim().length > 0);
        const authorizedStudentIds = [];

        for (const line of lines) {
            // regex to extract name: after the middle number and before "Ficha"
            const match = line.match(/^\d+\s+(\d+)\s+(.*?)\s+Ficha/i);
            if (!match) continue;

            let tmp = match[2].trim(); // "AHUMADA GONZALEZ, DILAN"
            const parts = tmp.split(',');
            if (parts.length < 2) continue;

            const apellidos = parts[0].trim().toUpperCase(); // "AHUMADA GONZALEZ"
            const nombres = parts[1].trim().toUpperCase(); // "DILAN"

            const firstName = normalize(nombres.split(' ')[0]);
            const lastName = normalize(apellidos.split(' ')[0]);
            const email = firstName + '.' + lastName + '@imaritimo.cl';

            // Find student by name and tenant
            let student = await Estudiante.findOne({ 
                tenantId: tenant._id, 
                apellidos: new RegExp('^' + apellidos + '$', 'i'),
                nombres: new RegExp('^' + nombres + '$', 'i')
            });

            if (!student) {
                // we try matching by just first last name + first name if exact fails?
                student = new Estudiante({
                    tenantId: tenant._id,
                    nombres: nombres,
                    apellidos: apellidos,
                    email: email,
                    genero: 'No informado'
                });
                console.log(`➕ Created student: ${nombres} ${apellidos} - Email: ${email}`);
            } else {
                student.email = email;
                student.nombres = nombres;
                student.apellidos = apellidos;
                // console.log(`🔄 Updated student: ${nombres} ${apellidos} - Email: ${email}`);
            }
            await student.save();
            authorizedStudentIds.push(student._id.toString());

            // Check enrollment
            let enrollment = await Enrollment.findOne({ tenantId: tenant._id, estudianteId: student._id, courseId: course._id });
            if (!enrollment) {
                enrollment = new Enrollment({
                    tenantId: tenant._id,
                    estudianteId: student._id,
                    courseId: course._id,
                    period: '2026',
                    status: 'confirmada'
                });
                await enrollment.save();
                // console.log(`  ✅ Enrolled in course.`);
            } else {
                enrollment.status = 'confirmada';
                await enrollment.save();
            }
        }

        // Cleanup unauthorized enrollments for this course
        const allEnrollments = await Enrollment.find({ tenantId: tenant._id, courseId: course._id });
        let removed = 0;
        for (const enr of allEnrollments) {
            if (!authorizedStudentIds.includes(enr.estudianteId.toString())) {
                await Enrollment.deleteOne({ _id: enr._id });
                removed++;
            }
        }
        
        console.log(`✅ Processed ${authorizedStudentIds.length} students.`);
        console.log(`🧹 Removed ${removed} foreign enrollments from 3 Medio E.`);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await mongoose.disconnect();
    }
}

update3MedioE();
