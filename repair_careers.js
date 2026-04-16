import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://yguajardov:maquina123@comercioelectronico.c6vj7t7.mongodb.net/Einsmart?appName=Einsmart';
const T_ID = new mongoose.Types.ObjectId('6984af03b00f020e9834b948');

const careerReqs = [
    { name: "Elaboración de Alimentos", code: "TP-ALIM-2026", type: "tecnico-profesional" },
    { name: "Gastronomía", code: "TP-GS-2026", type: "tecnico-profesional" },
    { name: "Operaciones Portuarias", code: "TP-OP-2026", type: "tecnico-profesional" },
    { name: "Mecánica Automotriz", code: "TP-MEC-2026", type: "tecnico-profesional" },
    { name: "Química Industrial", code: "TP-QM-2026", type: "tecnico-profesional" }
];

async function repair() {
    try {
        await mongoose.connect(MONGO_URI);
        const Career = mongoose.model('Career', new mongoose.Schema({ 
            name: String, 
            tenantId: mongoose.Schema.Types.ObjectId, 
            code: String,
            type: { type: String, enum: ['cientifico-humanista', 'tecnico-profesional'] },
            description: String
        }));
        
        console.log('✅ Connected');

        for (const req of careerReqs) {
            let career = await Career.findOne({ tenantId: T_ID, name: new RegExp(req.name.split(' ')[0], 'i') });
            
            if (!career) {
                console.log(`✨ Creating missing career: ${req.name}`);
                career = new Career({
                    tenantId: T_ID,
                    name: req.name,
                    code: req.code,
                    type: req.type,
                    description: `Especialidad técnica de ${req.name}`
                });
                await career.save();
            } else {
                console.log(`🔧 Updating existing career: ${career.name}`);
                career.code = career.code || req.code;
                career.type = req.type;
                if (!career.name.includes(req.name)) career.name = req.name; 
                await career.save();
            }
        }
        
        console.log("🚀 REPAIR COMPLETE!");
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

repair();
