
import mongoose from 'mongoose';
import Alternancia from './src/models/alternanciaModel.js';
import User from './src/models/userModel.js';

const uri = "mongodb://einsmart_app:apppass2024@192.168.80.47:27017/Einsmart?authSource=admin";

async function debugAlts() {
    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
        console.log('Connected');

        const fabiana = await User.findOne({ name: /fabiana/i });
        if (fabiana) {
            console.log('Fabiana ID:', fabiana._id, 'Role:', fabiana.role, 'Tenant:', fabiana.tenantId);
            
            const alts = await Alternancia.find({ tutorId: fabiana._id });
            console.log('Alts for Fabiana:', alts.length);
            alts.forEach(a => console.log(`- Alt ID: ${a._id}, Student: ${a.estudianteId}, Tenant: ${a.tenantId}`));
        } else {
            console.log('Fabiana not found');
        }

        const allAlts = await Alternancia.find({}).limit(5);
        console.log('Sample Alts:');
        allAlts.forEach(a => console.log(`- ID: ${a._id}, tutorId: ${a.tutorId}, Tenant: ${a.tenantId}`));

    } catch (err) {
        console.error('Connection error:', err.message);
    } finally {
        await mongoose.disconnect();
    }
}

debugAlts();
