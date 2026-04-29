
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/userModel.js';
import Alternancia from './src/models/alternanciaModel.js';

dotenv.config();

async function checkFabiana() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const fabiana = await User.findOne({ name: /fabiana/i });
        if (!fabiana) {
            console.log('Fabiana not found');
            return;
        }
        console.log('Found Fabiana:', fabiana._id, fabiana.name, fabiana.role);

        const alts = await Alternancia.find({ tutorId: fabiana._id });
        console.log(`Found ${alts.length} alternancias for Fabiana's ID`);
        
        const allAlts = await Alternancia.find({}).limit(5);
        console.log('Sample alternancias tutorIds:', allAlts.map(a => a.tutorId));

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkFabiana();
