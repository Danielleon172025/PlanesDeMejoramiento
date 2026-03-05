import { getConnection } from '../src/config/db.js';
import bcrypt from 'bcryptjs';

const migratePasswords = async () => {
    try {
        console.log('Iniciando migración de contraseñas a Bcrypt...');
        const pool = await getConnection();

        // Obtener todos los usuarios activos
        const result = await pool.request().query(`
            SELECT Id, Email FROM [Identity].[Users] WHERE IsActive = 1
        `);

        const users = result.recordset;
        console.log(`Se encontraron ${users.length} usuarios activos para migrar.`);

        if (users.length === 0) {
            console.log('No hay usuarios para migrar. Terminando proceso.');
            process.exit(0);
        }

        const defaultPassword = 'Admin123*';
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(defaultPassword, salt);

        console.log('Hash por defecto generado:', hash);

        let successCount = 0;
        let errorCount = 0;

        for (const user of users) {
            try {
                await pool.request()
                    .input('id', user.Id)
                    .input('hash', hash)
                    .query(`
                        UPDATE [Identity].[Users] 
                        SET PasswordHash = @hash, MustChangePassword = 1
                        WHERE Id = @id
                    `);

                successCount++;
                console.log(`[OK] Actualizado usuario: ${user.Email}`);
            } catch (err) {
                errorCount++;
                console.error(`[ERROR] Falló actualización para usuario: ${user.Email}`, err.message);
            }
        }

        console.log('==========================================');
        console.log('Resumen de la migración:');
        console.log(`Total procesados: ${users.length}`);
        console.log(`Exitosos: ${successCount}`);
        console.log(`Fallidos: ${errorCount}`);
        console.log('==========================================');

        process.exit(0);
    } catch (error) {
        console.error('Error fatal durante la migración:', error);
        process.exit(1);
    }
};

migratePasswords();
