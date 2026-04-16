import mongoose from 'mongoose';
const { MongoClient } = mongoose.mongo;
const MONGO_URI = 'mongodb+srv://yguajardov:maquina123@comercioelectronico.c6vj7t7.mongodb.net/Einsmart?appName=Einsmart';

async function test() {
    const client = new MongoClient(MONGO_URI);
    try {
        await client.connect();
        console.log('CONNECTED_SUCCESSFULLY');
        await client.close();
    } catch (e) {
        console.error(e);
    }
}
test();
