import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendServerError } from '../utils/http.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Ajustar ruta para salir de src/controllers hacia valid root si fuera necesario.
// Asumiendo estructura server/src/controllers -> server/uploads
const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// Asegurar que existe el directorio
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const uploadFileBase64 = async (req, res) => {
    try {
        const { file, filename, mimetype } = req.body;

        if (!file || !filename) {
            return res.status(400).json({ error: 'Faltan datos del archivo (file base64, filename)' });
        }

        // Decodificar Base64 (remover prefijo data:image/png;base64,... si existe)
        const matches = file.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        let buffer;

        if (matches && matches.length === 3) {
            buffer = Buffer.from(matches[2], 'base64');
        } else {
            // Intentar decodificar directamente si no tiene prefijo
            buffer = Buffer.from(file, 'base64');
        }

        // Generar nombre único para evitar colisiones
        const timestamp = Date.now();
        const safeFilename = filename.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        const uniqueFilename = `${timestamp}-${safeFilename}`;
        const filePath = path.join(UPLOAD_DIR, uniqueFilename);

        // Guardar archivo
        fs.writeFileSync(filePath, buffer);

        // Retornar URL o ID para acceso
        // En este caso retornamos el nombre de archivo para guardarlo en BD
        return res.json({
            message: 'Archivo subido correctamente',
            filename: uniqueFilename,
            originalName: filename,
            mimetype: mimetype,
            url: `/api/files/${uniqueFilename}`
        });

    } catch (error) {
        return sendServerError(res, 'Error al subir archivo', error);
    }
};

export const downloadFile = async (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(UPLOAD_DIR, filename);

        // Validar path traversal
        if (!filePath.startsWith(UPLOAD_DIR)) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Archivo no encontrado' });
        }

        res.download(filePath);
    } catch (error) {
        return sendServerError(res, 'Error al descargar archivo', error);
    }
};
