import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://yguajardov:maquina123@comercioelectronico.c6vj7t7.mongodb.net/Einsmart?appName=Einsmart';
const T_ID = '6984af03b00f020e9834b948';

async function verify() {
    try {
        await mongoose.connect(MONGO_URI);
        const Subject = mongoose.model('Subject', new mongoose.Schema({ name: String, tenantId: mongoose.Schema.Types.ObjectId, isTechnical: Boolean }));
        
        const count = await Subject.countDocuments({ tenantId: T_ID, isTechnical: true });
        console.log(`TECHNICAL_SUBJECTS_COUNT=${count}`);
        
        const subjects = await Subject.find({ tenantId: T_ID, isTechnical: true }).limit(5);
        subjects.forEach(s => console.log(` - ${s.name}`));
        
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

verify();
