import mongoose from 'mongoose';
const { ObjectId } = mongoose.mongo;

const ids = [
    "6984af03b00f020e9834b948",
    "6984af4866ed6edebbb9dc1f7",
    "6985e7c594eba18b43c0d97b",
    "6984d023549bf21f2bcbbbd3",
    "6984c8fa3254496842aa365c",
    "6990d47b3ec1c6bf4bc30756",
    "6984f0c510a926dcc0f493c6"
];

ids.forEach(id => {
    console.log(`ID: "${id}" | Length: ${id.length}`);
    try {
        new ObjectId(id);
        console.log(` ✅ Valid ObjectId`);
    } catch (e) {
        console.error(` ❌ Invalid: ${e.message}`);
    }
});
