
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI;

const userSchema = new mongoose.Schema({
    email: String,
    rut: String,
    role: String,
    tenantId: mongoose.Schema.Types.ObjectId,
    name: String
}, { strict: false });

const User = mongoose.model('User', userSchema);

async function check() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB');

        const emilio = await User.findOne({
            $or: [
                { email: /emilio/i },
                { rut: /emilio/i }
            ]
        });

        if (emilio) {
            console.log('USER FOUND:');
            console.log(JSON.stringify(emilio, null, 2));
        } else {
            console.log('USER emilio NOT FOUND');
        }

        const friendly = await User.findOne({ name: /Friendly/i });
        if (friendly) {
            console.log('\nTEACHER FRIENDLY FOUND:');
            console.log(JSON.stringify(friendly, null, 2));
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

check();
