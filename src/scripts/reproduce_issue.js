
import 'dotenv/config';
import connectDB from '../config/db.js';
import { registrar } from '../controllers/authController.js';
import User from '../models/userModel.js';
import mongoose from 'mongoose';

const mockReq = {
    body: {
        name: 'Test User',
        email: `testuser_${Date.now()}@example.com`,
        password: 'password123',
        tenantId: new mongoose.Types.ObjectId(),
        role: 'teacher'
    }
};

const mockRes = {
    statusCode: 200,
    headers: {},
    status: function (code) {
        this.statusCode = code;
        return this;
    },
    json: function (data) {
        console.log(`Response Status: ${this.statusCode}`);
        console.log('Response Body:', JSON.stringify(data, null, 2));

        if (data.token) {
            console.log('✅ Token successfully generated!');
        } else {
            console.error('❌ Token NOT generated!');
        }
        return this;
    }
};

async function run() {
    try {
        console.log('Connecting to database...');
        await connectDB();
        console.log('Connected. Running registration test...');

        // Cleanup potentially existing test user (though email is unique per run)
        // await User.deleteOne({ email: mockReq.body.email }); 

        await registrar(mockReq, mockRes);

    } catch (error) {
        console.error('An unexpected error occurred:', error);
    } finally {
        await mongoose.disconnect();
    }
}

run();
