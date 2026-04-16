import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://yguajardov:maquina123@comercioelectronico.c6vj7t7.mongodb.net/Einsmart?appName=Einsmart';
const T_ID = new mongoose.Types.ObjectId("6984af03b00f020e9834b948");
const A_ID = new mongoose.Types.ObjectId("6984af4866ed6edebbb9dc1f7");
const careerId = new mongoose.Types.ObjectId("6985e7c594eba18b43c0d97b");

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.db;
        const courses = db.collection('courses');
        const subjects = db.collection('subjects');
        
        console.log('✅ Connected');

        // LEVEL 1: III Medio
        const level1 = "III° Medio";
        console.log('Processing:', level1);
        let c1 = await courses.findOne({ tenantId: T_ID, careerId: careerId, level: level1 });
        if (!c1) {
            const res = await courses.insertOne({
                tenantId: T_ID, careerId: careerId, level: level1, name: "3° Medio Elaboración de Alimentos",
                letter: 'X', teacherId: A_ID, code: "ALIM-3M-" + Date.now(),
                createdAt: new Date(), updatedAt: new Date()
            });
            c1 = { _id: res.insertedId };
        }
        
        await subjects.insertOne({ tenantId: T_ID, courseId: c1._id, name: "Higiene y seguridad en la elaboración de alimentos", isTechnical: true, teacherId: A_ID });
        await subjects.insertOne({ tenantId: T_ID, courseId: c1._id, name: "Control de calidad y legislación alimentaria", isTechnical: true, teacherId: A_ID });
        await subjects.insertOne({ tenantId: T_ID, courseId: c1._id, name: "Elaboración de productos lácteos", isTechnical: true, teacherId: A_ID });
        await subjects.insertOne({ tenantId: T_ID, courseId: c1._id, name: "Elaboración de cecinas y productos cárnicos", isTechnical: true, teacherId: A_ID });
        await subjects.insertOne({ tenantId: T_ID, courseId: c1._id, name: "Elaboración de conservas y productos de cuarta gama", isTechnical: true, teacherId: A_ID });
        
        // LEVEL 2: IV Medio
        const level2 = "IV° Medio";
        console.log('Processing:', level2);
        let c2 = await courses.findOne({ tenantId: T_ID, careerId: careerId, level: level2 });
        if (!c2) {
            const res = await courses.insertOne({
                tenantId: T_ID, careerId: careerId, level: level2, name: "4° Medio Elaboración de Alimentos",
                letter: 'X', teacherId: A_ID, code: "ALIM-4M-" + Date.now(),
                createdAt: new Date(), updatedAt: new Date()
            });
            c2 = { _id: res.insertedId };
        }
        
        await subjects.insertOne({ tenantId: T_ID, courseId: c2._id, name: "Elaboración de productos marinos", isTechnical: true, teacherId: A_ID });
        await subjects.insertOne({ tenantId: T_ID, courseId: c2._id, name: "Elaboración de productos de panadería y pastelería industrial", isTechnical: true, teacherId: A_ID });
        await subjects.insertOne({ tenantId: T_ID, courseId: c2._id, name: "Elaboración de bebidas analcohólicas y productos de origen vegetal", isTechnical: true, teacherId: A_ID });
        await subjects.insertOne({ tenantId: T_ID, courseId: c2._id, name: "Almacenamiento y despacho de productos alimentarios", isTechnical: true, teacherId: A_ID });
        await subjects.insertOne({ tenantId: T_ID, courseId: c2._id, name: "Emprendimiento y empleabilidad", isTechnical: true, teacherId: A_ID });

        console.log("✅ DONE");
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}
run();
