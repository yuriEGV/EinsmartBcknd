import 'dotenv/config';
import mongoose from 'mongoose';
import User from './src/models/userModel.js';
import UserNotification from './src/models/userNotificationModel.js';
import NotificationService from './src/services/notificationService.js';
import connectDB from './src/config/db.js';

async function testNotifications() {
    await connectDB();
    console.log('Connected to DB');

    // 1. Check User Roles
    console.log('--- Checking User Roles ---');
    const users = await User.find({});
    users.forEach(u => console.log(`${u.name}: Role='${u.role}' Tenant='${u.tenantId}'`));

    // 2. Find a Sostenedor
    const sostenedor = await User.findOne({ role: 'sostenedor' });
    if (!sostenedor) {
        console.log('❌ No Sostenedor found');
    } else {
        console.log(`✅ Found Sostenedor: ${sostenedor.name} (${sostenedor._id}) Tenant: ${sostenedor.tenantId}`);

        // 3. Test Broadcast with VALID type
        console.log('Testing Broadcast with VALID type...');
        await NotificationService.broadcastToAdmins({
            tenantId: sostenedor.tenantId,
            title: 'DEBUG BROADCAST',
            message: 'This is a test notification for admins',
            type: 'system', // Valid type
            link: '/debug'
        });

        // 4. Verify Insertion
        const notifs = await UserNotification.find({
            userId: sostenedor._id,
            title: 'DEBUG BROADCAST'
        });
        console.log(`Found ${notifs.length} notifications for Sostenedor.`);
        if (notifs.length > 0) {
            console.log('✅ Broadcast success');
            await UserNotification.deleteMany({ title: 'DEBUG BROADCAST' });
        } else {
            console.log('❌ Broadcast failed to create notification');
        }
    }

    process.exit();
}

testNotifications();
