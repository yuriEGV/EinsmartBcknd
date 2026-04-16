import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://yguajardov:maquina123@comercioelectronico.c6vj7t7.mongodb.net/Einsmart?appName=Einsmart';
const T_ID = new mongoose.Types.ObjectId('6984af03b00f020e9834b948');

const generalSubjects = [
    "Lengua y Literatura",
    "Matemática",
    "Inglés",
    "Educación Física y Salud",
    "Historia, Geografía y Ciencias Sociales",
    "Filosofía",
    "Educación Ciudadana",
    "Ciencias para la Ciudadanía"
];

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected');

        const { default: Subject } = await import('./src/models/subjectModel.js');
        const { default: Course } = await import('./src/models/courseModel.js');
        const { default: User } = await import('./src/models/userModel.js');

        // Find Admin/UTP user for teacherId placeholder
        const admin = await User.findOne({ tenantId: T_ID, role: 'utp' });
        const teacherId = admin ? admin._id : new mongoose.Types.ObjectId("6984af4866ed6edebbb9dc1f7");

        // Find all technical courses (III and IV)
        const courses = await Course.find({ tenantId: T_ID, level: { $regex: /III|IV/i } });
        console.log(`📡 Found ${courses.length} technical courses.`);

        for (const course of courses) {
            console.log(`   📂 Course: ${course.name}`);
            
            // Filters based on level (some subjects are level-specific in Chile, but we'll add the core ones)
            let subjectsToAdd = [...generalSubjects];
            if (course.level.includes("IV")) {
                subjectsToAdd = subjectsToAdd.filter(s => s !== "Historia, Geografía y Ciencias Sociales");
            } else {
                subjectsToAdd = subjectsToAdd.filter(s => s !== "Educación Ciudadana");
            }

            for (const sName of subjectsToAdd) {
                const exists = await Subject.findOne({ tenantId: T_ID, courseId: course._id, name: sName });
                if (!exists) {
                    await new Subject({
                        tenantId: T_ID,
                        name: sName,
                        courseId: course._id,
                        teacherId: teacherId,
                        isTechnical: false
                    }).save();
                    console.log(`      ✅ Added: ${sName}`);
                }
            }
        }

        console.log("\n🚀 GENERAL EMTP SUBJECTS POPULATED!");
    } catch (e) {
        console.error("❌ Fatal Error:", e);
    } finally {
        await mongoose.disconnect();
    }
}

run();
