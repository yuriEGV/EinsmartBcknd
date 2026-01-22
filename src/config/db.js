import mongoose from 'mongoose';

if (!global.mongoose) {
  global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) throw new Error("❌ Falta MONGO_URI");

  // Ya conectado
  if (global.mongoose.conn) {
    return global.mongoose.conn;
  }

  // Crear promesa SOLO cuando se llama la función
  if (!global.mongoose.promise) {
    mongoose.set("strictQuery", true);

    global.mongoose.promise = mongoose.connect(mongoUri, {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000
    }).then((m) => m);
  }

  global.mongoose.conn = await global.mongoose.promise;
  return global.mongoose.conn;
}

export default connectDB;
