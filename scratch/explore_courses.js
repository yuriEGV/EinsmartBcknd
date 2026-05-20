import mongoose from 'mongoose';

const cloudUri = "mongodb+srv://yguajardov:maquina123@comercioelectronico.c6vj7t7.mongodb.net/Einsmart?retryWrites=true&w=majority";

mongoose.connect(cloudUri)
    .then(async () => {
        console.log("Connected to MongoDB on Atlas");
        const Course = mongoose.model('Course', new mongoose.Schema({
            name: String,
            careerId: mongoose.Schema.Types.Mixed
        }), 'courses');

        const courses = await Course.find({});
        console.log("Courses in DB:");
        courses.forEach(c => {
            console.log(`- Course: ${c.name}, ID: ${c._id}, careerId: ${JSON.stringify(c.careerId)}`);
        });
        mongoose.connection.close();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
