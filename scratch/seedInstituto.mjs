import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI || "mongodb+srv://yguajardov:maquina123@comercioelectronico.c6vj7t7.mongodb.net/Einsmart";

async function seedInstituto() {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;

    // Check if it already exists to avoid duplicates
    const existing = await db.collection('tenants').findOne({ name: /Instituto Bicentenario Maritimo de Valparaiso/i });
    if (existing) {
        console.log("Institution already exists:", existing);
    } else {
        const result = await db.collection('tenants').insertOne({
            name: 'Instituto Bicentenario Maritimo de Valparaiso',
            domain: 'maritimo.cl',
            paymentType: 'paid',
            status: 'activo',
            address: 'Av. Altamirano 1424, Valparaíso',
            contactEmail: 'contacto@maritimo.cl',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        console.log("Successfully created Instituto Bicentenario Maritimo de Valparaiso. ID:", result.insertedId);
    }

    mongoose.disconnect();
}

seedInstituto().catch(console.error);
