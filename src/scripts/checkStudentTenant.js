import mongoose from 'mongoose';
import 'dotenv/config';
import connectDB from '../config/db.js';
import Estudiante from '../models/estudianteModel.js';

const checkStudentTenant = async () => {
    try {
        await connectDB();
        const student = await Estudiante.findOne({ matricula: '401231' }); // Martina Acevedo
        console.log('Martina Acevedo Tenant ID:', student?.tenantId);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkStudentTenant();
