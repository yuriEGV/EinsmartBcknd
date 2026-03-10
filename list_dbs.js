
import mongoose from 'mongoose';

// Connect without specifying a database to list ALL databases
const baseUri = "mongodb+srv://yguajardov:maquina123@comercioelectronico.c6vj7t7.mongodb.net/?appName=einsmart";

async function listDbs() {
    await mongoose.connect(baseUri);
    const db = mongoose.connection.client.db().admin();
    const result = await db.listDatabases();
    console.log('ALL DATABASES:');
    result.databases.forEach(d => console.log(`  ${d.name} (${d.sizeOnDisk} bytes)`));
    await mongoose.disconnect();
}

listDbs().catch(console.error);
