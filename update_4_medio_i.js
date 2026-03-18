import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://yguajardov:maquina123@comercioelectronico.c6vj7t7.mongodb.net/Einsmart?appName=Einsmart';

// 28 students for 4 Medio I
const rawData = `
1	401061	ARANCIBIA SOLAS, JEFFRY		Ficha	19		17 - dic
2	401143	ARÉVALO CALFULEO, BENJAMÍN		Ficha	17		17 - dic
3	401165	ASTUDILLO BARRIENTOS, BASTIÁN		Ficha	17		17 - dic
4	401181	CAMPAÑA BARAHONA, DYLAN		Ficha	17		18 - dic
5	401282	CANALES TORREJÓN, SOFÍA		Ficha	16		17 - dic
6	401320	CANO PACHECO, ALLYSON		Ficha	19		18 - dic
7	401280	DA COSTA PECHONANTE, TAMARA		Ficha	17		17 - dic
8	401246	DIAZ ARREAZA, ABRAHAM		Ficha	18		18 - dic
9	401247	FERNÁNDEZ PALACIOS, JOYCE		Ficha	16		17 - dic
10	401413	FUENTES OLIVARES, ALEXANDRA		Ficha	17		17 - dic
11	401151	GALLARDO GUTIÉRREZ, NICOLÁS		Ficha	17		17 - dic
12	401266	HOHMSTRON BENAVIDES, NARELLA		Ficha	17		18 - dic
13	401157	LAZO ORTIZ, BAITTIARE		Ficha	17		17 - dic
14	401203	LOTINA ORELLANA, GIOVANNA		Ficha	17		17 - dic
15	51545	MARTÍNEZ RIVEROS, KRISTOFFER		Ficha	18		17 - dic
16	401121	MENESES BUSTAMANTE, ROBERTO		Ficha	17		17 - dic
17	401252	MORALES CONTRERAS, CRISTOPHER		Ficha	17		17 - dic
18	401254	NÚÑEZ FERNÁNDEZ, CATALINA		Ficha	17		17 - dic
19	401279	OYARZÚN MANCILLA, ALEXANDRA		Ficha	17		17 - dic
20	401325	ROJAS OVALLE, STEFANIA		Ficha	17		17 - dic
21	400765	SANDOVAL BRUNA, ANAÍS		Ficha	17		17 - dic
22	401329	SANHUEZA CARVAJAL, VALENTINA		Ficha	17		17 - dic
23	401532	SARIEGO DUBÓ, VALENTINA		Ficha	18		17 - dic
24	401202	TAPIA ESPINOZA, RENATO		Ficha	17		17 - dic
25	200228	TAPIA VALENZUELA, TRIHANA		Ficha	17		18 - dic
26	401154	UGARTE CRUZ, JAVIER		Ficha	17		17 - dic
27	401372	VILCHES PARDO, LAURA		Ficha	17		17 - dic
28	401330	VILLEGAS MARTICORENA, AKEMI		Ficha	18		18 - dic
`;

function normalize(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

async function update4MedioI() {
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

        // Find Course 4 Medio I
        let course = await Course.findOne({
            tenantId: tenant._id,
            name: new RegExp('4.*?Medio', 'i'),
            letter: 'I'
        });

        if (!course) {
            console.log('Course 4 Medio I not found!');
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

            const rutVal = match[1];

            // Search by RUT first (most reliable)
            let student = await Estudiante.findOne({ 
                tenantId: tenant._id, 
                rut: rutVal
            });

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
                student.matricula = student.matricula || rutVal;
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
                console.log(`📌 Enrolled: ${nombres} ${apellidos}`);
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
        console.log(`🧹 Removed ${removed} foreign enrollments from 4 Medio I.`);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await mongoose.disconnect();
    }
}

update4MedioI();
