import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://yguajardov:maquina123@comercioelectronico.c6vj7t7.mongodb.net/Einsmart?appName=Einsmart';
const T_ID = '6984af03b00f020e9834b948';

async function inspect() {
    try {
        await mongoose.connect(MONGO_URI);
        const Career = mongoose.model('Career', new mongoose.Schema({ name: String, tenantId: mongoose.Schema.Types.ObjectId, code: String }));
        
        const careers = await Career.find({ tenantId: T_ID });
        console.log(`CAREERS_COUNT=${careers.length}`);
        careers.forEach(c => console.log(` - ${c.name} (${c.code || 'NO_CODE'}) ID: ${c._id}`));
        
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

inspect();
