import dotenv from 'dotenv';
import sql from 'mssql';

dotenv.config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: false,
        trustServerCertificate: true,
    },
};

const run = async () => {
    try {
        console.log('Probando conexion SQL Server...');
        await sql.connect(config);
        console.log('Conexion exitosa.');
        process.exit(0);
    } catch (error) {
        console.error('Error de conexion:', error.message);
        process.exit(1);
    }
};

run();
