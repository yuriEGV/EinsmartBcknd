import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../src/models/userModel.js';

async function diagnose() {
  const uri = 'mongodb://einsmart_app:apppass2024@127.0.0.1:27017/Einsmart?authSource=Einsmart';
  console.log('Connecting to Localhost MONGO_URI...');
  
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected to DB successfully!');

    // 1. Buscamos al usuario yuri@einsmart.cl
    const user = await User.findOne({ email: 'yuri@einsmart.cl' });
    if (!user) {
      console.log('User yuri@einsmart.cl NOT FOUND in DB!');
    } else {
      console.log('User FOUND:', {
        id: user._id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        mustChangePassword: user.mustChangePassword
      });

      // 2. Comparamos contraseña '123456'
      const isMatch = await bcrypt.compare('123456', user.passwordHash);
      console.log('Password 123456 match?', isMatch);
    }
  } catch (err) {
    console.error('Error connecting or running query:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

diagnose();
