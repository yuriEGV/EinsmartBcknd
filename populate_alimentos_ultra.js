import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://yguajardov:maquina123@comercioelectronico.c6vj7t7.mongodb.net/Einsmart?appName=Einsmart';

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected');

        const { default: Subject } = await import('./src/models/subjectModel.js');
        const { default: Course } = await import('./src/models/courseModel.js');
        const { default: Tenant } = await import('./src/models/tenantModel.js');
        // I'll need Career model too? No, I'll use raw the collection for career just to get ID
        
        const tenant = await Tenant.findOne({ name: /Maritimo/i });
        if (!tenant) throw new Error("Tenant not found");
        console.log(`🏢 Tenant: ${tenant.name} (${tenant._id})`);

        // Find Admin (Emilio Miranda)
        const User = mongoose.model('User', new mongoose.Schema({ name: String, role: String, tenantId: mongoose.Schema.Types.ObjectId }));
        const admin = await User.findOne({ tenantId: tenant._id, name: /Emilio/i });
        if (!admin) throw new Error("Admin not found");
        console.log(`👤 Admin: ${admin.name} (${admin._id})`);

        // Find Career
        const Career = mongoose.model('Career', new mongoose.Schema({ name: String, tenantId: mongoose.Schema.Types.ObjectId }));
        const career = await Career.findOne({ tenantId: tenant._id, name: /Alimentos/i });
        if (!career) throw new Error("Career not found");
        console.log(`📂 Career: ${career.name} (${career._id})`);

        const mods = [
            "Higiene y seguridad en la elaboración de alimentos",
            "Control de calidad y legislación alimentaria",
            "Elaboración de productos lácteos",
            "Elaboración de cecinas y productos cárnicos",
            "Elaboración de conservas y productos de cuarta gama",
            "Elaboración de productos marinos",
            "Elaboración de productos de panadería y pastelería industrial",
            "Elaboración de bebidas analcohólicas y productos de origen vegetal",
            "Almacenamiento y despacho de productos alimentarios",
            "Emprendimiento y empleabilidad"
        ];

        for (const level of ["III° Medio", "IV° Medio"]) {
            console.log(`🔸 Process level: ${level}`);
            let course = await Course.findOne({ tenantId: tenant._id, careerId: career._id, level: level });
            if (!course) {
                console.log(`   ✨ Creating Course: ${level}`);
                course = new Course({
                    tenantId: tenant._id,
                    careerId: career._id,
                    level: level,
                    name: `${level === "III° Medio" ? "3°" : "4°"} Medio Elaboración de Alimentos`,
                    letter: 'X',
                    teacherId: admin._id
                });
                await course.save();
            }

            for (const m of mods) {
                const exists = await Subject.findOne({ tenantId: tenant._id, courseId: course._id, name: m });
                if (!exists) {
                    await new Subject({ tenantId: tenant._id, name: m, courseId: course._id, teacherId: admin._id, isTechnical: true }).save();
                    console.log(`      ✅ module: ${m}`);
                }
            }
        }

        console.log("\n🚀 DONE!");
    } catch (e) {
        console.error("❌ Fatal Error:", e);
    } finally {
        await mongoose.disconnect();
    }
}
run();
