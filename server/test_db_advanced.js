import dotenv from 'dotenv';
import sql from 'mssql';

dotenv.config();

const configsToTest = [
    { name: 'Desde .env', server: process.env.DB_SERVER },
    { name: 'Localhost Named Instance', server: 'localhost\\SQLEXPRESS' },
    { name: 'IP Loopback Named Instance', server: '127.0.0.1\\SQLEXPRESS' },
    { name: 'Localhost Default Instance', server: 'localhost' },
    { name: 'IP Loopback Default Instance', server: '127.0.0.1' },
    { name: 'Port 1433 Explicit', server: 'localhost', port: 1433 },
];

const testConnection = async (configName, server, port = null) => {
    console.log(`\nProbando ${configName} (${server}${port ? `:${port}` : ''})`);
    const config = {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        server,
        database: process.env.DB_DATABASE,
        port,
        options: {
            encrypt: false,
            trustServerCertificate: true,
        },
        connectionTimeout: 5000,
    };

    try {
        const pool = await sql.connect(config);
        await pool.close();
        console.log(`OK: ${configName}`);
        return true;
    } catch (error) {
        console.log(`FALLO: ${error.message}`);
        return false;
    }
};

const run = async () => {
    let success = false;
    for (const cfg of configsToTest) {
        if (await testConnection(cfg.name, cfg.server, cfg.port)) {
            success = true;
            console.log(`\nConfiguracion valida encontrada: DB_SERVER=${cfg.server}`);
            break;
        }
    }

    if (!success) {
        console.log('\nNo se encontro una configuracion valida.');
    }
};

run();
