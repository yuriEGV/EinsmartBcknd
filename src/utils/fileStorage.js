import fs from 'fs';
import path from 'path';

/**
 * Parses a base64 Data URL and saves it to the local filesystem.
 * @param {string} base64String The data url like 'data:image/jpeg;base64,xxxx'
 * @param {string} folderName The subfolder inside 'uploads', e.g., 'students'
 * @param {string} identifier A unique prefix like the student _id or rut
 * @returns {string} The public URL path (e.g. /uploads/students/123.jpg) or the original string if not base64.
 */
export const saveBase64Image = (base64String, folderName, identifier) => {
  if (!base64String || typeof base64String !== 'string') return base64String;
  if (!base64String.startsWith('data:image')) return base64String;

  const matches = base64String.match(/^data:image\/([a-zA-Z0-9-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) return base64String;

  const extension = matches[1].replace('jpeg', 'jpg');
  const data = Buffer.from(matches[2], 'base64');
  
  const fileName = `${identifier}_${Date.now()}.${extension}`;
  const dirPath = path.join(process.cwd(), 'uploads', folderName);
  
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const fullFilePath = path.join(dirPath, fileName);
  fs.writeFileSync(fullFilePath, data);

  return `/uploads/${folderName}/${fileName}`;
};
