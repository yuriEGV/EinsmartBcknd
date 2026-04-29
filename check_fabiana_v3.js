
import mongoose from 'mongoose';
import User from './src/models/userModel.js';
import Alternancia from './src/models/alternanciaModel.js';

const uri = "mongodb://einsmart_app:apppass2024@192.168.80.47:27017/Einsmart?authSource=admin";

async function checkFabiana() {
    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
        console.log('Connected to DB');

        const fabiana = await User.findOne({ name: /fabiana/i });
        if (!fabiana) {
            console.log('Fabiana not found');
            return;
        }
        console.log('Found Fabiana:', fabiana._id, fabiana.name, fabiana.role);

        const alts = await Alternancia.find({ tutorId: fabiana._id });
        console.log(`Found ${alts.length} alternancias for Fabiana's ID`);
        
        const anyAlts = await Alternancia.find({}).limit(10);
        console.log('All Alts tutorIds:', anyAlts.map(a => ({ id: a._id, tutor: a.tutorId })));

    } catch (err) {
        console.error('Connection error:', err.message);
    } finally {
        await mongoose.disconnect();
    }
}

checkFabiana();
