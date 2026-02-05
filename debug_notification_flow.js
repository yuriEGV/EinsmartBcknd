import 'dotenv/config';
import mongoose from 'mongoose';
import User from './src/models/userModel.js';
import UserNotification from './src/models/userNotificationModel.js';
import NotificationService from './src/services/notificationService.js';
import connectDB from './src/config/db.js';

async function testNotifications() {
    await connectDB();
    console.log('Connected to DB');

    // 1. Find a Sostenedor
    const sostenedor = await User.findOne({ role: 'sostenedor' });
    if (!sostenedor) {
        console.log('❌ No Sostenedor found');
        return;
    }
    console.log(`✅ Found Sostenedor: ${sostenedor.name} (${sostenedor._id}) Tenant: ${sostenedor.tenantId}`);

    // 2. Test Broadcast
    console.log('Testing Broadcast...');
    await NotificationService.broadcastToAdmins({
        tenantId: sostenedor.tenantId,
        title: 'DEBUG BROADCAST',
        message: 'This is a test notification for admins',
        type: 'debug',
        link: '/debug'
    });

    // 3. Verify Insertion
    const notifs = await UserNotification.find({
        userId: sostenedor._id,
        title: 'DEBUG BROADCAST'
    });
    console.log(`Found ${notifs.length} notifications for Sostenedor.`);
    if (notifs.length > 0) {
        console.log('✅ Broadcast success');
        // Clean up
        await UserNotification.deleteMany({ title: 'DEBUG BROADCAST' });
    } else {
        console.log('❌ Broadcast failed to create notification');
    }

    // 4. Test Single User Notification (Teacher scenario)
    const teacher = await User.findOne({ role: 'teacher', tenantId: sostenedor.tenantId });
    if (teacher) {
        console.log(`Testing Single Notification for Teacher: ${teacher.name}`);
        await NotificationService.createInternalNotification({
            tenantId: teacher.tenantId,
            userId: teacher._id,
            title: 'DEBUG DIRECT',
            message: 'Direct test message',
            type: 'debug'
        });

        const tNotifs = await UserNotification.find({ userId: teacher._id, title: 'DEBUG DIRECT' });
        console.log(`Found ${tNotifs.length} notifications for Teacher.`);
        if (tNotifs.length > 0) {
            console.log('✅ Direct notification success');
            await UserNotification.deleteMany({ title: 'DEBUG DIRECT' });
        } else {
            console.log('❌ Direct notification failed');
        }
    } else {
        console.log('⚠️ No teacher found in this tenant to test direct notification');
    }

    process.exit();
}

testNotifications();
