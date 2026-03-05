import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

// Configure multer (e.g. max 10MB)
export const uploadMiddleware = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }
}).single('file');

/**
 * Controller definition for file uploads
 */
export const uploadFile = (req, res) => {
    uploadMiddleware(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: 'Multer error: ' + err.message });
        } else if (err) {
            return res.status(500).json({ error: 'Unknown upload error: ' + err.message });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No se recibió ningún archivo' });
        }

        // Return the virtual URL path to access the uploaded file
        const urlPath = `/uploads/${req.file.filename}`;

        res.json({
            message: 'Archivo subido correctamente',
            url: urlPath,
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size
        });
    });
};
