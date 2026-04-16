import mongoose from 'mongoose';
const { MongoClient } = mongoose.mongo;
const { ObjectId } = mongoose.Types;

const MONGO_URI = 'mongodb+srv://yguajardov:maquina123@comercioelectronico.c6vj7t7.mongodb.net/Einsmart?appName=Einsmart';

const TENANT_STR = "6984af03b00f020e9834b948";
const ADMIN_STR = "6984af4866ed6edebbb9dc1f7";

const curriculumData = [
    { name: "Elaboración de Alimentos", id: "6985e7c594eba18b43c0d97b", modules: ["Higiene y seguridad en la elaboración de alimentos", "Control de calidad y legislación alimentaria", "Elaboración de productos lácteos", "Elaboración de cecinas y productos cárnicos", "Elaboración de conservas y productos de cuarta gama", "Elaboración de productos marinos", "Elaboración de productos de panadería y pastelería industrial", "Elaboración de bebidas analcohólicas y productos de origen vegetal", "Almacenamiento y despacho de productos alimentarios", "Emprendimiento y empleabilidad"] },
    { name: "Gastronomía", id: "6984d023549bf21f2bcbbbd3", modules: ["Higiene en la elaboración de alimentos", "Elaboración de insumos básicos", "Cocina nacional", "Cocina internacional", "Pastelería básica", "Elaboración de masas, postres y mermeladas", "Bodega, recepción y almacenaje", "Servicio de comedor y bar", "Emprendimiento y empleabilidad"] },
    { name: "Operaciones Portuarias", id: "6984c8fa3254496842aa365c", modules: ["Logística y transporte portuario", "Operaciones de patio y bodegaje", "Recepción y despacho de carga", "Seguridad y prevención de riesgos portuarios", "Normativa y legislación marítimo-portuaria", "Documentación de comercio exterior", "Servicios al buque y atención a naves", "Emprendimiento y empleabilidad"] },
    { name: "Mecánica Automotriz", id: "6990d47b3ec1c6bf4bc30756", modules: ["Mantenimiento de motores", "Sistemas de transmisión y frenado", "Dirección y suspensión", "Sistemas eléctricos y electrónicos del vehículo", "Inyección electrónica de motores", "Gestión del mantenimiento automotriz", "Diagnóstico y reparación planificada", "Emprendimiento y empleabilidad"] },
    { name: "Química Industrial", id: "6984f0c510a926dcc0f493c6", modules: ["Operaciones básicas de laboratorio", "Química analítica cualitativa y cuantitativa", "Técnicas de análisis instrumental", "Ensayos microbiológicos", "Operaciones unitarias industriales", "Control de procesos químicos", "Aseguramiento de la calidad en laboratorio", "Gestión de residuos y seguridad química", "Emprendimiento y empleabilidad"] }
];

async function run() {
    const client = new MongoClient(MONGO_URI);
    try {
        console.log('Connecting...');
        await client.connect();
        const db = client.db('Einsmart');
        const courses = db.collection('courses');
        const subjects = db.collection('subjects');
        
        console.log('Creating ObjectIds...');
        console.log(`TENANT_STR: "${TENANT_STR}" (len: ${TENANT_STR.length})`);
        const tenantId = new ObjectId(TENANT_STR);
        console.log(`ADMIN_STR: "${ADMIN_STR}" (len: ${ADMIN_STR.length})`);
        const adminId = new ObjectId(ADMIN_STR);

        console.log('✅ Connected and IDs ready');

        for (const career of curriculumData) {
            try {
                console.log(`\n📂 Career: ${career.name}`);
                const careerId = new ObjectId(career.id);

                for (const level of ["III° Medio", "IV° Medio"]) {
                    console.log(`   🔸 Level: ${level}`);
                    
                    let course = await courses.findOne({ 
                        tenantId: tenantId, 
                        level: level, 
                        careerId: careerId 
                    });

                    if (!course) {
                        const alt = level === "III° Medio" ? "3° Medio" : "4° Medio";
                        course = await courses.findOne({ tenantId: tenantId, level: alt, careerId: careerId });
                    }

                    if (!course) {
                        console.log(`   ✨ Creating Course: ${level} ${career.name}`);
                        const result = await courses.insertOne({
                            tenantId: tenantId,
                            name: `${level} ${career.name}`,
                            level: level,
                            letter: 'X',
                            careerId: careerId,
                            teacherId: adminId,
                            code: `C-${career.name.substring(0,3).toUpperCase()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        });
                        course = await courses.findOne({ _id: result.insertedId });
                    }

                    console.log(`   📚 Course ID: ${course._id}`);

                    if (!course._id) {
                        console.error('❌ FATAL: course._id is null');
                        continue;
                    }

                    for (const modName of career.modules) {
                        try {
                            const exist = await subjects.findOne({
                                tenantId: tenantId,
                                courseId: course._id,
                                name: modName
                            });

                            if (!exist) {
                                await subjects.insertOne({
                                    tenantId: tenantId,
                                    name: modName,
                                    courseId: course._id,
                                    teacherId: adminId,
                                    isTechnical: true,
                                    createdAt: new Date(),
                                    updatedAt: new Date()
                                });
                                console.log(`      ✅ module: ${modName}`);
                            }
                        } catch (modErr) {
                            console.error(`      ❌ Error in module ${modName}:`, modErr.message);
                        }
                    }
                }
            } catch (careerErr) {
                console.error(`❌ Error in career ${career.name}:`, careerErr.message);
            }
        }

        console.log("\n🚀 DONE!");
    } catch (e) {
        console.error("❌ Fatal Connection Error:", e);
    } finally {
        await client.close();
    }
}

run();
