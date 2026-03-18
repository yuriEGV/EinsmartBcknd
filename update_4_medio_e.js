import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://yguajardov:maquina123@comercioelectronico.c6vj7t7.mongodb.net/Einsmart?appName=Einsmart';

// 26 students for 4 Medio E
const rawData = `
1	401231	ACEVEDO HILLS, MARTINA		Ficha	16		17 - dic
3	401159	BARAHONA REYES, BENJAMÍN		Ficha	17		17 - dic
4	401104	CANDIA SAN MARTIN, YULIANA		Ficha	17		17 - dic
5	401419	CASTRO MANZANO, ANTONELLA		Ficha	17		17 - dic
6	26516	CEBLA FUENTES, ANDRÉS		Ficha	17		18 - dic
7	401274	FUENTES GALLARDO, KATHALINA		Ficha	17		17 - dic
8	401106	GUTIÉRREZ SOLÍS, BASTIÁN		Ficha	17		17 - dic
9	201241	HANGLIN NAVARRO, SOFIA		Ficha	17		17 - dic
10	50335	JEREZ ARAYA, BENJAMÍN		Ficha	19		18 - dic
11	401198	JIMÉNEZ BECERRA, MARTINA		Ficha	17		17 - dic
12	401099	LEIRO BRIGNARDELLO, MIA		Ficha	17		17 - dic
13	401133	LEÓN GONZÁLEZ, FLORENCIA		Ficha	17		17 - dic
14	401271	LUCO HORMAZÁBAL, SOFIA		Ficha	16		17 - dic
15	401658	MANCILLA VILLARROEL, LUCAS		Ficha	19		17 - dic
16	401160	MARÍN SILVA, DYLAN		Ficha	17		17 - dic
17	400615	MIRANDA SALINAS, ANGELINA		Ficha	18		17 - dic
18	401178	NÚÑEZ FUENZALIDA, DOMINIQUE		Ficha	17		17 - dic
19	401265	PLAZA BOBADILLA, ESTEFANÍA		Ficha	18		17 - dic
20	401166	ROJAS CASANUEVA, PEDRO		Ficha	17		18 - dic
21	401547	SÁNCHEZ ALEUY, MATEO		Ficha	18		17 - dic
22	50195	URIBE ROJAS, MATÍAS		Ficha	18		17 - dic
23	401193	VILLALOBOS PÉREZ, JAVIERA		Ficha	17		17 - dic
24	401114	ZEPEDA RICHELMI, RICARDO		Ficha	17		17 - dic
25	400759	ZUÑIGA NUÑEZ, JOAQUIN		Ficha	17		17 - dic
26	401268	CARRILLO SOTO, IGNACIO		Ficha	18		22 - dic
27	401236	FARÍAS TAPIA, ASHLY		Ficha	17		23 - dic
`;

function normalize(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

async function update4MedioE() {
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

        // 1. Find Erwin Cubillos
        let erwin = await User.findOne({ 
            tenantId: tenant._id, 
            name: new RegExp('erwin cubillos', 'i')
        });

        if (!erwin) {
            console.log("Erwin Cubillos not found, attempting to create...");
            erwin = new User({
                tenantId: tenant._id,
                name: 'Erwin Cubillos',
                email: 'erwin.cubillos@imaritimo.cl',
                role: 'teacher',
                passwordHash: 'not_set' 
            });
            await erwin.save();
        } else {
            console.log(`👨‍🏫 Found Teacher: ${erwin.name}`);
            erwin.role = 'teacher';
            await erwin.save();
        }

        // 2. Find Course 4 Medio E
        let course = await Course.findOne({
            tenantId: tenant._id,
            name: new RegExp('4.*?Medio', 'i'),
            letter: 'E'
        });

        if (!course) {
            console.log('Course 4 Medio E not found!');
            process.exit(1);
        }

        course.teacherId = erwin._id;
        await course.save();
        console.log(`📚 Updated Course: ${course.name} ${course.letter} with Teacher: ${erwin.name}`);

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
                student.rut = rutVal;
                student.matricula = rutVal;
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
        console.log(`🧹 Removed ${removed} foreign enrollments from 4 Medio E.`);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await mongoose.disconnect();
    }
}

update4MedioE();
