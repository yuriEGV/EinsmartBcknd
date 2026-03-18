import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://yguajardov:maquina123@comercioelectronico.c6vj7t7.mongodb.net/Einsmart?appName=Einsmart';

// 30 students for 3 Medio I
const rawData = `
1	401470	ACUÑA CARDENAS, CRICHNNA		Ficha	16		16 - dic
2	26846	ARANIZ FERNANDEZ, VICTORIA		Ficha	16		16 - dic
3	401405	ARAOS PÉREZ, JOSUÉ		Ficha	16		16 - dic
4	401386	AVALOS HODDE, THOMAS		Ficha	15		16 - dic
5	26578	CACERES GARNAHM, YENDERLY		Ficha	16		16 - dic
6	401479	CALZADA GUTIÉRREZ, JUAN		Ficha	16		16 - dic
7	401433	DA COSTA LEIVA, FRANCISCA		Ficha	18		16 - dic
8	401450	DROGUETT ILLANES, ESTEFANNY		Ficha	16		16 - dic
9	401451	DROGUETT ILLANES, GIOVANNY		Ficha	16		16 - dic
10	500589	ECHEVERRIA MORA, CASANDRA		Ficha	16		18 - dic
11	401335	FUENTES GALLARDO, ALVARO		Ficha	16		16 - dic
12	401339	GONZALEZ FIGUEROA, MONSERRAT		Ficha	16		16 - dic
13	401455	HALYBURTON MIANGOLARRA, DAVID		Ficha	16		16 - dic
14	401398	HERRERA IRIARTE, ANTONELLA		Ficha	17		16 - dic
15	401529	MAGNO ABARCA, BASTIAN		Ficha	16		18 - dic
16	310210	MIRANDA ARANDA, PAZ		Ficha	16		16 - dic
17	401338	MONDACA AGUILERA, ALEXANDER		Ficha	16		16 - dic
18	401674	OLAVARRIA BERNAL, BRANDON		Ficha	16		16 - dic
19	500285	RIVERA NAVARRO, BIANCA		Ficha	16		16 - dic
20	401333	ROBLES URETA, BENJAMÍN		Ficha	16		16 - dic
21	401407	RODRÍGUEZ MOLINA, YAHIR		Ficha	16		16 - dic
22	401701	ROZAS BARRERA, JORGE		Ficha	17		18 - dic
23	401521	RUBIO SANTIBAÑEZ, ANTONELLA		Ficha	16		16 - dic
24	401522	RUBIO SANTIBAÑEZ, MELANIE		Ficha	16		16 - dic
25	401414	SANTIBÁÑEZ ZARATE, MARÍA		Ficha	16		16 - dic
26	401415	SANTIBÁÑEZ ZARATE, SUSANA		Ficha	16		16 - dic
27	401370	SCALA CATALÁN, ISIS		Ficha	16		16 - dic
28	401347	VALDES BANDA, MELANY		Ficha	16		16 - dic
29	401752	VARGAS AGUILAR, JOAQUIN		Ficha	16		16 - dic
30	401495	VILLACURA DONOSO, BENJAMIN		Ficha	16		18 - dic
`;

function normalize(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

async function update3MedioI() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const { default: Estudiante } = await import('./src/models/estudianteModel.js');
        const { default: Course } = await import('./src/models/courseModel.js');
        const { default: Enrollment } = await import('./src/models/enrollmentModel.js');
        const { default: Tenant } = await import('./src/models/tenantModel.js');

        const tenant = await Tenant.findOne({ name: /Maritimo/i }) || await Tenant.findOne();
        if (!tenant) throw new Error("Tenant not found");
        console.log(`🏢 Tenant: ${tenant.name}`);

        // 1. Find Course 3 Medio I
        let course = await Course.findOne({
            tenantId: tenant._id,
            name: new RegExp('3.*?Medio', 'i'),
            letter: 'I'
        });

        if (!course) {
            console.log('Course 3 Medio I not found!');
            process.exit(1);
        }

        console.log(`📚 Found Course: ${course.name} ${course.letter}`);

        // Parse student list
        const lines = rawData.trim().split('\n').filter(l => l.trim().length > 0);
        const authorizedStudentIds = [];

        for (const line of lines) {
            const match = line.match(/^\d+\s+(\d+)\s+(.*?)\s+Ficha/i);
            if (!match) continue;

            let tmp = match[2].trim(); 
            const parts = tmp.split(',');
            if (parts.length < 2) continue;

            const apellidos = parts[0].trim().toUpperCase(); 
            const nombres = parts[1].trim().toUpperCase(); 

            let firstNameTokens = nombres.split(' ').filter(t => t.trim().length > 0);
            let lastNameTokens = apellidos.split(' ').filter(t => t.trim().length > 0);
            const firstName = normalize(firstNameTokens[0] || "");
            const lastName = normalize(lastNameTokens[0] || "");
            const email = firstName + '.' + lastName + '@imaritimo.cl';

            let student = await Estudiante.findOne({ 
                tenantId: tenant._id, 
                apellidos: new RegExp('^' + apellidos + '$', 'i'),
                nombres: new RegExp('^' + nombres + '$', 'i')
            });

            const rutVal = match[1];

            if (!student) {
                student = new Estudiante({
                    tenantId: tenant._id,
                    nombres: nombres,
                    apellidos: apellidos,
                    email: email,
                    rut: rutVal,
                    matricula: rutVal,
                    genero: 'No informado'
                });
                console.log(`➕ Created student: ${nombres} ${apellidos} - Email: ${email}`);
            } else {
                student.email = email;
                student.nombres = nombres;
                student.apellidos = apellidos;
                student.rut = rutVal;
            }
            await student.save();
            authorizedStudentIds.push(student._id.toString());

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
            } else {
                enrollment.status = 'confirmada';
                await enrollment.save();
            }
        }

        // Cleanup unauthorized enrollments
        const allEnrollments = await Enrollment.find({ tenantId: tenant._id, courseId: course._id });
        let removed = 0;
        for (const enr of allEnrollments) {
            if (!authorizedStudentIds.includes(enr.estudianteId.toString())) {
                await Enrollment.deleteOne({ _id: enr._id });
                removed++;
            }
        }
        
        console.log(`✅ Processed ${authorizedStudentIds.length} students.`);
        console.log(`🧹 Removed ${removed} foreign enrollments from 3 Medio I.`);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await mongoose.disconnect();
    }
}

update3MedioI();
