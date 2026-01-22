import path from 'path';
import fs from 'fs';
import os from 'os';

const storageDir = (process.env.VERCEL || process.env.NOW_REGION)
    ? path.join('/tmp', 'storage')
    : path.join(os.tmpdir(), 'storage');
if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
}

export async function saveStreamToFile(stream, filename) {
    const filePath = path.join(storageDir, filename);
    const writeStream = fs.createWriteStream(filePath);
    const url = `/files/${filename}`;
    await new Promise((resolve, reject) => {
        stream.pipe(writeStream);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
    });
    return { filePath, url };
}


