import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://yguajardov:maquina123@comercioelectronico.c6vj7t7.mongodb.net/Einsmart?appName=Einsmart';

const curriculum = [
    { name: "Elaboración de Alimentos", regex: /Alimentos/i, modules: ["Higiene y seguridad en la elaboración de alimentos", "Control de calidad y legislación alimentaria", "Elaboración de productos lácteos", "Elaboración de cecinas y productos cárnicos", "Elaboración de conservas y productos de cuarta gama", "Elaboración de productos marinos", "Elaboración de productos de panadería y pastelería industrial", "Elaboración de bebidas analcohólicas y productos de origen vegetal", "Almacenamiento y despacho de productos alimentarios", "Emprendimiento y empleabilidad"] },
    { name: "Gastronomía", regex: /Gastronomia/i, modules: ["Higiene en la elaboración de alimentos", "Elaboración de insumos básicos", "Cocina nacional", "Cocina internacional", "Pastelería básica", "Elaboración de masas, postres y mermeladas", "Bodega, recepción y almacenaje", "Servicio de comedor y bar", "Emprendimiento y empleabilidad"] },
    { name: "Operaciones Portuarias", regex: /Portuarias/i, modules: ["Logística y transporte portuario", "Operaciones de patio y bodegaje", "Recepción y despacho de carga", "Seguridad y prevención de riesgos portuarios", "Normativa y legislación marítimo-portuaria", "Documentación de comercio exterior", "Servicios al buque y atención a naves", "Emprendimiento y empleabilidad"] },
    { name: "Mecánica Automotriz", regex: /Mecanica/i, modules: ["Mantenimiento de motores", "Sistemas de transmisión y frenado", "Dirección y suspensión", "Sistemas eléctricos y electrónicos del vehículo", "Inyección electrónica de motores", "Gestión del mantenimiento automotriz", "Diagnóstico y reparación planificada", "Emprendimiento y empleabilidad"] },
    { name: "Química Industrial", regex: /Quimica/i, modules: ["Operaciones básicas de laboratorio", "Química analítica cualitativa y cuantitativa", "Técnicas de análisis instrumental", "Ensayos microbiológicos", "Operaciones unitarias industriales", "Control de procesos químicos", "Aseguramiento de la calidad en laboratorio", "Gestión de residuos y seguridad química", "Emprendimiento y empleabilidad"] }
];

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected');

        const { default: Subject } = await import('./src/models/subjectModel.js');
        const { default: Course } = await import('./src/models/courseModel.js');
        const { default: Tenant } = await import('./src/models/tenantModel.js');
        
        const tenant = await Tenant.findOne({ name: /Maritimo/i });
        if (!tenant) throw new Error("Tenant Maritimo not found");

        const User = mongoose.model('User', new mongoose.Schema({ name: String, tenantId: mongoose.Schema.Types.ObjectId }));
        const admin = await User.findOne({ tenantId: tenant._id, name: /Emilio/i });
        const adminId = admin ? admin._id : new mongoose.Types.ObjectId("6984af4866ed6edebbb9dc1f7");

        const Career = mongoose.model('Career', new mongoose.Schema({ name: String, tenantId: mongoose.Schema.Types.ObjectId }));

        for (const data of curriculum) {
            console.log(`\n📂 Processing: ${data.name}`);
            const career = await Career.findOne({ tenantId: tenant._id, name: data.regex });
            if (!career) {
                console.warn(`⚠️ Career ${data.name} not found, skipping.`);
                continue;
            }

            for (const level of ["III° Medio", "IV° Medio"]) {
                console.log(`   🔸 ${level}`);
                let course = await Course.findOne({ tenantId: tenant._id, careerId: career._id, level: level });
                
                if (!course) {
                    const alt = level === "III° Medio" ? "3° Medio" : "4° Medio";
                    course = await Course.findOne({ tenantId: tenant._id, careerId: career._id, level: alt });
                }

                if (!course) {
                    console.log(`   ✨ Creating Course: ${level} ${career.name}`);
                    course = new Course({
                        tenantId: tenant._id,
                        careerId: career._id,
                        level: level,
                        name: `${level.startsWith('III') ? '3°' : '4°'} Medio ${career.name}`,
                        letter: 'X',
                        teacherId: adminId
                    });
                    await course.save();
                }

                for (const mName of data.modules) {
                    const exist = await Subject.findOne({ tenantId: tenant._id, courseId: course._id, name: mName });
                    if (!exist) {
                        await new Subject({
                            tenantId: tenant._id,
                            name: mName,
                            courseId: course._id,
                            teacherId: adminId,
                            isTechnical: true
                        }).save();
                        console.log(`      ✅ module: ${mName}`);
                    }
                }
            }
        }
        console.log("\n🚀 FULL POPULATION COMPLETE!");
    } catch (e) {
        console.error("❌ Fatal Error:", e);
    } finally {
        await mongoose.disconnect();
    }
}
run();
