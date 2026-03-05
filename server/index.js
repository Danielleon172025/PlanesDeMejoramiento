import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { closeConnection, getConnection } from './src/config/db.js';
import accionesRoutes from './src/routes/acciones.routes.js';
import causasRoutes from './src/routes/causas.routes.js';
import dashboardRoutes from './src/routes/dashboard.routes.js';
import hallazgosRoutes from './src/routes/hallazgos.routes.js';
import filesRoutes from './src/routes/files.routes.js';
import listasRoutes from './src/routes/listas.routes.js';
import modulosRoutes from './src/routes/modulos.routes.js';
import authRoutes from './src/routes/auth.routes.js';
import permissionsRoutes from './src/routes/permissions.routes.js';
import uploadRoutes from './src/routes/upload.routes.js';
import { isProduction, sendServerError } from './src/utils/http.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((value) => value.trim())
    : ['http://localhost:5173'];

app.use(cors({ origin: corsOrigins }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

app.get('/', (req, res) => {
    res.json({
        message: 'API SIAPOAS - Plan de Mejoramiento',
        version: '2.1.0',
        status: 'online',
        endpoints: {
            health: '/api/health',
            dashboard: '/api/dashboard/*',
            hallazgos: '/api/hallazgos',
            causas: '/api/causas',
            acciones: '/api/acciones',
            listas: '/api/listas',
            modulos: '/api/modulos/*',
        },
    });
});

app.get('/api/health', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query('SELECT GETDATE() as fecha');
        return res.json({
            status: 'OK',
            message: 'Servidor y base de datos funcionando correctamente',
            timestamp: new Date().toISOString(),
            database: {
                connected: true,
                server: process.env.DB_SERVER,
                database: process.env.DB_DATABASE,
                serverTime: result.recordset[0].fecha,
            },
        });
    } catch (error) {
        return res.status(500).json({
            status: 'ERROR',
            message: 'Error de conexion a la base de datos',
            ...(isProduction ? {} : { error: error.message }),
            timestamp: new Date().toISOString(),
        });
    }
});

app.use('/api/dashboard', dashboardRoutes);
app.use('/api/hallazgos', hallazgosRoutes);
app.use('/api/causas', causasRoutes);
app.use('/api/acciones', accionesRoutes);
app.use('/api/listas', listasRoutes);
app.use('/api/modulos', modulosRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/permisos', permissionsRoutes);
app.use('/api/upload', uploadRoutes);

app.use((req, res) => {
    res.status(404).json({
        error: 'Ruta no encontrada',
        path: req.path,
        method: req.method,
    });
});

app.use((err, req, res, next) => {
    return sendServerError(res, 'Error interno del servidor', err);
});

const server = app.listen(PORT, async () => {
    console.log(`API en http://localhost:${PORT}`);
    console.log('Frontend esperado en http://localhost:5173');

    try {
        const pool = await getConnection();
        const result = await pool.request().query('SELECT COUNT(*) as total FROM [Improvement].[Findings]');
        console.log(`Conexion SQL OK. Hallazgos: ${result.recordset[0].total}`);
    } catch (error) {
        console.error('No fue posible conectar a SQL Server');
        if (!isProduction) {
            console.error(error.message);
        }
    }
});

const gracefulShutdown = async (signal) => {
    console.log(`${signal} recibido. Cerrando servidor...`);

    server.close(async () => {
        await closeConnection();
        process.exit(0);
    });

    setTimeout(() => {
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection');
    if (!isProduction) {
        console.error(reason);
    }
});
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception');
    if (!isProduction) {
        console.error(error);
    }
    gracefulShutdown('uncaughtException');
});
