import multer from 'multer';

// Memory storage so we can pass Buffer/streams into the existing storageService
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB per file default
});

export default upload;
