import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://yguajardov:maquina123@comercioelectronico.c6vj7t7.mongodb.net/Einsmart?appName=Einsmart';

const curriculum = [
    { careerName: "Elaboración de Alimentos", careerId: "6985e7c594eba18b43c0d97b", modules: ["Higiene y seguridad en la elaboración de alimentos", "Control de calidad y legislación alimentaria", "Elaboración de productos lácteos", "Elaboración de cecinas y productos cárnicos", "Elaboración de conservas y productos de cuarta gama", "Elaboración de productos marinos", "Elaboración de productos de panadería y pastelería industrial", "Elaboración de bebidas analcohólicas y productos de origen vegetal", "Almacenamiento y despacho de productos alimentarios", "Emprendimiento y empleabilidad"] },
    { careerName: "Gastronomía", careerId: "6984d023549bf21f2bcbbbd3", modules: ["Higiene en la elaboración de alimentos", "Elaboración de insumos básicos", "Cocina nacional", "Cocina internacional", "Pastelería básica", "Elaboración de masas, postres y mermeladas", "Bodega, recepción y almacenaje", "Servicio de comedor y bar", "Emprendimiento y empleabilidad"] },
    { careerName: "Operaciones Portuarias", careerId: "6984c8fa3254496842aa365c", modules: ["Logística y transporte portuario", "Operaciones de patio y bodegaje", "Recepción y despacho de carga", "Seguridad y prevención de riesgos portuarios", "Normativa y legislación marítimo-portuaria", "Documentación de comercio exterior", "Servicios al buque y atención a naves", "Emprendimiento y empleabilidad"] },
    { careerName: "Mecánica Automotriz", careerId: "6990d47b3ec1c6bf4bc30756", modules: ["Mantenimiento de motores", "Sistemas de transmisión y frenado", "Dirección y suspensión", "Sistemas eléctricos y electrónicos del vehículo", "Inyección electrónica de motores", "Gestión del mantenimiento automotriz", "Diagnóstico y reparación planificada", "Emprendimiento y empleabilidad"] },
    { careerName: "Química Industrial", careerId: "6984f0c510a926dcc0f493c6", modules: ["Operaciones básicas de laboratorio", "Química analítica cualitativa y cuantitativa", "Técnicas de análisis instrumental", "Ensayos microbiológicos", "Operaciones unitarias industriales", "Control de procesos químicos", "Aseguramiento de la calidad en laboratorio", "Gestión de residuos y seguridad química", "Emprendimiento y empleabilidad"] }
];

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected');

        const { default: Subject } = await import('./src/models/subjectModel.js');
        const { default: Course } = await import('./src/models/courseModel.js');
        const { default: Tenant } = await import('./src/models/tenantModel.js');

        const tenant = await Tenant.findOne({ name: /Maritimo/i });
        const adminId = new mongoose.Types.ObjectId("6984af4866ed6edebbb9dc1f7");

        for (const cData of curriculum) {
            console.log(`\n📂 Especialidad: ${cData.careerName}`);
            const careerId = new mongoose.Types.ObjectId(cData.careerId);

            for (const level of ["III° Medio", "IV° Medio"]) {
                console.log(`   🔸 ${level}`);
                
                let course = await Course.findOne({ 
                    tenantId: tenant._id, 
                    level: level, 
                    careerId: careerId 
                });

                if (!course) {
                    const alt = level === "III° Medio" ? "3° Medio" : "4° Medio";
                    course = await Course.findOne({ 
                        tenantId: tenant._id, 
                        level: alt, 
                        careerId: careerId 
                    });
                }

                if (!course) {
                    console.log(`   ✨ Creating Course: ${level} ${cData.careerName}`);
                    course = new Course({
                        tenantId: tenant._id,
                        name: `${level} ${cData.careerName}`,
                        level: level,
                        letter: 'X',
                        careerId: careerId,
                        teacherId: adminId
                    });
                    await course.save();
                }

                for (const mName of cData.modules) {
                    const exist = await Subject.findOne({
                        tenantId: tenant._id,
                        courseId: course._id,
                        name: mName
                    });

                    if (!exist) {
                        const s = new Subject({
                            tenantId: tenant._id,
                            name: mName,
                            courseId: course._id,
                            teacherId: adminId,
                            isTechnical: true
                        });
                        await s.save();
                        console.log(`      ✅ module: ${mName}`);
                    }
                }
            }
        }
        console.log("\n🚀 MISSION COMPLETE!");
    } catch (e) {
        console.error("❌ Error Fatal:", e);
    } finally {
        await mongoose.disconnect();
    }
}
run();
