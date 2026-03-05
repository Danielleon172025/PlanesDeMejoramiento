
import { getConnection } from './src/config/db.js';

const inspectSchema = async () => {
    try {
        const pool = await getConnection();

        console.log('--- Columns in perfil_usuario ---');
        const r1 = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'perfil_usuario'");
        r1.recordset.forEach(row => console.log(row.COLUMN_NAME));

        console.log('\n--- Columns in aspnet_Users ---');
        const r2 = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'aspnet_Users'");
        r2.recordset.forEach(row => console.log(row.COLUMN_NAME));

        console.log('\n--- Columns in aspnet_Membership ---');
        const r3 = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'aspnet_Membership'");
        r3.recordset.forEach(row => console.log(row.COLUMN_NAME));

        process.exit(0);
    } catch (error) {
        console.error('Error inspecting schema:', error);
        process.exit(1);
    }
};

inspectSchema();
