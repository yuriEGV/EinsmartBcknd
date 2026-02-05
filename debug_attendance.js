import 'dotenv/config'; // Load env vars
import mongoose from 'mongoose';
import Attendance from './src/models/attendanceModel.js';
import connectDB from './src/config/db.js';

async function checkAttendance() {
    await connectDB();
    console.log('Connected to DB');

    // Fetch all attendance records
    const records = await Attendance.find({}).sort({ fecha: -1 }).limit(10);
    console.log('--- Last 10 Attendance Records ---');
    records.forEach(r => {
        console.log(`ID: ${r._id}, Student: ${r.estudianteId}, Date: ${r.fecha}, ISO: ${r.fecha.toISOString()}, Status: ${r.estado}`);
    });

    console.log('\n--- Specific Date Check (Jan 22, 2026) ---');
    // Check range for Jan 22
    const start = new Date('2026-01-22T00:00:00.000Z');
    const end = new Date('2026-01-22T23:59:59.999Z');

    const count = await Attendance.countDocuments({
        fecha: { $gte: start, $lte: end }
    });
    console.log(`Records between ${start.toISOString()} and ${end.toISOString()}: ${count}`);

    process.exit();
}

checkAttendance();
