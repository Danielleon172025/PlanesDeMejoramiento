// server/src/config/db.js
import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT || '1433'),
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
        enableArithAbort: true,
    },
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000'),
    requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT || '30000'),
    pool: {
        max: parseInt(process.env.DB_POOL_MAX || '10'),
        min: parseInt(process.env.DB_POOL_MIN || '2'),
        idleTimeoutMillis: 30000,
    },
};

let pool = null;

/**
 * Obtener o crear conexión a SQL Server
 */
export const getConnection = async () => {
    try {
        if (pool && pool.connected) {
            return pool;
        }
        
        pool = await sql.connect(config);
        console.log('✅ Conexión a SQL Server establecida correctamente');
        
        return pool;
    } catch (error) {
        console.error('❌ Error al conectar con SQL Server:', error.message);
        throw error;
    }
};

/**
 * Cerrar conexión a SQL Server
 */
export const closeConnection = async () => {
    try {
        if (pool) {
            await pool.close();
            pool = null;
            console.log('🔌 Conexión a SQL Server cerrada');
        }
    } catch (error) {
        console.error('❌ Error al cerrar conexión:', error.message);
    }
};

/**
 * Verificar estado de la conexión
 */
export const checkConnection = async () => {
    try {
        const connection = await getConnection();
        const result = await connection.request().query('SELECT 1 as test');
        return result.recordset.length > 0;
    } catch (error) {
        return false;
    }
};

// Exportar sql para uso en controladores
export default sql;
