import mongoose from 'mongoose';
const { MongoClient, ObjectId } = mongoose.mongo;

const MONGO_URI = 'mongodb+srv://yguajardov:maquina123@comercioelectronico.c6vj7t7.mongodb.net/Einsmart?appName=Einsmart';
const T_ID = new ObjectId("6984af03b00f020e9834b948");
const A_ID = new ObjectId("6984af4866ed6edebbb9dc1f7");
const careerId = new ObjectId("6985e7c594eba18b43c0d97b");

async function run() {
    const client = new MongoClient(MONGO_URI);
    try {
        await client.connect();
        const db = client.db('Einsmart');
        const courses = db.collection('courses');
        const subjects = db.collection('subjects');
        
        console.log('✅ Connected Raw');

        // III Medio
        console.log('Processing III Medio');
        let c1 = await courses.findOne({ tenantId: T_ID, careerId: careerId, level: "III° Medio" });
        if (!c1) {
            const res = await courses.insertOne({
                tenantId: T_ID, careerId: careerId, level: "III° Medio", name: "3° Medio Elaboración de Alimentos",
                letter: 'X', teacherId: A_ID, code: "ALIM-3M-" + Math.random().toString(36).substring(7),
                createdAt: new Date(), updatedAt: new Date()
            });
            c1 = { _id: res.insertedId };
        }
        
        const m1 = ["Higiene y seguridad en la elaboración de alimentos", "Control de calidad y legislación alimentaria", "Elaboración de productos lácteos", "Elaboración de cecinas y productos cárnicos", "Elaboración de conservas y productos de cuarta gama"];
        for (const n of m1) {
            const ex = await subjects.findOne({ tenantId: T_ID, courseId: c1._id, name: n });
            if (!ex) await subjects.insertOne({ tenantId: T_ID, courseId: c1._id, name: n, isTechnical: true, teacherId: A_ID, createdAt: new Date(), updatedAt: new Date() });
        }

        // IV Medio
        console.log('Processing IV Medio');
        let c2 = await courses.findOne({ tenantId: T_ID, careerId: careerId, level: "IV° Medio" });
        if (!c2) {
            const res = await courses.insertOne({
                tenantId: T_ID, careerId: careerId, level: "IV° Medio", name: "4° Medio Elaboración de Alimentos",
                letter: 'X', teacherId: A_ID, code: "ALIM-4M-" + Math.random().toString(36).substring(7),
                createdAt: new Date(), updatedAt: new Date()
            });
            c2 = { _id: res.insertedId };
        }
        
        const m2 = ["Elaboración de productos marinos", "Elaboración de productos de panadería y pastelería industrial", "Elaboración de bebidas analcohólicas y productos de origen vegetal", "Almacenamiento y despacho de productos alimentarios", "Emprendimiento y empleabilidad"];
        for (const n of m2) {
            const ex = await subjects.findOne({ tenantId: T_ID, courseId: c2._id, name: n });
            if (!ex) await subjects.insertOne({ tenantId: T_ID, courseId: c2._id, name: n, isTechnical: true, teacherId: A_ID, createdAt: new Date(), updatedAt: new Date() });
        }

        console.log("✅ DONE");
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}
run();
