import mongoose from 'mongoose';
const MONGO_URI = 'mongodb+srv://yguajardov:maquina123@comercioelectronico.c6vj7t7.mongodb.net/Einsmart?appName=Einsmart';

async function check() {
    await mongoose.connect(MONGO_URI);
    const { default: Estudiante } = await import('./src/models/estudianteModel.js');
    const { default: Tenant } = await import('./src/models/tenantModel.js');
    const tenant = await Tenant.findOne({ name: /Maritimo/i }) || await Tenant.findOne();

    const byRut = await Estudiante.find({ tenantId: tenant._id, rut: '401178' });
    console.log("BY RUT:", byRut.map(s => ({ _id: s._id, rut: s.rut, nombres: s.nombres, apellidos: s.apellidos })));

    const byName = await Estudiante.find({ tenantId: tenant._id, apellidos: /NÚÑEZ/i });
    console.log("BY NAME:", byName.map(s => ({ _id: s._id, rut: s.rut, nombres: s.nombres, apellidos: s.apellidos })));

    await mongoose.disconnect();
}
check();
