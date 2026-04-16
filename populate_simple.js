import mongoose from 'mongoose';
const MONGO_URI = 'mongodb+srv://yguajardov:maquina123@comercioelectronico.c6vj7t7.mongodb.net/Einsmart?appName=Einsmart';

async function run() {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.useDb('Einsmart').db;
    const courses = db.collection('courses');
    const subjects = db.collection('subjects');

    const t = new mongoose.Types.ObjectId("6984af03b00f020e9834b948");
    const a = new mongoose.Types.ObjectId("6984af4866ed6edebbb9dc1f7");
    const c = new mongoose.Types.ObjectId("6985e7c594eba18b43c0d97b");

    // 3° Medio Alimentos
    let c1 = await courses.findOne({ tenantId: t, careerId: c, level: "III° Medio" });
    if (!c1) {
        const r1 = await courses.insertOne({
            tenantId: t, careerId: c, level: "III° Medio", name: "3° Medio Elaboración de Alimentos",
            letter: 'X', teacherId: a, code: "ALIM3-" + Date.now(), createdAt: new Date(), updatedAt: new Date()
        });
        c1 = { _id: r1.insertedId };
    }
    await subjects.insertOne({ tenantId: t, courseId: c1._id, name: "Higiene y seguridad en la elaboración de alimentos", isTechnical: true, teacherId: a, createdAt: new Date(), updatedAt: new Date() });
    await subjects.insertOne({ tenantId: t, courseId: c1._id, name: "Control de calidad y legislación alimentaria", isTechnical: true, teacherId: a, createdAt: new Date(), updatedAt: new Date() });
    await subjects.insertOne({ tenantId: t, courseId: c1._id, name: "Elaboración de productos lácteos", isTechnical: true, teacherId: a, createdAt: new Date(), updatedAt: new Date() });
    await subjects.insertOne({ tenantId: t, courseId: c1._id, name: "Elaboración de cecinas y productos cárnicos", isTechnical: true, teacherId: a, createdAt: new Date(), updatedAt: new Date() });
    await subjects.insertOne({ tenantId: t, courseId: c1._id, name: "Elaboración de conservas y productos de cuarta gama", isTechnical: true, teacherId: a, createdAt: new Date(), updatedAt: new Date() });

    // 4° Medio Alimentos
    let c2 = await courses.findOne({ tenantId: t, careerId: c, level: "IV° Medio" });
    if (!c2) {
        const r2 = await courses.insertOne({
            tenantId: t, careerId: c, level: "IV° Medio", name: "4° Medio Elaboración de Alimentos",
            letter: 'X', teacherId: a, code: "ALIM4-" + Date.now(), createdAt: new Date(), updatedAt: new Date()
        });
        c2 = { _id: r2.insertedId };
    }
    await subjects.insertOne({ tenantId: t, courseId: c2._id, name: "Elaboración de productos marinos", isTechnical: true, teacherId: a, createdAt: new Date(), updatedAt: new Date() });
    await subjects.insertOne({ tenantId: t, courseId: c2._id, name: "Elaboración de productos de panadería y pastelería industrial", isTechnical: true, teacherId: a, createdAt: new Date(), updatedAt: new Date() });
    await subjects.insertOne({ tenantId: t, courseId: c2._id, name: "Elaboración de bebidas analcohólicas y productos de origen vegetal", isTechnical: true, teacherId: a, createdAt: new Date(), updatedAt: new Date() });
    await subjects.insertOne({ tenantId: t, courseId: c2._id, name: "Almacenamiento y despacho de productos alimentarios", isTechnical: true, teacherId: a, createdAt: new Date(), updatedAt: new Date() });
    await subjects.insertOne({ tenantId: t, courseId: c2._id, name: "Emprendimiento y empleabilidad", isTechnical: true, teacherId: a, createdAt: new Date(), updatedAt: new Date() });

    console.log("SUCCESS");
    await mongoose.disconnect();
}
run().catch(console.error);
