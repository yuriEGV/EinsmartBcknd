import mongoose from 'mongoose';

const cloudUri = "mongodb+srv://yguajardov:maquina123@comercioelectronico.c6vj7t7.mongodb.net/Einsmart?retryWrites=true&w=majority";

mongoose.connect(cloudUri)
    .then(async () => {
        console.log("Connected to MongoDB on Atlas");
        const Career = mongoose.model('Career', new mongoose.Schema({
            name: String
        }), 'careers');

        const careers = await Career.find({});
        console.log("Careers in DB:");
        careers.forEach(c => {
            console.log(`- Career Name: ${c.name}, ID: ${c._id}`);
        });
        mongoose.connection.close();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
